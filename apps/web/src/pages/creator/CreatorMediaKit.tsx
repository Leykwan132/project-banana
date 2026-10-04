import { useEffect, useState, useRef, useId, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Button,
  Input,
  Label,
  Switch,
  Tabs,
  Modal,
  Select,
  ListBox,
  Tag,
  TagGroup,
  Tooltip,
} from "@heroui/react";
import {
  Plus,
  Trash2,
  Inbox,
  Copy,
  ExternalLink,
  X,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "../../components/ui/Toast";
import { MediaKitSkeleton } from "../../components/media-kit/MediaKitSkeleton";
import { PlatformIcon } from "../../components/media-kit/PlatformIcon";
import type { Id } from "../../../../../packages/backend/convex/_generated/dataModel";
import { api } from "../../../../../packages/backend/convex/_generated/api";
import type {
  Settings,
  Contact,
  Platform,
} from "../../../../../packages/backend/convex/lib/mediaKitModel";
import {
  contactHref,
  normalizeAccountHandle,
} from "../../../../../packages/backend/convex/lib/mediaKitModel";
const nicheOptions = [
  "Art",
  "Athlete",
  "Beauty",
  "Business",
  "Comedy",
  "Cooking",
  "DIY",
  "Education",
  "Entertainment",
  "Entrepreneurship",
  "Family",
  "Fashion",
  "Finance",
  "Fitness",
  "Food",
  "Gaming",
  "History",
  "Home",
  "Lifestyle",
  "Literature",
  "Mental Health",
  "Mobile Gaming",
  "Music",
  "Outdoors",
  "Parenthood",
  "Personal Finance",
  "Pets",
  "Photography",
  "Podcast",
  "Pop Culture",
  "Productivity",
  "Relationship",
  "Running",
  "Skincare",
  "Sports",
  "Tech",
  "Travel",
  "True Crime",
  "Wellness",
  "Yoga",
];
const selectedNiches = (category: string) =>
  category
    .split(",")
    .map((niche) => niche.trim())
    .filter(Boolean);
const primaryButtonClass =
  "[--button-bg:#000] [--button-bg-hover:#171717] [--button-bg-pressed:#262626] [--button-fg:#fff]";

function ItemCard({
  title,
  description,
  visible,
  onOpen,
  onToggle,
  onDelete,
}: {
  title: string;
  description: string;
  visible: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-within:border-gray-300 focus-within:bg-gray-50">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onOpen}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          <p className="mt-1 truncate text-sm text-gray-500">{description}</p>
        </div>
      </button>

      <Button
        isIconOnly
        variant="ghost"
        aria-label={`Delete ${title}`}
        className="text-red-600"
        onPress={onDelete}
      >
        <Trash2 size={18} />
      </Button>
      <Tooltip delay={300}>
        <Tooltip.Trigger>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={visible ? `Hide ${title}` : `Show ${title}`}
            className="text-black"
            onPress={onToggle}
          >
            {visible ? <Eye size={18} /> : <EyeOff size={18} />}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content
          placement="top"
          showArrow
          className="rounded-xl bg-[#171717] px-3 py-2 text-xs font-medium text-white shadow-lg"
        >
          {visible ? "Hide in Media Kit" : "Show in Media Kit"}
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h2 className="font-medium text-gray-900">{title}</h2>
        <p className="text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 rounded-2xl bg-gray-50 px-6 py-12 text-center">
      <Inbox className="size-9 text-gray-400" aria-hidden="true" />
      <div className="max-w-sm space-y-2">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}
function VisibilitySwitch({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <Button
          isIconOnly
          variant="ghost"
          className="rounded-full bg-gray-100 text-black hover:bg-gray-200"
          isDisabled={disabled}
          aria-label={label}
          onPress={() => onChange(!value)}
        >
          {value ? <Eye size={18} /> : <EyeOff size={18} />}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content
        placement="top"
        showArrow
        className="rounded-xl bg-[#171717] px-3 py-2 text-xs text-white"
      >
        {value ? "Hide in Media Kit" : "Show in Media Kit"}
      </Tooltip.Content>
    </Tooltip>
  );
}

function Toggle({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch
      isSelected={value}
      onChange={onChange}
      isDisabled={disabled}
      className="w-full"
    >
      <Switch.Content className="flex w-full items-center justify-between gap-3">
        <Label className="min-w-0">{label}</Label>
        <Switch.Control className="shrink-0">
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
const deleteButtonClass =
  "rounded-full [--button-bg:#dc2626] [--button-bg-hover:#b91c1c] [--button-bg-pressed:#991b1b] [--button-fg:#fff]";
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:border-gray-400 focus:ring-gray-300";
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: "text" | "email" | "url" | "tel";
  onBlur?: () => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 text-sm">
      <Label htmlFor={id} className="text-gray-600">
        {label}
      </Label>
      {multiline ? (
        <textarea
          id={id}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <Input
          id={id}
          type={type}
          onBlur={onBlur}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
export default function CreatorMediaKit() {
  const toast = useToast();
  const data = useQuery(api.mediaKits.getEditor, {});
  const reportedImportErrors = useRef(new Set<string>());
  useEffect(() => {
    for (const { job } of data?.accounts ?? []) {
      if (job?.error_message && !reportedImportErrors.current.has(job._id)) {
        reportedImportErrors.current.add(job._id);
        toast({
          title: "Account import failed",
          description: job.error_message,
          color: "danger",
        });
      }
    }
  }, [data, toast]);
  const add = useMutation(api.mediaKits.addAccount);
  const save = useMutation(api.mediaKits.saveSettings);

  const displayMutation = useMutation(api.mediaKits.setAccountDisplay);
  const remove = useMutation(api.mediaKits.removeAccount);
  const [handle, setHandle] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<
    | {
        kind: "account";
        id: Id<"media_kit_accounts">;
        handle: string;
        platform: Platform;
      }
    | { kind: "partnership"; index: number; name: string }
    | { kind: "rate"; index: number; name: string }
    | { kind: "contact"; index: number; name: string }
    | null
  >(null);
  const [detail, setDetail] = useState<{ section: string; key: string } | null>(
    null,
  );
  const [tab, setTab] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedSettings, setSavedSettings] = useState<Settings | null>(null);
  const baseline = useRef<Settings | null>(null);
  type AccountDisplay = Parameters<typeof displayMutation>[0];
  const [accountDrafts, setAccountDrafts] = useState<
    Record<string, AccountDisplay>
  >({});
  const [removedAccounts, setRemovedAccounts] = useState<
    Id<"media_kit_accounts">[]
  >([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data?.kit) {
      const k = data.kit;
      const next: Settings = {
        slug: k.slug,
        display_name: k.display_name,
        bio: k.bio,
        category: k.category,
        total_audience_visible: true,
        rates_visible: k.rates_visible,
        contacts_visible: k.contacts_visible,
        partnerships: k.partnerships ?? [],
        partnerships_visible: k.partnerships_visible ?? true,
        rates: k.rates,
        contacts: k.contacts,
      };
      const previous = baseline.current;
      setSettings((current) => {
        if (!current || !previous) return next;
        const merged = { ...current };
        for (const key of Object.keys(next) as (keyof Settings)[]) {
          if (JSON.stringify(current[key]) === JSON.stringify(previous[key]))
            Object.assign(merged, { [key]: next[key] });
        }
        return merged;
      });
      baseline.current = next;
      setSavedSettings(next);
    }
  }, [data]);
  const run = async (fn: () => Promise<unknown>, success = "") => {
    setBusy(true);
    try {
      await fn();
      if (success) toast({ title: success, color: "success" });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Something went wrong.",
        color: "danger",
      });
    } finally {
      setBusy(false);
    }
  };
  const edit = (patch: Partial<Settings>) => {
    if (settings) {
      if (
        patch.partnerships &&
        patch.partnerships.length > (settings.partnerships ?? []).length
      )
        setDetail({
          section: "partnerships",
          key: String(patch.partnerships.length - 1),
        });
      if (patch.rates && patch.rates.length > settings.rates.length)
        setDetail({ section: "rates", key: String(patch.rates.length - 1) });
      if (patch.contacts && patch.contacts.length > settings.contacts.length)
        setDetail({
          section: "contact",
          key: patch.contacts[patch.contacts.length - 1].kind,
        });
    }
    setSettings((s) => (s ? { ...s, ...patch } : s));
  };
  const display = async (draft: AccountDisplay) => {
    setAccountDrafts((current) => ({ ...current, [draft.accountId]: draft }));
  };
  const detailActions = () => {
    if (!detail) return null;
    let visible = false;
    let toggle = () => {};
    let deletion = () => {};
    if (detail.section === "accounts") {
      const account = data?.accounts.find(
        ({ account }) => account._id === detail.key,
      )?.account;
      if (!account) return null;
      const draft = accountDrafts[account._id];
      visible = draft?.isVisible ?? account.is_visible;
      toggle = () =>
        void display({
          accountId: account._id,
          isVisible: !visible,
          metricVisibility:
            draft?.metricVisibility ?? account.metric_visibility,
        });
      deletion = () =>
        setPendingRemoval({
          kind: "account",
          id: account._id,
          handle: account.handle,
          platform: account.platform ?? "instagram",
        });
    } else if (settings) {
      const index =
        detail.section === "contact"
          ? settings.contacts.findIndex((c) => c.kind === detail.key)
          : Number(detail.key);
      if (detail.section === "partnerships") {
        const item = settings.partnerships?.[index];
        if (!item) return null;
        visible = item.is_visible;
        toggle = () =>
          edit({
            partnerships: (settings.partnerships ?? []).map((p, i) =>
              i === index ? { ...p, is_visible: !visible } : p,
            ),
          });
        deletion = () =>
          setPendingRemoval({
            kind: "partnership",
            index,
            name: item.brand_name || "partnership",
          });
      } else if (detail.section === "rates") {
        const item = settings.rates[index];
        if (!item) return null;
        visible = item.is_visible;
        toggle = () =>
          edit({
            rates: settings.rates.map((r, i) =>
              i === index ? { ...r, is_visible: !visible } : r,
            ),
          });
        deletion = () =>
          setPendingRemoval({ kind: "rate", index, name: item.name || "rate" });
      } else {
        const item = settings.contacts[index];
        if (!item) return null;
        visible = item.is_visible;
        toggle = () =>
          edit({
            contacts: settings.contacts.map((c, i) =>
              i === index ? { ...c, is_visible: !visible } : c,
            ),
          });
        deletion = () =>
          setPendingRemoval({ kind: "contact", index, name: item.kind });
      }
    }
    return (
      <div className="ml-auto flex items-center gap-2">
        <VisibilitySwitch
          label={visible ? "Hide in Media Kit" : "Show in Media Kit"}
          value={visible}
          onChange={toggle}
          disabled={busy}
        />
        <Button
          isIconOnly
          variant="primary"
          className={deleteButtonClass}
          aria-label="Delete item"
          isDisabled={busy}
          onPress={deletion}
        >
          <Trash2 size={18} aria-hidden="true" />
        </Button>
      </div>
    );
  };
  const footer = (
    section: "profile" | "accounts" | "partnerships" | "rates" | "contact",
  ) => {
    const keys: (keyof Settings)[] =
      section === "profile"
        ? ["slug", "display_name", "bio", "category"]
        : section === "partnerships"
          ? ["partnerships", "partnerships_visible"]
          : section === "rates"
            ? ["rates", "rates_visible"]
            : section === "contact"
              ? ["contacts", "contacts_visible"]
              : [];
    const pendingAccounts = Object.values(accountDrafts).filter((draft) => {
      const account = data?.accounts.find(
        ({ account }) => account._id === draft.accountId,
      )?.account;
      return (
        account &&
        (account.is_visible !== draft.isVisible ||
          JSON.stringify(account.metric_visibility) !==
            JSON.stringify(draft.metricVisibility))
      );
    });
    const changed =
      section === "accounts"
        ? pendingAccounts.length > 0 || removedAccounts.length > 0
        : !!settings &&
          !!savedSettings &&
          keys.some(
            (key) =>
              JSON.stringify(settings[key]) !==
              JSON.stringify(savedSettings[key]),
          );
    const creating =
      detail?.section === section &&
      !!savedSettings &&
      (section === "partnerships"
        ? Number(detail.key) >= (savedSettings.partnerships ?? []).length
        : section === "rates"
          ? Number(detail.key) >= savedSettings.rates.length
          : section === "contact"
            ? !savedSettings.contacts.some(
                (contact) => contact.kind === detail.key,
              )
            : false);
    if (!changed) return null;
    return (
      <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
        <Button
          variant="ghost"
          className="text-black"
          isDisabled={busy}
          onPress={() => {
            setDetail(null);
            if (section === "accounts") {
              setAccountDrafts({});
              setRemovedAccounts([]);
            } else if (savedSettings)
              edit(
                Object.fromEntries(
                  keys.map((key) => [key, savedSettings[key]]),
                ),
              );
          }}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          className={primaryButtonClass}
          isDisabled={busy}
          onPress={() =>
            run(async () => {
              if (section === "accounts") {
                for (const draft of pendingAccounts) {
                  if (!removedAccounts.includes(draft.accountId))
                    await displayMutation(draft);
                }
                for (const accountId of removedAccounts)
                  await remove({ accountId });
                setRemovedAccounts([]);
                setAccountDrafts({});
              } else if (settings && savedSettings) {
                const updated = {
                  ...savedSettings,
                  ...Object.fromEntries(
                    keys.map((key) => [key, settings[key]]),
                  ),
                };
                await save({ settings: updated });
                baseline.current = updated;
                setSavedSettings(updated);
              }
              setDetail(null);
            }, "Changes saved")
          }
        >
          {busy
            ? creating
              ? "Confirming…"
              : "Saving…"
            : creating
              ? "Confirm"
              : "Save"}
        </Button>
      </div>
    );
  };
  if (data === undefined) return <MediaKitSkeleton editor />;
  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto [--focus:#9ca3af] [--field-border-focus:#9ca3af]">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Media Kit</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your audience, your work, your public introduction.
          </p>
        </div>
        {settings && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              className="text-black"
              isDisabled={busy}
              onPress={() =>
                run(
                  () =>
                    navigator.clipboard.writeText(
                      `${window.location.origin}/kit/${data.kit!.slug}`,
                    ),
                  "Link copied",
                )
              }
            >
              <Copy size={16} aria-hidden="true" />
              Copy link
            </Button>
            <Button
              variant="primary"
              className={primaryButtonClass}
              isDisabled={!data.kit?.is_published}
              onPress={() =>
                window.open(
                  `/kit/${data.kit!.slug}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              Live URL
              <ExternalLink size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
      </header>
      <div className="w-full">
        <Tabs
          orientation="horizontal"
          selectedKey={tab ?? (data.accounts.length ? "profile" : "accounts")}
          onSelectionChange={(key) => {
            setModalOpen(false);
            setTab(String(key));
            setDetail(null);
          }}
          className="min-w-0 w-full items-start gap-6"
        >
          <Tabs.ListContainer className="h-auto w-fit max-w-full flex-none self-start overflow-visible rounded-full">
            <Tabs.List
              aria-label="Media kit settings"
              className="h-auto min-w-0 w-fit max-w-full flex-row flex-nowrap gap-0 overflow-visible"
            >
              {[
                { id: "profile", label: "Profile" },
                { id: "accounts", label: "Accounts" },
                { id: "partnerships", label: "Partnerships" },
                { id: "rates", label: "Rates" },
                { id: "contact", label: "Contact" },
              ].map(({ id, label }) => (
                <Tabs.Tab
                  key={id}
                  id={id}
                  className="h-9 min-w-0 w-auto flex-initial whitespace-nowrap px-1.5 text-xs font-normal text-black sm:px-4 sm:text-sm"
                >
                  {label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="profile" className="min-w-0 w-full">
            {settings ? (
              <section className="space-y-5">
                <SectionHeading
                  title="Profile"
                  description="Introduce yourself with a name, bio, niche, and your public link."
                />
                <div className="space-y-2">
                  <Field
                    label="Slug"
                    value={settings.slug}
                    onChange={(slug) => edit({ slug })}
                  />
                  {data.kit?.is_published && (
                    <p className="text-sm text-gray-500 break-all">
                      Preview Link:{" "}
                      <a
                        className="text-gray-900 underline"
                        href={`/kit/${data.kit.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {window.location.origin}/kit/{data.kit.slug}
                      </a>
                    </p>
                  )}
                </div>
                <Field
                  label="Display name"
                  value={settings.display_name}
                  onChange={(display_name) => edit({ display_name })}
                />
                <TagGroup
                  aria-label="Influencer type / niche"
                  selectionMode="multiple"
                  selectionBehavior="toggle"
                  selectedKeys={selectedNiches(settings.category)}
                  onSelectionChange={(keys) =>
                    edit({
                      category: (keys === "all"
                        ? nicheOptions
                        : Array.from(keys, String)
                      ).join(", "),
                    })
                  }
                  onRemove={(keys) =>
                    edit({
                      category: selectedNiches(settings.category)
                        .filter((niche) => !keys.has(niche))
                        .join(", "),
                    })
                  }
                  className="space-y-2"
                >
                  <Label>Influencer type / niche</Label>
                  <TagGroup.List className="flex flex-wrap gap-2">
                    {[
                      ...new Set([
                        ...selectedNiches(settings.category),
                        ...nicheOptions,
                      ]),
                    ].map((niche) => (
                      <Tag
                        key={niche}
                        id={niche}
                        textValue={niche}
                        className="min-h-10 cursor-pointer rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600 data-[selected=true]:bg-black data-[selected=true]:text-white"
                      >
                        {({ isSelected }) => (
                          <>
                            {niche}
                            {isSelected && (
                              <Tag.RemoveButton
                                aria-label={`Remove ${niche}`}
                                className="ml-1 bg-transparent text-white hover:bg-transparent"
                              >
                                <X
                                  size={14}
                                  strokeWidth={2}
                                  aria-hidden="true"
                                />
                              </Tag.RemoveButton>
                            )}
                          </>
                        )}
                      </Tag>
                    ))}
                  </TagGroup.List>
                </TagGroup>
                <Field
                  label="Bio"
                  multiline
                  value={settings.bio}
                  onChange={(bio) => edit({ bio })}
                />
                {footer("profile")}
              </section>
            ) : (
              <EmptyState
                title="Create your profile"
                description="Add your first social account to start creating your media kit."
              >
                <Button
                  variant="primary"
                  className={primaryButtonClass}
                  onPress={() => {
                    setTab("accounts");
                    setDetail(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  Add account
                </Button>
              </EmptyState>
            )}
          </Tabs.Panel>
          <Tabs.Panel id="accounts" className="min-w-0 w-full">
            <section
              key={modalOpen ? "new-account" : (detail?.key ?? "list")}
              className={`space-y-5 ${detail?.section === "accounts" || modalOpen ? "media-kit-detail-enter" : ""}`}
            >
              {!detail && !modalOpen && (
                <SectionHeading
                  title="Accounts"
                  description="Add up to five public accounts. Data refreshes every 24 hours, including hidden accounts."
                >
                  {!detail && !modalOpen && (
                    <Button
                      variant="primary"
                      className={primaryButtonClass}
                      isDisabled={busy || data.accounts.length >= 5}
                      onPress={() => {
                        setModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      Add account
                    </Button>
                  )}
                </SectionHeading>
              )}
              {modalOpen && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Back to accounts"
                      onPress={() => setModalOpen(false)}
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    <h3 className="font-medium">Add account</h3>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);

                      try {
                        const normalizedHandle = normalizeAccountHandle(
                          handle,
                          platform,
                        );
                        const accountId = await add({
                          handle: normalizedHandle,
                          platform,
                        });
                        setDetail({ section: "accounts", key: accountId });
                        setHandle("");
                        setModalOpen(false);
                        setTab("accounts");
                      } catch (error) {
                        toast({
                          title: "Could not add account",
                          description:
                            error instanceof Error
                              ? error.message
                              : "Please try again.",
                          color: "danger",
                        });
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <div className="space-y-5">
                      <fieldset disabled={busy}>
                        <legend className="mb-3 text-sm text-gray-600">
                          Choose a platform
                        </legend>
                        <div className="grid grid-cols-2 gap-3">
                          {(["instagram", "tiktok"] as const).map((value) => (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-center gap-2 rounded-xl border p-4 text-sm ${platform === value ? "border-black bg-gray-50" : "border-gray-200"}`}
                            >
                              <input
                                type="radio"
                                name="platform"
                                value={value}
                                checked={platform === value}
                                onChange={() => {
                                  setPlatform(value);
                                  setHandle("");
                                }}
                                className="accent-black"
                              />
                              <PlatformIcon platform={value} />
                              {value === "instagram" ? "Instagram" : "TikTok"}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <Field
                        label={`${platform === "instagram" ? "Instagram" : "TikTok"} username or profile URL`}
                        value={handle}
                        onChange={setHandle}
                        onBlur={() => {
                          if (!handle.trim()) return;
                          try {
                            normalizeAccountHandle(handle, platform);
                          } catch (error) {
                            toast({
                              title: "Check profile link",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Enter a valid profile URL or username.",
                              color: "danger",
                            });
                          }
                        }}
                      />

                      <p className="text-xs text-gray-500">
                        Use a public profile. Your data will import
                        automatically and refresh every 24 hours.
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                      <Button
                        variant="ghost"
                        className="text-black"
                        isDisabled={busy}
                        onPress={() => setModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className={primaryButtonClass}
                        isDisabled={busy || !handle.trim()}
                      >
                        <Plus size={16} aria-hidden="true" />
                        {busy ? "Confirming…" : "Confirm"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
              {!detail && !modalOpen && data.accounts.length === 0 && (
                <EmptyState
                  title="No accounts yet"
                  description="Add your Instagram or TikTok account to start building your media kit."
                />
              )}

              {detail?.section === "accounts" && (
                <div className="flex items-center gap-3">
                  <Button
                    isIconOnly
                    variant="ghost"
                    aria-label="Back to list"
                    className="text-black"
                    onPress={() => setDetail(null)}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <h3 className="font-medium">Account details</h3>
                  {detailActions()}
                </div>
              )}

              {!detail &&
                !modalOpen &&
                data.accounts
                  .filter(
                    ({ account }) => !removedAccounts.includes(account._id),
                  )
                  .map(({ account }) => {
                    const draft = accountDrafts[account._id];
                    return (
                      <ItemCard
                        key={account._id}
                        title={`@${account.handle}`}
                        description={
                          account.platform === "tiktok" ? "TikTok" : "Instagram"
                        }
                        visible={draft?.isVisible ?? account.is_visible}
                        onOpen={() =>
                          setDetail({ section: "accounts", key: account._id })
                        }
                        onToggle={() =>
                          void display({
                            accountId: account._id,
                            isVisible: !(
                              draft?.isVisible ?? account.is_visible
                            ),
                            metricVisibility:
                              draft?.metricVisibility ??
                              account.metric_visibility,
                          })
                        }
                        onDelete={() =>
                          setPendingRemoval({
                            kind: "account",
                            id: account._id,
                            handle: account.handle,
                            platform: account.platform ?? "instagram",
                          })
                        }
                      />
                    );
                  })}
              {data.accounts
                .filter(({ account }) => !removedAccounts.includes(account._id))
                .map(({ account, job }) => ({
                  account: {
                    ...account,
                    is_visible:
                      accountDrafts[account._id]?.isVisible ??
                      account.is_visible,
                    metric_visibility:
                      accountDrafts[account._id]?.metricVisibility ??
                      account.metric_visibility,
                  },
                  job,
                }))
                .map(({ account: a, job }) => (
                  <div
                    key={a._id}
                    className={
                      detail?.section === "accounts" && detail.key === a._id
                        ? "space-y-5"
                        : "hidden"
                    }
                  >
                    <div className="flex justify-between gap-2">
                      <h3 className="flex min-w-0 items-center gap-2 font-medium">
                        <PlatformIcon platform={a.platform ?? "instagram"} />
                        <span className="truncate">@{a.handle}</span>
                        <span className="sr-only">
                          {a.platform === "tiktok" ? "TikTok" : "Instagram"}
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500">
                      {a.platform === "tiktok" ? "TikTok" : "Instagram"} ·{" "}
                      {job &&
                      ["queued", "running", "failed"].includes(job.status)
                        ? `Import ${job.status}`
                        : a.last_success_at
                          ? `Updated ${new Date(a.last_success_at).toLocaleString()}`
                          : "No imported data yet"}
                    </p>
                    {(
                      Object.entries({
                        followers: "Followers",
                        postCount: "Post count",
                        engagementRate: "Engagement rate",
                        averageLikes: "Average likes",
                        averageComments: "Average comments",
                        averageVideoViews: "Average video views",
                        recentPosts: "Recent posts",
                      }) as [keyof typeof a.metric_visibility, string][]
                    ).map(([key, label]) => (
                      <Toggle
                        key={key}
                        label={label}
                        value={a.metric_visibility[key]}
                        disabled={busy}
                        onChange={(value) =>
                          run(() =>
                            display({
                              accountId: a._id,
                              isVisible: a.is_visible,
                              metricVisibility: {
                                ...a.metric_visibility,
                                [key]: value,
                              },
                            }),
                          )
                        }
                      />
                    ))}
                  </div>
                ))}
              {!modalOpen && footer("accounts")}
            </section>
          </Tabs.Panel>
          <Tabs.Panel id="partnerships" className="min-w-0 w-full">
            {settings ? (
              <section
                key={detail?.key ?? "list"}
                className={`space-y-5 ${detail?.section === "partnerships" ? "media-kit-detail-enter" : ""}`}
              >
                {!detail && (
                  <SectionHeading
                    title="Past partnerships"
                    description="Showcase brands you’ve worked with. Add up to ten collaborations."
                  >
                    {!detail && (
                      <Button
                        variant="primary"
                        className={primaryButtonClass}
                        isDisabled={(settings.partnerships ?? []).length >= 10}
                        onPress={() =>
                          edit({
                            partnerships: [
                              ...(settings.partnerships ?? []),
                              {
                                brand_name: "",
                                description: "",
                                url: "",
                                is_visible: true,
                              },
                            ],
                          })
                        }
                      >
                        <Plus size={16} />
                        Add partnership
                      </Button>
                    )}
                  </SectionHeading>
                )}
                {!detail && (settings.partnerships ?? []).length === 0 && (
                  <EmptyState
                    title="No partnerships yet"
                    description="Showcase brands you’ve worked with by adding your first collaboration."
                  />
                )}

                {detail?.section === "partnerships" && (
                  <div className="flex items-center gap-3">
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Back to list"
                      className="text-black"
                      onPress={() => setDetail(null)}
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    <h3 className="font-medium">Partnership details</h3>
                    {detailActions()}
                  </div>
                )}

                {!detail && (settings.partnerships ?? []).length > 0 && (
                  <Toggle
                    label="Show in Media Kit"
                    value={settings.partnerships_visible ?? true}
                    onChange={(partnerships_visible) =>
                      edit({ partnerships_visible })
                    }
                  />
                )}
                {!detail &&
                  (settings.partnerships ?? []).map((partner, i) => (
                    <ItemCard
                      key={i}
                      title={partner.brand_name || "New partnership"}
                      description={
                        partner.description || "Add collaboration details"
                      }
                      visible={partner.is_visible}
                      onOpen={() =>
                        setDetail({ section: "partnerships", key: String(i) })
                      }
                      onToggle={() =>
                        edit({
                          partnerships: (settings.partnerships ?? []).map(
                            (p, j) =>
                              j === i ? { ...p, is_visible: !p.is_visible } : p,
                          ),
                        })
                      }
                      onDelete={() =>
                        setPendingRemoval({
                          kind: "partnership",
                          index: i,
                          name: partner.brand_name || "partnership",
                        })
                      }
                    />
                  ))}
                {(settings.partnerships ?? []).map((partner, i) => (
                  <div
                    key={i}
                    className={
                      detail?.section === "partnerships" &&
                      detail.key === String(i)
                        ? "space-y-5"
                        : "hidden"
                    }
                  >
                    <div className="flex items-end gap-3">
                      <div className="min-w-0 w-full">
                        <Field
                          label="Brand name"
                          value={partner.brand_name}
                          onChange={(brand_name) =>
                            edit({
                              partnerships: (settings.partnerships ?? []).map(
                                (p, j) => (j === i ? { ...p, brand_name } : p),
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                    <Field
                      label="Collaboration description"
                      multiline
                      value={partner.description}
                      onChange={(description) =>
                        edit({
                          partnerships: (settings.partnerships ?? []).map(
                            (p, j) => (j === i ? { ...p, description } : p),
                          ),
                        })
                      }
                    />
                    <Field
                      label="Campaign or brand link (optional, https://)"
                      value={partner.url}
                      type="url"
                      onBlur={() => {
                        if (!partner.url.trim()) return;
                        try {
                          contactHref({
                            kind: "website",
                            value: partner.url,
                            is_visible: true,
                          });
                        } catch (error) {
                          toast({
                            title: "Check partnership URL",
                            description:
                              error instanceof Error
                                ? error.message
                                : "Enter a valid HTTPS URL.",
                            color: "danger",
                          });
                        }
                      }}
                      onChange={(url) =>
                        edit({
                          partnerships: (settings.partnerships ?? []).map(
                            (p, j) => (j === i ? { ...p, url } : p),
                          ),
                        })
                      }
                    />
                  </div>
                ))}

                {footer("partnerships")}
              </section>
            ) : (
              <EmptyState
                title="Showcase your partnerships"
                description="Add your first social account to start creating your media kit."
              >
                <Button
                  variant="primary"
                  className={primaryButtonClass}
                  onPress={() => {
                    setTab("accounts");
                    setDetail(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  Add account
                </Button>
              </EmptyState>
            )}
          </Tabs.Panel>
          <Tabs.Panel id="rates" className="min-w-0 w-full">
            {settings ? (
              <section
                key={detail?.key ?? "list"}
                className={`space-y-5 ${detail?.section === "rates" ? "media-kit-detail-enter" : ""}`}
              >
                {!detail && (
                  <SectionHeading
                    title="Rates"
                    description="List your services and pricing so brands know how to work with you."
                  >
                    {!detail && (
                      <Button
                        variant="primary"
                        className={primaryButtonClass}
                        isDisabled={settings.rates.length >= 10}
                        onPress={() =>
                          edit({
                            rates: [
                              ...settings.rates,
                              {
                                name: "",
                                description: "",
                                amount_minor: 0,
                                currency: "MYR",
                                starting_from: false,
                                is_visible: false,
                              },
                            ],
                          })
                        }
                      >
                        <Plus size={16} aria-hidden="true" />
                        Add rate
                      </Button>
                    )}
                  </SectionHeading>
                )}
                {!detail && settings.rates.length === 0 && (
                  <EmptyState
                    title="No rates yet"
                    description="Add a service and its rate so brands know how to work with you."
                  />
                )}

                {detail?.section === "rates" && (
                  <div className="flex items-center gap-3">
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Back to list"
                      className="text-black"
                      onPress={() => setDetail(null)}
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    <h3 className="font-medium">Rate details</h3>
                    {detailActions()}
                  </div>
                )}

                {!detail && settings.rates.length > 0 && (
                  <Toggle
                    label="Show in Media Kit"
                    value={settings.rates_visible}
                    onChange={(rates_visible) => edit({ rates_visible })}
                  />
                )}
                {!detail &&
                  settings.rates.map((rate, i) => (
                    <ItemCard
                      key={i}
                      title={rate.name || "New rate"}
                      description={`${rate.currency} ${(rate.amount_minor / 100).toFixed(2)}`}
                      visible={rate.is_visible}
                      onOpen={() =>
                        setDetail({ section: "rates", key: String(i) })
                      }
                      onToggle={() =>
                        edit({
                          rates: settings.rates.map((r, j) =>
                            j === i ? { ...r, is_visible: !r.is_visible } : r,
                          ),
                        })
                      }
                      onDelete={() =>
                        setPendingRemoval({
                          kind: "rate",
                          index: i,
                          name: rate.name || "rate",
                        })
                      }
                    />
                  ))}
                {settings.rates.map((rate, i) => (
                  <div
                    key={i}
                    className={
                      detail?.section === "rates" && detail.key === String(i)
                        ? "space-y-5"
                        : "hidden"
                    }
                  >
                    <div className="flex items-end gap-3">
                      <div className="min-w-0 w-full">
                        {" "}
                        <Field
                          label="Service"
                          value={rate.name}
                          onChange={(name) =>
                            edit({
                              rates: settings.rates.map((r, j) =>
                                j === i ? { ...r, name } : r,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="pb-2"> </div>
                    </div>
                    <Field
                      label="Description"
                      value={rate.description}
                      onChange={(description) =>
                        edit({
                          rates: settings.rates.map((r, j) =>
                            j === i ? { ...r, description } : r,
                          ),
                        })
                      }
                    />
                    <div className="flex gap-3">
                      <label className="flex flex-1 flex-col gap-2 text-sm">
                        Price
                        <input
                          aria-label="Price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={rate.amount_minor / 100}
                          className={inputClass}
                          onChange={(e) =>
                            edit({
                              rates: settings.rates.map((r, j) =>
                                j === i
                                  ? {
                                      ...r,
                                      amount_minor: Math.round(
                                        Number(e.target.value) * 100,
                                      ),
                                    }
                                  : r,
                              ),
                            })
                          }
                        />
                      </label>
                      <Select
                        className="w-28 shrink-0 gap-2"
                        value={rate.currency}
                        onChange={(currency) => {
                          if (
                            currency !== "MYR" &&
                            currency !== "USD" &&
                            currency !== "SGD"
                          )
                            return;
                          edit({
                            rates: settings.rates.map((r, j) =>
                              j === i ? { ...r, currency } : r,
                            ),
                          });
                        }}
                      >
                        <Label>Currency</Label>
                        <Select.Trigger className="rounded-xl border border-gray-200 bg-white text-black">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {["MYR", "USD", "SGD"].map((currency) => (
                              <ListBox.Item
                                key={currency}
                                id={currency}
                                textValue={currency}
                              >
                                <Label>{currency}</Label>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                    <Toggle
                      label="Starting from"
                      value={rate.starting_from}
                      onChange={(starting_from) =>
                        edit({
                          rates: settings.rates.map((r, j) =>
                            j === i ? { ...r, starting_from } : r,
                          ),
                        })
                      }
                    />
                  </div>
                ))}

                {footer("rates")}
              </section>
            ) : (
              <EmptyState
                title="Set your rates"
                description="Add your first social account to start creating your media kit."
              >
                <Button
                  variant="primary"
                  className={primaryButtonClass}
                  onPress={() => {
                    setTab("accounts");
                    setDetail(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  Add account
                </Button>
              </EmptyState>
            )}
          </Tabs.Panel>
          <Tabs.Panel id="contact" className="min-w-0 w-full">
            {settings ? (
              <section
                key={detail?.key ?? "list"}
                className={`space-y-5 ${detail?.section === "contact" ? "media-kit-detail-enter" : ""}`}
              >
                {!detail && (
                  <SectionHeading
                    title="Contact"
                    description="Choose how brands can reach you and which contact details appear publicly."
                  >
                    {!detail && (
                      <Select
                        aria-label="Add a contact method"
                        className="w-fit"
                        placeholder="Add contact"
                        value={null}
                        isDisabled={settings.contacts.length >= 4}
                        onChange={(kind) => {
                          if (
                            kind !== "email" &&
                            kind !== "whatsapp" &&
                            kind !== "website" &&
                            kind !== "instagram"
                          )
                            return;
                          if (!settings.contacts.some((c) => c.kind === kind))
                            edit({
                              contacts: [
                                ...settings.contacts,
                                { kind, value: "", is_visible: false },
                              ],
                            });
                        }}
                      >
                        <Select.Trigger className="min-h-10 items-center justify-center gap-2 rounded-full! border-black! bg-black! px-4! text-white! shadow-none hover:bg-gray-900!">
                          <Plus size={16} aria-hidden="true" />
                          <Select.Value className="flex-none whitespace-nowrap text-sm text-white!" />
                          <Select.Indicator className="static! size-4 text-white!" />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {(
                              [
                                { kind: "email", label: "Email" },
                                { kind: "whatsapp", label: "WhatsApp" },
                                { kind: "website", label: "Website" },
                                { kind: "instagram", label: "Instagram DM" },
                              ] as { kind: Contact["kind"]; label: string }[]
                            )
                              .filter(
                                (item) =>
                                  !settings.contacts.some(
                                    (c) => c.kind === item.kind,
                                  ),
                              )
                              .map((item) => (
                                <ListBox.Item
                                  key={item.kind}
                                  id={item.kind}
                                  textValue={item.label}
                                >
                                  <Label>{item.label}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    )}
                  </SectionHeading>
                )}
                {!detail && settings.contacts.length === 0 && (
                  <EmptyState
                    title="No contact methods yet"
                    description="Choose a contact method so brands can reach you."
                  />
                )}

                {detail?.section === "contact" && (
                  <div className="flex items-center gap-3">
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Back to list"
                      className="text-black"
                      onPress={() => setDetail(null)}
                    >
                      <ArrowLeft size={18} />
                    </Button>
                    <h3 className="font-medium">Contact details</h3>
                    {detailActions()}
                  </div>
                )}

                {!detail && settings.contacts.length > 0 && (
                  <Toggle
                    label="Show in Media Kit"
                    value={settings.contacts_visible}
                    onChange={(contacts_visible) => edit({ contacts_visible })}
                  />
                )}
                {!detail &&
                  settings.contacts.map((contact, i) => (
                    <ItemCard
                      key={contact.kind}
                      title={
                        contact.kind === "whatsapp"
                          ? "WhatsApp"
                          : contact.kind === "instagram"
                            ? "Instagram DM"
                            : contact.kind === "email"
                              ? "Email"
                              : "Website"
                      }
                      description={contact.value || "Add contact details"}
                      visible={contact.is_visible}
                      onOpen={() =>
                        setDetail({ section: "contact", key: contact.kind })
                      }
                      onToggle={() =>
                        edit({
                          contacts: settings.contacts.map((c, j) =>
                            j === i ? { ...c, is_visible: !c.is_visible } : c,
                          ),
                        })
                      }
                      onDelete={() =>
                        setPendingRemoval({
                          kind: "contact",
                          index: i,
                          name: contact.kind,
                        })
                      }
                    />
                  ))}
                {settings.contacts.map((c, i) => (
                  <div
                    key={c.kind}
                    className={
                      detail?.section === "contact" && detail.key === c.kind
                        ? "space-y-5"
                        : "hidden"
                    }
                  >
                    <div className="flex items-end gap-3">
                      <div className="min-w-0 w-full">
                        {" "}
                        <Field
                          label={
                            c.kind === "whatsapp"
                              ? "WhatsApp (+country code)"
                              : c.kind === "instagram"
                                ? "Instagram DM username"
                                : c.kind === "website"
                                  ? "Website (https://)"
                                  : "Email"
                          }
                          value={c.value}
                          type={
                            c.kind === "email"
                              ? "email"
                              : c.kind === "website"
                                ? "url"
                                : c.kind === "whatsapp"
                                  ? "tel"
                                  : "text"
                          }
                          onBlur={() => {
                            if (!c.value.trim()) return;
                            try {
                              contactHref(c);
                            } catch (error) {
                              toast({
                                title: "Check contact details",
                                description:
                                  error instanceof Error
                                    ? error.message
                                    : "Enter valid contact details.",
                                color: "danger",
                              });
                            }
                          }}
                          onChange={(value) =>
                            edit({
                              contacts: settings.contacts.map((x, j) =>
                                i === j ? { ...x, value } : x,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {footer("contact")}
              </section>
            ) : (
              <EmptyState
                title="Add your contact details"
                description="Add your first social account to start creating your media kit."
              >
                <Button
                  variant="primary"
                  className={primaryButtonClass}
                  onPress={() => {
                    setTab("accounts");
                    setDetail(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  Add account
                </Button>
              </EmptyState>
            )}
          </Tabs.Panel>
        </Tabs>
      </div>

      <Modal
        isOpen={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingRemoval(null);
        }}
      >
        <Modal.Backdrop isDismissable={!busy}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger isDisabled={busy} />
              <Modal.Header>
                <Modal.Heading>
                  {`Remove ${pendingRemoval?.kind ?? "item"}?`}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-gray-600">
                  {pendingRemoval && pendingRemoval.kind !== "account" ? (
                    <>
                      Remove <strong>{pendingRemoval.name}</strong> from your
                      media kit? Save this section to update your public page.
                    </>
                  ) : (
                    <>
                      Remove{" "}
                      {pendingRemoval?.platform === "tiktok"
                        ? "TikTok"
                        : "Instagram"}{" "}
                      <strong>@{pendingRemoval?.handle}</strong> from your media
                      kit? Its automatic refreshes will stop. You can add it
                      again later.
                    </>
                  )}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="ghost"
                  className="text-black"
                  isDisabled={busy}
                  onPress={() => setPendingRemoval(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className={primaryButtonClass}
                  isDisabled={busy || !pendingRemoval}
                  onPress={async () => {
                    if (!pendingRemoval) return;
                    if (
                      pendingRemoval.kind === "rate" ||
                      pendingRemoval.kind === "contact"
                    ) {
                      if (pendingRemoval.kind === "rate")
                        edit({
                          rates: (settings?.rates ?? []).filter(
                            (_, i) => i !== pendingRemoval.index,
                          ),
                        });
                      else
                        edit({
                          contacts: (settings?.contacts ?? []).filter(
                            (_, i) => i !== pendingRemoval.index,
                          ),
                        });
                      setPendingRemoval(null);
                      setDetail(null);
                      return;
                    }
                    if (pendingRemoval.kind === "partnership") {
                      edit({
                        partnerships: (settings?.partnerships ?? []).filter(
                          (_, i) => i !== pendingRemoval.index,
                        ),
                      });
                      setPendingRemoval(null);
                      setDetail(null);
                      toast({
                        title: "Partnership removed",
                        description:
                          "Save this section to update your public page.",
                        color: "info",
                      });
                      return;
                    }
                    setDetail(null);
                    setRemovedAccounts((current) => [
                      ...current,
                      pendingRemoval.id,
                    ]);
                    setPendingRemoval(null);
                    toast({
                      title: "Account removed",
                      description:
                        "Save this section to update your public page.",
                      color: "info",
                    });
                  }}
                >
                  {busy
                    ? "Removing…"
                    : `Remove ${pendingRemoval?.kind ?? "item"}`}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
