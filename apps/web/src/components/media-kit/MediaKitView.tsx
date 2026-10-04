import { useState } from "react";
import luminaIcon from "../../assets/icon.svg";
import { Card, Button, Tag, TagGroup, Tabs, Modal } from "@heroui/react";
import { NicheIcon } from "./NicheIcon";
import { ContactIcon } from "./ContactIcon";
import { PlatformIcon } from "./PlatformIcon";
import { accountProfileUrl } from "../../../../../packages/backend/convex/lib/mediaKitModel";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../../packages/backend/convex/_generated/api";
export type KitView = NonNullable<
  FunctionReturnType<typeof api.mediaKits.getPublic>
>;
const number = (n: number) =>
  Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
export function MediaKitView({ kit }: { kit: KitView }) {
  const [selectedPartnership, setSelectedPartnership] = useState<KitView["partnerships"][number] | null>(null);
  return (
    <div className="mx-auto max-w-3xl space-y-8 text-gray-100">
      <header className="flex flex-col items-center text-center pt-8 gap-4">
        {kit.photoUrl ? (
          <img
            src={kit.photoUrl}
            alt=""
            className="size-24 rounded-full object-cover ring-4 ring-gray-800"
          />
        ) : (
          <div className="size-24 rounded-full bg-gray-800 grid place-items-center text-3xl">
            {kit.displayName.slice(0, 1)}
          </div>
        )}
        <h1 className="text-4xl font-semibold tracking-tight">
          {kit.displayName}
        </h1>
        {kit.category && (
          <TagGroup aria-label="Influencer niches">
            <TagGroup.List className="flex flex-wrap justify-center gap-2">
              {[
                ...new Set(
                  kit.category
                    .split(",")
                    .map((niche) => niche.trim())
                    .filter(Boolean),
                ),
              ].map((niche) => (
                <Tag
                  key={niche}
                  id={niche}
                  textValue={niche}
                  className="rounded-full bg-gray-800 px-3 py-1 text-xs font-normal text-gray-300"
                >
                  <NicheIcon niche={niche} />
                  {niche}
                </Tag>
              ))}
            </TagGroup.List>
          </TagGroup>
        )}
        {kit.bio && (
          <p className="max-w-lg whitespace-pre-line text-gray-400 leading-relaxed">
            {kit.bio}
          </p>
        )}
        {kit.totalAudience !== undefined && (
          <div>
            <p className="text-3xl font-semibold tracking-tight">
              {number(kit.totalAudience)}
            </p>
            <p className="text-sm text-gray-400">Combined audience</p>
          </div>
        )}
      </header>
      <Tabs
        defaultSelectedKey={
          kit.accounts.some((account) => account.platform === "instagram")
            ? "instagram"
            : kit.accounts.some((account) => account.platform === "tiktok")
              ? "tiktok"
              : "partnerships"
        }
        className="w-full gap-6"
      >
        <Tabs.ListContainer className="mx-auto w-fit max-w-full rounded-full bg-[#171717]">
          <Tabs.List
            aria-label="Explore media kit"
            className="flex min-w-0 w-fit flex-row flex-nowrap rounded-full bg-[#171717] p-1"
          >
            {[
              { id: "instagram", label: "Instagram" },
              { id: "tiktok", label: "TikTok" },
              { id: "partnerships", label: "Partnerships" },
              { id: "rates", label: "Rates" },
            ]
              .filter(
                (tab) =>
                  (tab.id !== "instagram" && tab.id !== "tiktok") ||
                  kit.accounts.some((account) => account.platform === tab.id),
              )
              .map((tab) => (
                <Tabs.Tab
                  key={tab.id}
                  id={tab.id}
                  className="h-8 min-w-0 w-auto flex-initial whitespace-nowrap rounded-full px-2 text-xs font-normal text-gray-400 opacity-80 hover:opacity-100 data-[selected=true]:text-black data-[selected=true]:opacity-100 sm:h-9 sm:px-4 sm:text-sm"
                >
                  {tab.label}
                  <Tabs.Indicator className="rounded-full bg-gray-200 shadow-none duration-[320ms] motion-reduce:duration-0" />
                </Tabs.Tab>
              ))}
          </Tabs.List>
        </Tabs.ListContainer>
        <Tabs.Panel id="partnerships" className="w-full">
          {!!kit.partnerships?.length && (
            <section>
              <h2 className="mb-4 font-semibold">Past partnerships</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {kit.partnerships.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPartnership(p)}
                    aria-label={`View ${p.brand_name} partnership details`}
                    className="flex min-h-36 flex-col items-center justify-center gap-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-6 text-gray-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-300"
                  >
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt=""
                        className="size-14 rounded-xl bg-white object-contain p-2"
                      />
                    ) : (
                      <span aria-hidden="true" className="grid size-14 place-items-center rounded-xl bg-neutral-800 text-xl font-semibold">
                        {p.brand_name.slice(0, 1)}
                      </span>
                    )}
                    <h3 className="font-medium">{p.brand_name}</h3>
                  </button>
                ))}
              </div>
            </section>
          )}
          {!kit.partnerships.length && (
            <p className="rounded-2xl bg-gray-800 p-6 text-center text-sm text-gray-400">
              No partnerships to showcase yet.
            </p>
          )}
        </Tabs.Panel>
        {(["instagram", "tiktok"] as const)
          .filter((platform) =>
            kit.accounts.some((account) => account.platform === platform),
          )
          .map((platform) => (
            <Tabs.Panel
              key={platform}
              id={platform}
              className="w-full space-y-5"
            >
              {kit.accounts
                .filter((account) => account.platform === platform)
                .map((a) => (
                  <Card
                    key={a.id}
                    className="bg-[#171717] text-gray-100 border border-gray-700 shadow-none rounded-3xl p-6"
                  >
                    <Card.Header className="flex-row items-center gap-3">
                      {a.avatarUrl && (
                        <img
                          src={a.avatarUrl}
                          alt=""
                          className="size-11 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <a
                          href={accountProfileUrl(a.handle, a.platform)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-semibold"
                        >
                          <PlatformIcon platform={a.platform} size={17} />@
                          {a.handle}
                        </a>
                        <p className="text-xs text-gray-400 mt-1">
                          {a.platform === "tiktok" ? "TikTok" : "Instagram"} ·
                          Updated {new Date(a.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Card.Header>
                    <Card.Content className="space-y-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4">
                        {(
                          [
                            ["followers", "Followers"],
                            ["postCount", "Posts"],
                            ["engagementRate", "Engagement"],
                            ["averageLikes", "Average likes"],
                            ["averageComments", "Average comments"],
                            ["averageVideoViews", "Average video views"],
                          ] as const
                        ).map(([key, label]) =>
                          a[key] === undefined ? null : (
                            <div key={key}>
                              <p className="text-xl font-semibold">
                                {key === "engagementRate"
                                  ? `${a[key]!.toFixed(2)}%`
                                  : number(a[key]!)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {label}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                      {(a.engagementSampleSize !== undefined ||
                        a.videoSampleSize !== undefined ||
                        a.likesSampleSize !== undefined ||
                        a.commentsSampleSize !== undefined) && (
                        <p className="text-xs text-gray-400">
                          Recent sampled posts
                          {a.likesSampleSize !== undefined
                            ? ` · Likes based on ${a.likesSampleSize} posts`
                            : ""}
                          {a.commentsSampleSize !== undefined
                            ? ` · Comments based on ${a.commentsSampleSize} posts`
                            : ""}
                          {a.engagementSampleSize !== undefined
                            ? ` · Engagement based on ${a.engagementSampleSize} posts`
                            : ""}
                          {a.videoSampleSize !== undefined
                            ? ` · Video average based on ${a.videoSampleSize} videos`
                            : ""}
                          . Public data; not platform Insights.
                        </p>
                      )}
                      {!!a.posts?.length && (
                        <div className="grid grid-cols-3 gap-2">
                          {a.posts.map((p) => (
                            <a
                              key={p.id}
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="aspect-square overflow-hidden rounded-xl bg-gray-800"
                              aria-label={p.caption || "View post"}
                            >
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.caption.slice(0, 100)}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-xs text-gray-400 p-3">
                                  View post ↗
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </Card.Content>
                  </Card>
                ))}
              {!kit.accounts.some(
                (account) => account.platform === platform,
              ) && (
                <p className="rounded-2xl bg-gray-800 p-6 text-center text-sm text-gray-400">
                  No public {platform === "instagram" ? "Instagram" : "TikTok"}{" "}
                  accounts yet.
                </p>
              )}
            </Tabs.Panel>
          ))}
        <Tabs.Panel id="rates" className="w-full">
          {!!kit.rates.length && (
            <section>
              <h2 className="font-semibold mb-4">Rates</h2>
              <div className="space-y-3">
                {kit.rates.map((r, i) => (
                  <Card
                    key={i}
                    className="bg-[#171717] text-gray-100 shadow-none border border-gray-700 p-5 rounded-2xl"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium">{r.name}</h3>
                        {r.description && (
                          <p className="text-sm text-gray-400 mt-1">
                            {r.description}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 font-semibold text-sm">
                        {r.starting_from ? "From " : ""}
                        {Intl.NumberFormat("en", {
                          style: "currency",
                          currency: r.currency,
                        }).format(r.amount_minor / 100)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
          {!kit.rates.length && (
            <p className="rounded-2xl bg-gray-800 p-6 text-center text-sm text-gray-400">
              No public rates yet.
            </p>
          )}
        </Tabs.Panel>
      </Tabs>
      {!!kit.contacts.length && (
        <nav
          aria-label="Contact methods"
          className="flex flex-wrap justify-center gap-3 pt-4"
        >
          {kit.contacts.map((contact) => {
            const label =
              contact.kind === "email"
                ? "Email"
                : contact.kind === "whatsapp"
                  ? "WhatsApp"
                  : contact.kind === "instagram"
                    ? "Instagram DM"
                    : "Website";
            const color = "bg-gray-800 text-gray-100 hover:bg-gray-700";
            return (
              <Button
                key={contact.kind}
                isIconOnly
                variant="ghost"
                aria-label={label}
                className={`size-11 rounded-full ${color}`}
                onPress={() =>
                  window.open(contact.href, "_blank", "noopener,noreferrer")
                }
              >
                <ContactIcon kind={contact.kind} size={21} />
              </Button>
            );
          })}
        </nav>
      )}
      <Modal
        isOpen={selectedPartnership !== null}
        onOpenChange={(open) => { if (!open) setSelectedPartnership(null); }}
      >
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm">
            <Modal.Dialog className="rounded-3xl border border-neutral-700 bg-neutral-900 text-gray-100">
              <Modal.CloseTrigger className="text-gray-100" />
              <Modal.Header>
                {selectedPartnership?.logo_url && (
                  <img
                    src={selectedPartnership.logo_url}
                    alt=""
                    className="mb-4 size-16 rounded-xl bg-white object-contain p-2"
                  />
                )}
                <Modal.Heading>{selectedPartnership?.brand_name}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
                  {selectedPartnership?.description || "Past brand collaboration."}
                </p>
                {selectedPartnership?.url && (
                  <a
                    href={selectedPartnership.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex text-sm font-medium text-gray-100 underline underline-offset-4"
                  >
                    View collaboration ↗
                  </a>
                )}
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <footer className="pb-8 pt-6 text-center">
        <a
          href="/"
          aria-label="Powered by Lumina"
          className="inline-flex items-center gap-2 text-xs text-gray-400"
        >
          <span>Powered by</span>
          <img src={luminaIcon} alt="Lumina" className="size-6" />
        </a>
      </footer>
    </div>
  );
}
