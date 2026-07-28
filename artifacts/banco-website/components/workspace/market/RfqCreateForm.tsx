"use client";

import { useState, type FormEvent } from "react";
import {
  CreateRfqBodyCategory,
  CreateRfqBodyIndustrialType,
  CreateRfqBodyIndustry,
  getListMyRfqsQueryKey,
  getListRfqsQueryKey,
  useCreateRfq,
  type CreateRfqBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { localeFromPathname } from "../../../lib/hub-config";
import { workspaceUiCopy } from "../../../lib/workspace-ui-copy";

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

const CATEGORIES = Object.values(CreateRfqBodyCategory);
const INDUSTRIES = Object.values(CreateRfqBodyIndustry);
const INDUSTRIAL_TYPES = Object.values(CreateRfqBodyIndustrialType);

type RfqCreateFormProps = {
  onCreated?: () => void;
};

export function RfqCreateForm({ onCreated }: RfqCreateFormProps) {
  const pathname = usePathname() ?? "/workspace/b2b/rfqs";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const queryClient = useQueryClient();
  const createRfq = useCreateRfq();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CreateRfqBody["category"]>("industrial");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [destination, setDestination] = useState("");
  const [deadline, setDeadline] = useState("");
  const [industry, setIndustry] = useState<CreateRfqBody["industry"]>("other");
  const [industrialType, setIndustrialType] =
    useState<CreateRfqBody["industrial_type"]>("raw_material");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setSuccess(null);

    const trimmed = title.trim();
    if (trimmed.length < 3) {
      setFormError(copy.marketRfqTitleRequired);
      return;
    }

    const body: CreateRfqBody = {
      title: trimmed,
      category: category ?? "industrial",
      description: description.trim() || undefined,
      unit: unit.trim() || undefined,
      destination_country: destination.trim() || undefined,
    };

    const qty = Number(quantity);
    if (quantity.trim() && Number.isFinite(qty) && qty > 0) {
      body.quantity = qty;
    }
    const price = Number(targetPrice);
    if (targetPrice.trim() && Number.isFinite(price) && price > 0) {
      body.target_price_max = price;
    }
    if (deadline.trim()) {
      body.deadline = new Date(`${deadline.trim()}T23:59:59.000Z`).toISOString();
    }
    if (body.category === "industrial") {
      body.industry = industry;
      body.industrial_type = industrialType;
    }

    try {
      await createRfq.mutateAsync({ data: body });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListRfqsQueryKey({ limit: 20 }) }),
        queryClient.invalidateQueries({ queryKey: getListMyRfqsQueryKey() }),
      ]);
      setSuccess(copy.marketRfqCreateSuccess);
      setTitle("");
      setDescription("");
      setQuantity("");
      setUnit("");
      setTargetPrice("");
      setDestination("");
      setDeadline("");
      onCreated?.();
    } catch {
      setFormError(copy.errorGeneric);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      data-banco-journey="market-rfq-create"
      style={{
        margin: "0 0 1.5rem",
        padding: "1rem 1.1rem",
        border: "1px solid var(--banco-border)",
        borderRadius: 12,
        background: "var(--banco-card)",
      }}
    >
      <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem" }}>{copy.marketRfqCreateTitle}</h3>
      <p style={{ margin: "0 0 1rem", color: "var(--banco-muted)", lineHeight: 1.6, fontSize: "0.9rem" }}>
        {copy.marketRfqCreateHint}
      </p>

      <label style={fieldStyle}>
        <span>{copy.createTitleLabel}</span>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          autoComplete="off"
        />
      </label>

      <label style={fieldStyle}>
        <span>{copy.createCategory}</span>
        <select
          style={inputStyle}
          value={category}
          onChange={(e) => setCategory(e.target.value as CreateRfqBody["category"])}
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      {category === "industrial" ? (
        <>
          <label style={fieldStyle}>
            <span>{copy.marketRfqIndustry}</span>
            <select
              style={inputStyle}
              value={industry}
              onChange={(e) => setIndustry(e.target.value as CreateRfqBody["industry"])}
            >
              {INDUSTRIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>{copy.marketRfqIndustrialType}</span>
            <select
              style={inputStyle}
              value={industrialType}
              onChange={(e) =>
                setIndustrialType(e.target.value as CreateRfqBody["industrial_type"])
              }
            >
              {INDUSTRIAL_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <label style={fieldStyle}>
        <span>{copy.createDescription}</span>
        <textarea
          style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
        }}
      >
        <label style={fieldStyle}>
          <span>{copy.marketRfqQuantity}</span>
          <input
            style={inputStyle}
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label style={fieldStyle}>
          <span>{copy.marketRfqUnit}</span>
          <input
            style={inputStyle}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={40}
          />
        </label>
        <label style={fieldStyle}>
          <span>{copy.marketRfqTargetPrice}</span>
          <input
            style={inputStyle}
            inputMode="decimal"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
          />
        </label>
      </div>

      <label style={fieldStyle}>
        <span>{copy.marketRfqDestination}</span>
        <input
          style={inputStyle}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          maxLength={80}
        />
      </label>

      <label style={fieldStyle}>
        <span>{copy.marketRfqsDeadline}</span>
        <input
          style={inputStyle}
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </label>

      {formError ? (
        <p style={{ color: "var(--banco-primary)", margin: "0 0 0.75rem" }}>{formError}</p>
      ) : null}
      {success ? (
        <p style={{ color: "var(--banco-muted)", margin: "0 0 0.75rem" }}>{success}</p>
      ) : null}

      <button type="submit" style={submitStyle} disabled={createRfq.isPending}>
        {createRfq.isPending ? copy.loading : copy.marketRfqCreateSubmit}
      </button>
    </form>
  );
}
