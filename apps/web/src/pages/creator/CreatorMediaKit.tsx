import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Button, Card, Label, Switch } from "@heroui/react";
import { Instagram } from "lucide-react";
import { api } from "../../../../../packages/backend/convex/_generated/api";
import {
  contactHref,
  projectAccount,
} from "../../../../../packages/backend/convex/lib/mediaKitModel";
import type {
  Settings,
  Contact,
} from "../../../../../packages/backend/convex/lib/mediaKitModel";
import {
  MediaKitView,
  type KitView,
} from "../../components/media-kit/MediaKitView";
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
  const data = useQuery(api.mediaKits.getEditor, {});
  const add = useMutation(api.mediaKits.addAccount);
  const save = useMutation(api.mediaKits.saveSettings);
  const publish = useMutation(api.mediaKits.setPublished);
  const display = useMutation(api.mediaKits.setAccountDisplay);
  const primary = useMutation(api.mediaKits.setPrimaryAccount);
  const refresh = useMutation(api.mediaKits.requestRefresh);
  const remove = useMutation(api.mediaKits.removeAccount);
  const [handle, setHandle] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (data?.kit && !dirty) {
      const k = data.kit;
      setSettings({
        slug: k.slug,
        display_name: k.display_name,
        bio: k.bio,
        category: k.category,
        total_audience_visible: k.total_audience_visible,
        rates_visible: k.rates_visible,
        contacts_visible: k.contacts_visible,
        rates: k.rates,
        contacts: k.contacts,
      });
    }
  }, [data, dirty]);
  const run = async (fn: () => Promise<unknown>, success = "Saved") => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  const edit = (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    setDirty(true);
  };
  if (data === undefined)
    return (
      <p role="status" className="p-8">
        Loading your media kit…
      </p>
    );
  const preview: KitView | null = settings
    ? {
        slug: settings.slug,
        displayName: settings.display_name,
        bio: settings.bio,
        category: settings.category,
        photoUrl:
          (
            data.accounts.find(
              (x) =>
                x.account.is_visible &&
                x.account._id === data.kit?.primary_account_id,
            ) ?? data.accounts.find((x) => x.account.is_visible)
          )?.avatarUrl ?? null,
        accounts: data.accounts
          .filter((x) => x.account.is_visible && x.account.snapshot)
          .map(({ account: a, avatarUrl, postImages }) =>
            (() => {
              const { posts, ...projection } = projectAccount(
                a.snapshot!,
                a.metric_visibility,
              );
              return {
                ...projection,
                id: a._id,
                handle: a.handle,
                updatedAt: a.last_success_at ?? 0,
                avatarUrl,
                ...(a.metric_visibility.recentPosts
                  ? {
                      posts: posts?.map((p, i) => ({
                        ...p,
                        imageUrl: postImages[i] ?? null,
                      })),
                    }
                  : {}),
              };
            })(),
          ),
        rates: settings.rates_visible
          ? settings.rates.filter((r) => r.is_visible)
          : [],
        contacts: settings.contacts_visible
          ? settings.contacts
              .filter((c) => c.is_visible)
              .flatMap((c) => {
                try {
                  return [
                    { kind: c.kind, label: c.value, href: contactHref(c) },
                  ];
                } catch {
                  return [];
                }
              })
          : [],
        ...(settings.total_audience_visible &&
        data.accounts.some(
          (x) =>
            x.account.is_visible && x.account.snapshot?.followers !== undefined,
        )
          ? {
              totalAudience: data.accounts
                .filter((x) => x.account.is_visible)
                .reduce(
                  (sum, x) => sum + (x.account.snapshot?.followers ?? 0),
                  0,
                ),
            }
          : {}),
      }
    : null;
  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media Kit</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your audience, your work, your public introduction.
          </p>
        </div>
        {settings && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
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
      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl bg-gray-100 px-4 py-3 text-sm"
        >
          {message}
        </p>
      )}
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <Card className="p-5 shadow-none border border-gray-100 space-y-4">
            <h2 className="font-semibold">Instagram accounts</h2>
            <p className="text-xs text-gray-500">
              Add up to five public accounts. Data refreshes every 24 hours,
              including hidden accounts.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await add({ handle });
                  setHandle("");
                }, "Import queued");
              }}
            >
              <input
                aria-label="Instagram username or profile URL"
                placeholder="@username or Instagram profile URL"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className={inputClass}
              />
              <Button
                type="submit"
                isDisabled={busy || !handle.trim() || data.accounts.length >= 5}
              >
                Import
              </Button>
            </form>
            {data.accounts.map(({ account: a, job }) => (
              <div
                key={a._id}
                className="border-t border-gray-100 pt-4 space-y-3"
              >
                <div className="flex justify-between gap-2">
                  <h3 className="flex min-w-0 items-center gap-2 font-medium">
                    <Instagram
                      size={18}
                      className="shrink-0 text-gray-500"
                      aria-hidden="true"
                    />
                    <span className="truncate">@{a.handle}</span>
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={busy || data.kit?.primary_account_id === a._id}
                    onPress={() => run(() => primary({ accountId: a._id }))}
                  >
                    {data.kit?.primary_account_id === a._id
                      ? "Primary"
                      : "Use as primary"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={busy}
                    onPress={() =>
                      run(() => remove({ accountId: a._id }), "Account removed")
                    }
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {job && ["queued", "running", "failed"].includes(job.status)
                    ? `Import ${job.status}`
                    : a.last_success_at
                      ? `Updated ${new Date(a.last_success_at).toLocaleString()}`
                      : "No imported data yet"}
                  {job?.error_message ? ` · ${job.error_message}` : ""}
                </p>
                <Toggle
                  label="Show this account"
                  value={a.is_visible}
                  disabled={busy}
                  onChange={(isVisible) =>
                    run(() =>
                      display({
                        accountId: a._id,
                        isVisible,
                        metricVisibility: a.metric_visibility,
                      }),
                    )
                  }
                />
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
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={
                    busy ||
                    !!(job && ["queued", "running"].includes(job.status)) ||
                    Date.now() < a.refresh_available_at
                  }
                  onPress={() =>
                    run(() => refresh({ accountId: a._id }), "Refresh queued")
                  }
                >
                  Refresh data
                </Button>
              </div>
            ))}
          </Card>
          {settings && (
            <>
              <Card className="p-5 shadow-none border border-gray-100 space-y-4">
                <h2 className="font-semibold">Your introduction</h2>
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
                  variant="secondary"
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
                <Toggle
                  label="Show combined audience"
                  value={settings.total_audience_visible}
                  onChange={(total_audience_visible) =>
                    edit({ total_audience_visible })
                  }
                />
              </Card>
              <Card className="p-5 shadow-none border border-gray-100 space-y-4">
                <h2 className="font-semibold">Rates</h2>
                <Toggle
                  label="Show rates section"
                  value={settings.rates_visible}
                  onChange={(rates_visible) => edit({ rates_visible })}
                />
                {settings.rates.map((rate, i) => (
                  <div
                    key={i}
                    className="space-y-3 border-t pt-4 border-gray-100"
                  >
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
                      <label className="text-sm">
                        Currency
                        <select
                          aria-label="Currency"
                          className={inputClass}
                          value={rate.currency}
                          onChange={(e) =>
                            edit({
                              rates: settings.rates.map((r, j) =>
                                j === i
                                  ? {
                                      ...r,
                                      currency: e.target
                                        .value as typeof r.currency,
                                    }
                                  : r,
                              ),
                            })
                          }
                        >
                          {["MYR", "USD", "SGD"].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
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
                    <Toggle
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
                    <Button
                      size="sm"
                      variant="ghost"
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
                  variant="secondary"
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
              </Card>
              <Card className="p-5 shadow-none border border-gray-100 space-y-4">
                <h2 className="font-semibold">Contact</h2>
                <Toggle
                  label="Show contact section"
                  value={settings.contacts_visible}
                  onChange={(contacts_visible) => edit({ contacts_visible })}
                />
                {settings.contacts.map((c, i) => (
                  <div
                    key={c.kind}
                    className="space-y-3 border-t pt-4 border-gray-100"
                  >
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
                    <Toggle
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
                    <Button
                      size="sm"
                      variant="ghost"
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
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "email",
                      "whatsapp",
                      "website",
                      "instagram",
                    ] as Contact["kind"][]
                  )
                    .filter(
                      (kind) => !settings.contacts.some((c) => c.kind === kind),
                    )
                    .map((kind) => (
                      <Button
                        key={kind}
                        size="sm"
                        variant="secondary"
                        onPress={() =>
                          edit({
                            contacts: [
                              ...settings.contacts,
                              { kind, value: "", is_visible: false },
                            ],
                          })
                        }
                      >
                        Add {kind}
                      </Button>
                    ))}
                </div>
              </Card>
            </>
          )}
        </div>
        <aside className="lg:sticky lg:top-8 rounded-3xl border border-gray-100 bg-[#fafaf8] p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 text-center">
            Live preview · save to update your public page
          </p>
          {preview ? (
            <MediaKitView kit={preview} />
          ) : (
            <p className="text-center text-sm text-gray-400 py-24">
              Import your first account to start.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
