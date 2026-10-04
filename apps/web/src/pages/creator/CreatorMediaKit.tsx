import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Button,
  Label,
  Switch,
  Tabs,
  Modal,
  Dropdown,
  Select,
  ListBox,
} from "@heroui/react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
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
const primaryButtonClass =
  "[--button-bg:#000] [--button-bg-hover:#171717] [--button-bg-pressed:#262626] [--button-fg:#fff]";

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
    <Switch
      className="shrink-0"
      isSelected={value}
      isDisabled={disabled}
      onChange={onChange}
      aria-label={label}
    >
      <Switch.Content aria-label={label}>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
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
const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-lime-300";
function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-gray-600">{label}</span>
      {multiline ? (
        <textarea
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export default function CreatorMediaKit() {
  const toast = useToast();
  const data = useQuery(api.mediaKits.getEditor, {});
  const add = useMutation(api.mediaKits.addAccount);
  const save = useMutation(api.mediaKits.saveSettings);
  const publish = useMutation(api.mediaKits.setPublished);
  const display = useMutation(api.mediaKits.setAccountDisplay);
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
    | null
  >(null);
  const [tab, setTab] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data?.kit && !dirty) {
      const k = data.kit;
      setSettings({
        slug: k.slug,
        display_name: k.display_name,
        bio: k.bio,
        category: k.category,
        total_audience_visible: false,
        rates_visible: k.rates_visible,
        contacts_visible: k.contacts_visible,
        partnerships: k.partnerships ?? [],
        partnerships_visible: k.partnerships_visible ?? true,
        rates: k.rates,
        contacts: k.contacts,
      });
    }
  }, [data, dirty]);
  const run = async (fn: () => Promise<unknown>, success = "Saved") => {
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
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setDirty(true);
  };
  if (data === undefined) return <MediaKitSkeleton editor />;
  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Media Kit</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your audience, your work, your public introduction.
          </p>
        </div>
        {settings && (
          <div className="flex gap-2">
            <Button
              variant={data.kit?.is_published ? "ghost" : "primary"}
              className={
                data.kit?.is_published ? "text-black" : primaryButtonClass
              }
              isDisabled={busy || dirty}
              onPress={() =>
                run(
                  () => publish({ published: !data.kit!.is_published }),
                  data.kit!.is_published ? "Unpublished" : "Published",
                )
              }
            >
              {data.kit?.is_published ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="primary"
              className={primaryButtonClass}
              isDisabled={busy || !dirty}
              onPress={() =>
                run(async () => {
                  await save({ settings });
                  setDirty(false);
                })
              }
            >
              Save changes
            </Button>
          </div>
        )}
      </header>
      <div className="w-full">
        <Tabs
          orientation="horizontal"
          selectedKey={tab ?? (data.accounts.length ? "profile" : "accounts")}
          onSelectionChange={(key) => setTab(String(key))}
          className="min-w-0 w-full items-start gap-6"
        >
          <Tabs.ListContainer className="h-11 w-fit max-w-full flex-none self-start overflow-x-auto rounded-xl">
            <Tabs.List aria-label="Media kit settings" className="h-full w-max">
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
                  className="h-9 shrink-0 whitespace-nowrap font-normal text-black"
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
                <h2 className="font-medium">Your introduction</h2>
                <Field
                  label="Public link — /kit/"
                  value={settings.slug}
                  onChange={(slug) => edit({ slug })}
                />
                {data.kit?.is_published && (
                  <a
                    className="text-sm underline break-all"
                    href={`/kit/${data.kit.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {window.location.origin}/kit/{data.kit.slug}
                  </a>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-black"
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
                  Copy saved public link
                </Button>
                <Field
                  label="Display name"
                  value={settings.display_name}
                  onChange={(display_name) => edit({ display_name })}
                />
                <Field
                  label="Influencer type / niche"
                  value={settings.category}
                  onChange={(category) => edit({ category })}
                />
                <Field
                  label="Bio"
                  multiline
                  value={settings.bio}
                  onChange={(bio) => edit({ bio })}
                />
              </section>
            ) : (
              <p className="text-sm text-gray-500 p-5">
                Add an account in Accounts to start your profile.
              </p>
            )}
          </Tabs.Panel>
          <Tabs.Panel id="accounts" className="min-w-0 w-full">
            <section className="space-y-5">
              <h2 className="font-medium">Accounts</h2>
              <p className="text-xs text-gray-500">
                Add up to five public accounts. Data refreshes every 24 hours,
                including hidden accounts.
              </p>
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

              {data.accounts.map(({ account: a, job }) => (
                <div
                  key={a._id}
                  className="border-t border-gray-100 pt-4 space-y-3"
                >
                  <div className="flex justify-between gap-2">
                    <h3 className="flex min-w-0 items-center gap-2 font-medium">
                      <PlatformIcon platform={a.platform ?? "instagram"} />
                      <span className="truncate">@{a.handle}</span>
                      <span className="sr-only">
                        {a.platform === "tiktok" ? "TikTok" : "Instagram"}
                      </span>
                    </h3>
                    <div className="flex shrink-0 items-center gap-2">
                      <Switch
                        isSelected={a.is_visible}
                        isDisabled={busy}
                        onChange={(isVisible) =>
                          run(() =>
                            display({
                              accountId: a._id,
                              isVisible,
                              metricVisibility: a.metric_visibility,
                            }),
                          )
                        }
                        aria-label={`Show @${a.handle} on public media kit`}
                      >
                        <Switch.Content
                          aria-label={`Show @${a.handle} on public media kit`}
                        >
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        aria-label={`Remove @${a.handle}`}
                        isDisabled={busy}
                        onPress={() => {
                          setPendingRemoval({
                            kind: "account",
                            id: a._id,
                            handle: a.handle,
                            platform: a.platform ?? "instagram",
                          });
                        }}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {a.platform === "tiktok" ? "TikTok" : "Instagram"} ·{" "}
                    {job && ["queued", "running", "failed"].includes(job.status)
                      ? `Import ${job.status}`
                      : a.last_success_at
                        ? `Updated ${new Date(a.last_success_at).toLocaleString()}`
                        : "No imported data yet"}
                    {job?.error_message ? ` · ${job.error_message}` : ""}
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
            </section>
          </Tabs.Panel>
          <Tabs.Panel id="partnerships" className="min-w-0 w-full">
            {settings ? (
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium">Past partnerships</h2>
                  <VisibilitySwitch
                    label="Show past partnerships section"
                    value={settings.partnerships_visible ?? true}
                    onChange={(partnerships_visible) =>
                      edit({ partnerships_visible })
                    }
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Showcase brands you’ve worked with. Add up to ten
                  collaborations.
                </p>
                {(settings.partnerships ?? []).map((partner, i) => (
                  <div
                    key={i}
                    className="space-y-3 border-t border-gray-100 pt-4"
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
                      <div className="flex items-center gap-2 pb-2">
                        <VisibilitySwitch
                          label={`Show ${partner.brand_name || "partnership"}`}
                          value={partner.is_visible}
                          onChange={(is_visible) =>
                            edit({
                              partnerships: (settings.partnerships ?? []).map(
                                (p, j) => (j === i ? { ...p, is_visible } : p),
                              ),
                            })
                          }
                        />
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          aria-label={`Remove ${partner.brand_name || "partnership"}`}
                          onPress={() => {
                            setPendingRemoval({
                              kind: "partnership",
                              index: i,
                              name: partner.brand_name || "this partnership",
                            });
                          }}
                        >
                          <Trash2 size={18} />
                        </Button>
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
                <Button
                  variant="ghost"
                  className="text-black"
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
              </section>
            ) : (
              <p className="p-5 text-sm text-gray-500">
                Add an account first, then showcase your past partnerships.
              </p>
            )}
          </Tabs.Panel>
          <Tabs.Panel id="rates" className="min-w-0 w-full">
            {settings ? (
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium">Rates</h2>
                  <VisibilitySwitch
                    label="Show rates section"
                    value={settings.rates_visible}
                    onChange={(rates_visible) => edit({ rates_visible })}
                  />
                </div>
                {settings.rates.map((rate, i) => (
                  <div
                    key={i}
                    className="space-y-3 border-t pt-4 border-gray-100"
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
                      <div className="pb-2">
                        {" "}
                        <VisibilitySwitch
                          label="Show this rate"
                          value={rate.is_visible}
                          onChange={(is_visible) =>
                            edit({
                              rates: settings.rates.map((r, j) =>
                                j === i ? { ...r, is_visible } : r,
                              ),
                            })
                          }
                        />
                      </div>
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
                      <label className="flex-1 text-sm">
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
                        className="w-28 shrink-0"
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

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-black"
                      onPress={() =>
                        edit({
                          rates: settings.rates.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove rate
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="text-black"
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
                  Add rate
                </Button>
              </section>
            ) : (
              <p className="text-sm text-gray-500 p-5">
                Add an account first, then set your rates here.
              </p>
            )}
          </Tabs.Panel>
          <Tabs.Panel id="contact" className="min-w-0 w-full">
            {settings ? (
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium">Contact</h2>
                  <VisibilitySwitch
                    label="Show contact section"
                    value={settings.contacts_visible}
                    onChange={(contacts_visible) => edit({ contacts_visible })}
                  />
                </div>
                {settings.contacts.map((c, i) => (
                  <div
                    key={c.kind}
                    className="space-y-3 border-t pt-4 border-gray-100"
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
                          onChange={(value) =>
                            edit({
                              contacts: settings.contacts.map((x, j) =>
                                i === j ? { ...x, value } : x,
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="pb-2">
                        {" "}
                        <VisibilitySwitch
                          label={`Show ${c.kind}`}
                          value={c.is_visible}
                          onChange={(is_visible) =>
                            edit({
                              contacts: settings.contacts.map((x, j) =>
                                i === j ? { ...x, is_visible } : x,
                              ),
                            })
                          }
                        />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-black"
                      onPress={() =>
                        edit({
                          contacts: settings.contacts.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove contact
                    </Button>
                  </div>
                ))}
                <Dropdown>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-black"
                    isDisabled={settings.contacts.length >= 4}
                  >
                    <Plus size={16} />
                    Add contact
                    <ChevronDown size={14} />
                  </Button>
                  <Dropdown.Popover>
                    <Dropdown.Menu
                      aria-label="Add a contact method"
                      onAction={(key) => {
                        const kind = String(key) as Contact["kind"];
                        if (!settings.contacts.some((c) => c.kind === kind))
                          edit({
                            contacts: [
                              ...settings.contacts,
                              { kind, value: "", is_visible: false },
                            ],
                          });
                      }}
                    >
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
                          <Dropdown.Item
                            key={item.kind}
                            id={item.kind}
                            textValue={item.label}
                          >
                            <Label>{item.label}</Label>
                          </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </section>
            ) : (
              <p className="text-sm text-gray-500 p-5">
                Add an account first, then choose your contact methods.
              </p>
            )}
          </Tabs.Panel>
        </Tabs>
      </div>

      <Modal
        isOpen={modalOpen}
        onOpenChange={(open) => {
          if (!busy) setModalOpen(open);
        }}
      >
        <Modal.Backdrop isDismissable={!busy}>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.CloseTrigger isDisabled={busy} />
              <Modal.Header>
                <Modal.Heading>Add an account</Modal.Heading>
              </Modal.Header>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);

                  try {
                    await add({ handle, platform });
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
                <Modal.Body className="space-y-5">
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
                  />

                  <p className="text-xs text-gray-500">
                    Use a public profile. Your data will import automatically
                    and refresh every 24 hours.
                  </p>
                </Modal.Body>
                <Modal.Footer>
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
                    {busy ? "Adding…" : "Add account"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

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
                  {pendingRemoval?.kind === "partnership"
                    ? "Remove partnership?"
                    : "Remove account?"}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-gray-600">
                  {pendingRemoval?.kind === "partnership" ? (
                    <>
                      Remove <strong>{pendingRemoval.name}</strong> from your
                      media kit? Save your changes to update the public page.
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
                    if (pendingRemoval.kind === "partnership") {
                      edit({
                        partnerships: (settings?.partnerships ?? []).filter(
                          (_, i) => i !== pendingRemoval.index,
                        ),
                      });
                      setPendingRemoval(null);
                      toast({
                        title: "Partnership removed",
                        description: "Save changes to update your public page.",
                        color: "info",
                      });
                      return;
                    }
                    setBusy(true);

                    try {
                      await remove({ accountId: pendingRemoval.id });
                      setPendingRemoval(null);
                      toast({ title: "Account removed", color: "success" });
                    } catch (error) {
                      toast({
                        title: "Could not remove account",
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
                  {busy
                    ? "Removing…"
                    : pendingRemoval?.kind === "partnership"
                      ? "Remove partnership"
                      : "Remove account"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
