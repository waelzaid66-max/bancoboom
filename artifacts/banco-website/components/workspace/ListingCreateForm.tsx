"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  CreateListingBodyCategory,
  useCreateListing,
  useGetListing,
  useUpdateListing,
  getGetMyManagedListingsQueryKey,
  getGetMyMetricsQueryKey,
  getGetListingQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { localeFromPathname, localizedPath } from "../../lib/hub-config";
import { isAllowedImageType, uploadImageFile } from "../../lib/upload";
import {
  workspaceCategoryOptions,
  workspaceLocationGroups,
  workspaceSpecFields,
  type WorkspaceCategory,
} from "../../lib/workspace-listing-form";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

type MediaItem = {
  id: string;
  preview: string;
  url: string | null;
  status: "uploading" | "done" | "error";
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  marginBottom: "0.85rem",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "var(--banco-card)",
  color: "var(--banco-fg)",
  padding: "0.55rem 0.65rem",
  fontSize: "0.95rem",
};

const submitStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.65rem 1rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.95rem",
};

type ListingCreateFormProps = {
  listingId?: string;
};

export function ListingCreateForm({ listingId }: ListingCreateFormProps) {
  const isEdit = Boolean(listingId);
  const router = useRouter();
  const pathname = usePathname() ?? "/workspace/listings/new";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const prefix = locale === "en" ? "/en/workspace" : "/workspace";
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<WorkspaceCategory>("car");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [specs, setSpecs] = useState<Record<string, string>>({});
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const detailQuery = useGetListing(listingId ?? "", {
    query: {
      enabled: isEdit && Boolean(listingId),
      queryKey: getGetListingQueryKey(listingId ?? ""),
    },
  });
  const createListing = useCreateListing();
  const updateListing = useUpdateListing();

  useEffect(() => {
    const detail = detailQuery.data?.data;
    if (!detail || !isEdit) return;
    setCategory(detail.category as WorkspaceCategory);
    setTitle(detail.title ?? "");
    setDescription(detail.description ?? "");
    setLocation(detail.location ?? "");
    const rawPrice = detail.price_display ?? "";
    setPrice(String(rawPrice).replace(/[^\d.]/g, ""));
    const specStrings: Record<string, string> = {};
    const rawSpecs = (detail.specs ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawSpecs)) {
      if (v != null && typeof v !== "object") specStrings[k] = String(v);
    }
    setSpecs(specStrings);
    const existingMedia =
      detail.media?.map((m, i) => ({
        id: `existing-${i}`,
        preview: m.url ?? "",
        url: m.url ?? null,
        status: "done" as const,
      })) ?? [];
    setMedia(existingMedia);
  }, [detailQuery.data, isEdit]);

  const locationGroups = workspaceLocationGroups(locale);
  const fields = workspaceSpecFields(category, copy);
  const categoryOptions = workspaceCategoryOptions(copy);

  const buildSpecsObject = (): Record<string, unknown> => {
    const obj: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = specs[f.key]?.trim();
      if (!raw) continue;
      if (f.numeric) {
        const n = Number(raw);
        if (Number.isFinite(n)) obj[f.key] = n;
      } else {
        obj[f.key] = raw;
      }
    }
    return obj;
  };

  const removeMedia = (id: string) => {
    setMedia((items) => {
      const target = items.find((it) => it.id === id);
      if (target?.preview.startsWith("blob:")) {
        URL.revokeObjectURL(target.preview);
      }
      return items.filter((it) => it.id !== id);
    });
  };

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!isAllowedImageType(file.type)) continue;
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const preview = URL.createObjectURL(file);
      setMedia((m) => [...m, { id, preview, url: null, status: "uploading" }]);
      try {
        const url = await uploadImageFile(file);
        setMedia((m) => m.map((it) => (it.id === id ? { ...it, url, status: "done" } : it)));
      } catch {
        setMedia((m) => m.map((it) => (it.id === id ? { ...it, status: "error" } : it)));
        setFormError(copy.uploadError);
      }
    }
  };

  const handleSubmit = () => {
    setFormError(null);
    setSuccess(null);

    if (!title.trim()) {
      setFormError(copy.createTitleLabel);
      return;
    }
    if (!location.trim()) {
      setFormError(copy.createLocation);
      return;
    }
    const priceNum = Number(price.replace(/[, ]/g, ""));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setFormError(copy.createPrice);
      return;
    }

    if (media.some((m) => m.status === "uploading")) {
      setFormError(copy.photosUploading);
      return;
    }
    if (media.some((m) => m.status === "error")) {
      setFormError(copy.uploadError);
      return;
    }

    const mediaArr = media
      .filter((m) => m.status === "done" && m.url)
      .map((m, i) => ({ type: "image" as const, url: m.url as string, is_thumbnail: i === 0 }));

    if (mediaArr.length === 0) {
      setFormError(copy.createPhotosHint);
      return;
    }

    const invalidate = (id?: string) => {
      void queryClient.invalidateQueries({ queryKey: getGetMyManagedListingsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: getGetMyMetricsQueryKey() });
      if (id) {
        void queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(id) });
      }
    };

    if (isEdit && listingId) {
      updateListing.mutate(
        {
          id: listingId,
          data: {
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim(),
            base_price_cash: priceNum,
            specs: buildSpecsObject(),
            media: mediaArr,
          },
        },
        {
          onSuccess: () => {
            setSuccess(copy.editSubmit);
            invalidate(listingId);
            router.push(`${prefix}/listings`);
          },
          onError: () => setFormError(copy.errorGeneric),
        },
      );
      return;
    }

    createListing.mutate(
      {
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          category: category as CreateListingBodyCategory,
          location: location.trim(),
          base_price_cash: priceNum,
          specs: buildSpecsObject(),
          media: mediaArr,
        },
      },
      {
        onSuccess: (res) => {
          setSuccess(copy.createSuccess);
          const newId = res.data?.id;
          invalidate(newId);
          router.push(
            newId ? localizedPath(`/listing/${newId}`, locale) : `${prefix}/listings`,
          );
        },
        onError: () => setFormError(copy.errorGeneric),
      },
    );
  };

  const uploading = media.some((m) => m.status === "uploading");
  const pending =
    createListing.isPending || updateListing.isPending || detailQuery.isLoading || uploading;

  if (isEdit && detailQuery.isError) {
    return (
      <div data-banco-journey="workspace-edit-listing">
        <h2 style={{ margin: "0 0 1rem" }}>{copy.editTitle}</h2>
        <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
        <button
          type="button"
          style={{ ...submitStyle, background: "transparent", color: "var(--banco-fg)", border: "1px solid var(--banco-border)" }}
          onClick={() => void detailQuery.refetch()}
        >
          {copy.retry}
        </button>
        {" · "}
        <Link href={`${prefix}/listings`} style={{ color: "var(--banco-muted)" }}>
          {copy.backToWorkspace}
        </Link>
      </div>
    );
  }

  return (
    <div data-banco-journey={isEdit ? "workspace-edit-listing" : "workspace-create-listing"}>
      <h2 style={{ margin: "0 0 1rem" }}>{isEdit ? copy.editTitle : copy.createTitle}</h2>

      {!isEdit ? (
        <label style={fieldStyle}>
          <span>{copy.createCategory}</span>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as WorkspaceCategory);
              setSpecs({});
            }}
            style={inputStyle}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label style={fieldStyle}>
        <span>{copy.createTitleLabel}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>{copy.createDescription}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={inputStyle}
        />
      </label>

      <label style={fieldStyle}>
        <span>{copy.createLocation}</span>
        <select value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle}>
          <option value="">{copy.selectEmpty}</option>
          {locationGroups.map((group) => (
            <optgroup key={group.country} label={group.country}>
              {group.items.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label style={fieldStyle}>
        <span>{copy.createPrice}</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} inputMode="decimal" />
      </label>

      {fields.map((f) => (
        <label key={f.key} style={fieldStyle}>
          <span>{f.label}</span>
          {f.options ? (
            <select
              value={specs[f.key] ?? ""}
              onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
              style={inputStyle}
            >
              <option value="">{copy.selectEmpty}</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={specs[f.key] ?? ""}
              onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
              style={inputStyle}
            />
          )}
        </label>
      ))}

      <div style={fieldStyle}>
        <span>{copy.createPhotos}</span>
        <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.85rem" }}>{copy.createPhotosHint}</p>
        <input type="file" accept="image/*" multiple onChange={(e) => void onFilesSelected(e.target.files)} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
          {media.map((m) => (
            <div key={m.id} style={{ position: "relative" }}>
              <img
                src={m.preview}
                alt=""
                width={96}
                height={72}
                style={{
                  objectFit: "cover",
                  borderRadius: 8,
                  opacity: m.status === "error" ? 0.4 : m.status === "uploading" ? 0.7 : 1,
                  display: "block",
                }}
              />
              <button
                type="button"
                onClick={() => removeMedia(m.id)}
                style={{
                  marginTop: 4,
                  border: "1px solid var(--banco-border)",
                  borderRadius: 6,
                  background: "transparent",
                  color: "var(--banco-muted)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {copy.mediaRemove}
              </button>
            </div>
          ))}
        </div>
      </div>

      {formError ? <p style={{ color: "var(--banco-primary)" }}>{formError}</p> : null}
      {success ? <p style={{ color: "var(--banco-fg)" }}>{success}</p> : null}

      <button type="button" style={submitStyle} disabled={pending} onClick={handleSubmit}>
        {isEdit ? copy.editSubmit : copy.createSubmit}
      </button>
      {" · "}
      <Link href={`${prefix}/listings`} style={{ color: "var(--banco-muted)" }}>
        {copy.backToWorkspace}
      </Link>
    </div>
  );
}
