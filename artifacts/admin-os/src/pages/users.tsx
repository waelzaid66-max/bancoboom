import { useEffect, useState } from "react";
import {
  useGetAdminUsers,
  useGetMe,
  useSetUserBan,
  useSetUserRole,
  useSetUserVerified,
  useGetFinancingIntermediaries,
  useUpdateFinancingIntermediary,
  getGetAdminUsersQueryKey,
  getGetMeQueryKey,
  getGetFinancingIntermediariesQueryKey,
  type AdminUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Ban, ShieldCheck, BadgeCheck, FileSearch, Copy, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/context/LanguageContext";
import { hasPermission, STAFF_ROLES, type StaffRole } from "@/lib/permissions";
import { Label } from "@/components/ui/label";

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-[#E8002D]/15 text-[#E8002D] border-[#E8002D]/30",
  admin: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  moderator: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  support: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  user: "bg-muted text-muted-foreground border-border",
};

function KycReviewDialog({
  user,
  open,
  onOpenChange,
  canVerify,
  canLinkFi,
  verifying,
  onVerify,
}: {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canVerify: boolean;
  canLinkFi: boolean;
  verifying: boolean;
  onVerify: (id: string, currentlyVerified: boolean) => void;
}) {
  const { t } = useLang();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const details = user?.company_details ?? null;
  const docs = details?.documents ?? [];
  const isFi = user?.role === "financial_institution";
  const [linkIntermediaryId, setLinkIntermediaryId] = useState("");

  const { data: intermResp, isLoading: intermLoading } = useGetFinancingIntermediaries({
    query: {
      queryKey: getGetFinancingIntermediariesQueryKey(),
      enabled: open && canLinkFi && isFi,
    },
  });
  const updateInterm = useUpdateFinancingIntermediary();
  const intermediaries = intermResp?.data ?? [];

  useEffect(() => {
    if (!open) setLinkIntermediaryId("");
  }, [open, user?.id]);

  const copyUserId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      toast({ title: t("usersPage.toastIdCopied") });
    } catch {
      toast({ title: t("usersPage.toastActionFailed"), variant: "destructive" });
    }
  };

  const linkOwner = () => {
    if (!user?.id || !linkIntermediaryId) return;
    updateInterm.mutate(
      { id: linkIntermediaryId, data: { owner_user_id: user.id } },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getGetFinancingIntermediariesQueryKey(),
          });
          toast({
            title: t("usersPage.toastFiLinked"),
            description: t("usersPage.toastFiLinkedDesc"),
          });
        },
        onError: () =>
          toast({
            title: t("usersPage.toastFiLinkFailed"),
            description: t("usersPage.toastFiLinkFailedDesc"),
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("usersPage.kycTitle")}</DialogTitle>
          <DialogDescription>
            {user?.name} · {user?.role}
            {user?.email || user?.phone ? ` · ${user.email || user.phone}` : ""}
          </DialogDescription>
        </DialogHeader>

        {user?.id ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
            <div className="text-muted-foreground">{t("usersPage.userId")}</div>
            <div className="flex items-center gap-2">
              <code className="font-mono break-all flex-1">{user.id}</code>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyUserId()}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-muted-foreground leading-snug">{t("usersPage.adsFirstHint")}</p>
          </div>
        ) : null}

        {!details ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("usersPage.kycNoBusiness")}
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-muted-foreground">{t("usersPage.kycActivity")}</div>
                <div className="font-medium">{details.activity_type || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("usersPage.kycCity")}</div>
                <div className="font-medium">{details.city || "—"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground">{t("usersPage.kycBusiness")}</div>
                <div className="font-medium">{details.business_name || "—"}</div>
              </div>
              {details.trade_name ? (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("usersPage.kycTrade")}</div>
                  <div className="font-medium">{details.trade_name}</div>
                </div>
              ) : null}
              {details.owner_name ? (
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t("usersPage.kycOwner")}</div>
                  <div className="font-medium">{details.owner_name}</div>
                </div>
              ) : null}
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-2">
                {t("usersPage.kycDocuments")} ({docs.length})
              </div>
              {!docs.length ? (
                <p className="text-muted-foreground">{t("usersPage.kycNoDocs")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {docs.map((url, i) => (
                    <a
                      key={`${url}-${i}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="border rounded-md overflow-hidden bg-muted/40 hover:border-primary"
                    >
                      <img
                        src={url}
                        alt={`doc-${i + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      <div className="px-2 py-1 text-[11px] truncate text-muted-foreground">
                        {t("usersPage.kycOpenDoc")} #{i + 1}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ads-first: verify badge ≠ inbox. Admin links an existing intermediary only. */}
        {isFi && canLinkFi && user?.id ? (
          <div className="space-y-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="w-4 h-4" />
              {t("usersPage.fiLinkTitle")}
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {t("usersPage.fiLinkHint")}
            </p>
            <Label className="text-xs">{t("usersPage.fiLinkSelect")}</Label>
            <Select
              value={linkIntermediaryId || undefined}
              onValueChange={setLinkIntermediaryId}
              disabled={intermLoading || updateInterm.isPending}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder={t("usersPage.fiLinkSelectPh")} />
              </SelectTrigger>
              <SelectContent>
                {intermediaries
                  .filter((im): im is typeof im & { id: string } => !!im.id)
                  .map((im) => (
                    <SelectItem key={im.id} value={im.id} disabled={im.is_active === false}>
                      {im.name}
                      {im.owner_user_id ? ` · ${t("usersPage.fiLinkAlreadyOwned")}` : ""}
                      {im.is_active === false ? ` · ${t("usersPage.fiLinkInactive")}` : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!linkIntermediaryId || updateInterm.isPending}
              onClick={linkOwner}
            >
              {updateInterm.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("usersPage.fiLinkCta")}
            </Button>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("usersPage.kycClose")}
          </Button>
          {canVerify && user?.id ? (
            <Button
              onClick={() => onVerify(user.id!, !!user.is_verified)}
              disabled={verifying}
            >
              {verifying && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              <ShieldCheck className="w-4 h-4 me-2" />
              {user.is_verified ? t("usersPage.unverify") : t("usersPage.verify")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [reviewUser, setReviewUser] = useState<AdminUser | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();

  const { data: meResp } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const myId = meResp?.data?.id;
  const myStaffRole = meResp?.data?.staff_role;
  const canManageRoles = hasPermission(myStaffRole, "manage_roles");
  const canVerify = hasPermission(myStaffRole, "verify_users");
  const canBan = hasPermission(myStaffRole, "ban_users");
  const canLinkFi = hasPermission(myStaffRole, "manage_financing");

  const { data: usersResp, isLoading } = useGetAdminUsers({ search: search || undefined });
  const users = usersResp?.data ?? [];

  const toggleBan = useSetUserBan();
  const setRole = useSetUserRole();
  const setVerified = useSetUserVerified();

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });

  const handleToggleBan = (id: string, currentlyBanned: boolean) => {
    toggleBan.mutate(
      { id, data: { banned: !currentlyBanned } },
      {
        onSuccess: () => {
          refresh();
          toast({
            title: currentlyBanned
              ? t("usersPage.toastUnbanned")
              : t("usersPage.toastBanned"),
          });
        },
        onError: () =>
          toast({ title: t("usersPage.toastActionFailed"), variant: "destructive" }),
      },
    );
  };

  const handleChangeRole = (id: string, role: StaffRole) => {
    setRole.mutate(
      { id, data: { role } },
      {
        onSuccess: () => {
          refresh();
          toast({ title: t("usersPage.toastRoleUpdated"), description: t(`roles.${role}`) });
        },
        onError: () =>
          toast({
            title: t("usersPage.toastRoleFailed"),
            description: t("usersPage.toastRoleFailedDesc"),
            variant: "destructive",
          }),
      },
    );
  };

  const handleToggleVerified = (id: string, currentlyVerified: boolean) => {
    const target = users.find((u) => u.id === id);
    const isFi = target?.role === "financial_institution";
    setVerified.mutate(
      { id, data: { verified: !currentlyVerified } },
      {
        onSuccess: () => {
          refresh();
          setReviewUser((cur) =>
            cur?.id === id ? { ...cur, is_verified: !currentlyVerified } : cur,
          );
          toast({
            title: currentlyVerified
              ? t("usersPage.toastUnverified")
              : t("usersPage.toastVerified"),
            // Ads-first honesty: badge ≠ financing inbox.
            description:
              !currentlyVerified && isFi ? t("usersPage.toastVerifiedFiHint") : undefined,
          });
        },
        onError: () =>
          toast({ title: t("usersPage.toastActionFailed"), variant: "destructive" }),
      },
    );
  };

  const showActions = canVerify || canBan;
  const colCount = 5 + (canManageRoles ? 1 : 0) + (showActions ? 1 : 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("usersPage.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("usersPage.subtitle")}</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("usersPage.searchPh")}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("usersPage.colUser")}</TableHead>
              <TableHead>{t("usersPage.colAccountNo")}</TableHead>
              <TableHead>{t("usersPage.colRole")}</TableHead>
              {canManageRoles && <TableHead>{t("usersPage.colStaffRole")}</TableHead>}
              <TableHead>{t("usersPage.colStatus")}</TableHead>
              <TableHead>{t("usersPage.colListings")}</TableHead>
              {showActions && <TableHead className="text-end">{t("usersPage.colActions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : !users.length ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center text-muted-foreground">
                  {t("usersPage.empty")}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: NonNullable<typeof users>[number]) => {
                const isSelf = !!myId && user.id === myId;
                const staffRole = (user.staff_role ?? "user") as StaffRole;
                const hasKyc =
                  !!user.company_details &&
                  (!!user.company_details.business_name ||
                    (user.company_details.documents?.length ?? 0) > 0);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email || user.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          {user.account_number || "—"}
                        </span>
                        {user.id ? (
                          <button
                            type="button"
                            className="block font-mono text-[10px] text-muted-foreground/80 hover:text-foreground truncate max-w-[140px] text-start"
                            title={user.id}
                            onClick={() => {
                              void navigator.clipboard.writeText(user.id!).then(
                                () => toast({ title: t("usersPage.toastIdCopied") }),
                                () =>
                                  toast({
                                    title: t("usersPage.toastActionFailed"),
                                    variant: "destructive",
                                  }),
                              );
                            }}
                          >
                            {user.id}
                          </button>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    </TableCell>
                    {canManageRoles && (
                      <TableCell>
                        <Select
                          value={staffRole}
                          onValueChange={(v) => handleChangeRole(user.id!, v as StaffRole)}
                          disabled={isSelf || setRole.isPending}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAFF_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {t(`roles.${r}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isSelf && (
                          <div className="text-[10px] text-muted-foreground mt-1">{t("usersPage.you")}</div>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {staffRole !== "user" && (
                          <Badge variant="outline" className={`capitalize ${ROLE_BADGE[staffRole]}`}>
                            {t(`roles.${staffRole}`)}
                          </Badge>
                        )}
                        {user.is_shadow_banned ? (
                          <Badge variant="destructive">{t("usersPage.shadowBanned")}</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">{t("usersPage.activeStatus")}</Badge>
                        )}
                        {user.is_verified && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                            <BadgeCheck className="w-3 h-3 me-1" /> {t("usersPage.verified")}
                          </Badge>
                        )}
                        {hasKyc && !user.is_verified && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                            {t("usersPage.kycPending")}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.listing_count}</TableCell>
                    {showActions && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(canVerify || hasKyc) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewUser(user)}
                            >
                              <FileSearch className="w-4 h-4 me-2" />
                              {t("usersPage.kycReview")}
                            </Button>
                          )}
                          {canBan && (
                            <Button
                              variant={user.is_shadow_banned ? "outline" : "destructive"}
                              size="sm"
                              onClick={() => handleToggleBan(user.id!, !!user.is_shadow_banned)}
                              disabled={toggleBan.isPending}
                            >
                              {user.is_shadow_banned ? (
                                <><ShieldCheck className="w-4 h-4 me-2" /> {t("usersPage.unban")}</>
                              ) : (
                                <><Ban className="w-4 h-4 me-2" /> {t("usersPage.ban")}</>
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <KycReviewDialog
        user={reviewUser}
        open={!!reviewUser}
        onOpenChange={(o) => {
          if (!o) setReviewUser(null);
        }}
        canVerify={canVerify}
        canLinkFi={canLinkFi}
        verifying={setVerified.isPending}
        onVerify={handleToggleVerified}
      />
    </div>
  );
}
