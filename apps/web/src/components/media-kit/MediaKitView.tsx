import { Info, Heart, MessageCircle, Play, ChevronDown, ArrowRight } from "lucide-react";
import { useState } from "react";
import luminaIcon from "../../assets/icon.svg";
import { Card, Button, Tabs, Modal, Tooltip } from "@heroui/react";
import { FacebookStats } from "./FacebookStats";
import { InstagramStats } from "./InstagramStats";
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
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [selectedPartnership, setSelectedPartnership] = useState<KitView["partnerships"][number] | null>(null);
  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 space-y-8 text-gray-100">
      <header className="flex flex-col items-center text-center">
        <div className="pb-8">
        {kit.photoUrl ? (
          <img
            src={kit.photoUrl}
            alt=""
            className="size-28 sm:size-32 rounded-full object-cover ring-4 ring-gray-800"
          />
        ) : (
          <div className="size-28 sm:size-32 rounded-full bg-gray-800 grid place-items-center text-3xl">
            {kit.displayName.slice(0, 1)}
          </div>
        )}
        </div>
        <div className="flex flex-col items-center gap-2.5">
        {kit.category && (
          <ul aria-label="Influencer niches" className="flex flex-wrap justify-center gap-2">

              {[
                ...new Set(
                  kit.category
                    .split(",")
                    .map((niche) => niche.trim())
                    .filter(Boolean),
                ),
              ].map((niche) => (
                <li
                  key={niche}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-[10px] font-normal text-gray-300 [&_svg]:size-3"
                >
                  <NicheIcon niche={niche} />
                  {niche}
                </li>
              ))}

          </ul>
        )}
        <h1 className="text-4xl font-semibold tracking-tight">
          {kit.displayName}
        </h1>
        {kit.bio && (
          <p className="max-w-lg whitespace-pre-line text-gray-400 leading-relaxed">
            {kit.bio}
          </p>
        )}
        </div>
      </header>
      <Tabs
        defaultSelectedKey={
          kit.accounts.some((account) => account.platform === "instagram")
            ? "instagram"
            : kit.accounts.some((account) => account.platform === "tiktok")
              ? "tiktok"
              : kit.accounts.some((account) => account.platform === "facebook")
                ? "facebook"
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
              { id: "facebook", label: "Facebook" },
              { id: "partnerships", label: "Partnerships" },
              { id: "rates", label: "Rates" },
            ]
              .filter(
                (tab) =>
                  !["instagram", "tiktok", "facebook"].includes(tab.id) ||
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
              <div className="flex flex-wrap items-start gap-6">
                {kit.partnerships.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedPartnership(p)}
                    aria-label={`View ${p.brand_name} partnership details`}
                    className="group flex w-fit max-w-40 flex-none flex-col items-center gap-3 rounded-2xl p-2 text-gray-100 transition-colors hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-300"
                  >
                    {p.logo_url ? (
                      <img
                        src={p.logo_url}
                        alt=""
                        className="size-24 rounded-full bg-neutral-100 object-contain p-4 transition-transform group-hover:scale-105 motion-reduce:transform-none"
                      />
                    ) : (
                      <span aria-hidden="true" className="grid size-24 place-items-center rounded-full bg-neutral-800 text-3xl font-semibold transition-colors group-hover:bg-neutral-700">
                        {p.brand_name.slice(0, 1)}
                      </span>
                    )}
                    <h3 className="max-w-full break-words text-center text-sm font-medium">{p.brand_name}</h3>
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
        {(["instagram", "tiktok", "facebook"] as const)
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
                    className="bg-[#171717] text-gray-100 border border-gray-700 shadow-none rounded-3xl p-6 transition-colors hover:bg-neutral-800"
                    onClick={(event) => {
                      if ((event.target as Element).closest("a, button, input, select, textarea")) return;
                      setExpandedAccounts((current) => {
                        const next = new Set(current);
                        if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                        return next;
                      });
                    }}
                  >
                    <div className="flex w-full items-center gap-3">
                      {a.platform !== "instagram" && a.avatarUrl && (
                        <img
                          src={a.avatarUrl}
                          alt=""
                          className="size-11 rounded-full object-cover"
                        />
                      )}
                      <PlatformIcon platform={a.platform} size={24} />
                      <div className="flex min-w-0 flex-col justify-center gap-2">
                        <a href={accountProfileUrl(a.handle, a.platform)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-sm font-semibold leading-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
                          <span>{a.platform === "facebook" ? a.displayName : `@${a.handle}`}</span>
                        </a>
                        {a.followers !== undefined && <p className="text-xs leading-none text-gray-400">{number(a.followers)} followers</p>}
                      </div>
                      <button
                        type="button"
                        aria-label={`${expandedAccounts.has(a.id) ? "Collapse" : "Expand"} account details`}
                        aria-expanded={expandedAccounts.has(a.id)}
                        aria-controls={`account-details-${a.id}`}
                        onClick={() => setExpandedAccounts((current) => {
                          const next = new Set(current);
                          if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                          return next;
                        })}
                        className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                      <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-gray-400 transition-transform motion-reduce:transition-none ${expandedAccounts.has(a.id) ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    <div id={`account-details-${a.id}`} hidden={!expandedAccounts.has(a.id)} className="space-y-6">
                      {a.platform === "facebook" ? <FacebookStats account={a} /> : a.insightWindows?.length ? <InstagramStats account={a} /> : (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-10 py-6 sm:grid-cols-3 sm:gap-x-12 sm:gap-y-12">
                        {(
                          [
                            ["followers", "Followers"],
                            ["pageLikes", "Page likes"],
                            ["mediaViews", "Media views"],
                            ["postCount", "Lifetime Posts"],
                            ["engagementRate", "Engagement"],
                            ["averageLikes", "Average likes"],
                            ["averageComments", "Average comments"],
                            ["averageVideoViews", "Average video views"],
                          ] as const
                        ).map(([key, label]) =>
                          a[key] === undefined ? null : (
                            <div key={key} className="text-center">
                              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                {key === "engagementRate"
                                  ? `${a[key]!.toFixed(2)}%`
                                  : number(a[key]!)}
                              </p>
                              <div className="mt-1 flex min-h-5 items-center justify-center gap-1.5 whitespace-nowrap text-xs leading-5 text-gray-400">
                                <span>{label}</span>
                                {(key === "averageLikes" || key === "averageComments" || key === "averageVideoViews") && (
                                  <Tooltip>
                                    <Tooltip.Trigger>
                                      <button type="button" aria-label={`How ${label.toLowerCase()} is calculated`} className="inline-flex size-4 translate-y-px shrink-0 items-center justify-center self-center rounded-full p-0 leading-none text-gray-400 hover:text-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300">
                                        <Info size={14} aria-hidden="true" />
                                      </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content placement="top" showArrow className="max-w-64 rounded-xl bg-neutral-800 px-3 py-2 text-xs leading-relaxed text-gray-100 shadow-lg">
                                      {key === "averageLikes"
                                        ? `Total likes divided by ${a.likesSampleSize ?? "the number of"} posts.`
                                        : key === "averageComments"
                                          ? `Total comments divided by ${a.commentsSampleSize ?? "the number of"} posts.`
                                          : `Total video views divided by ${a.videoSampleSize ?? "the number of"} videos.`}
                                    </Tooltip.Content>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                      )}
                      {!!a.posts?.length && (
                        <section className="space-y-4" aria-label="Latest videos">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-semibold">Latest Video</h4>
                            <a href={accountProfileUrl(a.handle, a.platform)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-sm text-sm text-gray-400 hover:text-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2">
                              Show all <ArrowRight size={16} aria-hidden="true" />
                            </a>
                          </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          {a.posts.slice(0, 3).map((p) => (
                            <a
                              key={p.id}
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-800"
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
                              {(p.likes !== undefined || p.comments !== undefined || p.views !== undefined) && (
                                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-gradient-to-t from-black/90 to-transparent px-2 pb-3 pt-8 text-[10px] font-medium text-white sm:text-xs">
                                  {p.views !== undefined && <span aria-label={`${p.views} views`} className="inline-flex items-center gap-1"><Play size={12} aria-hidden="true" />{number(p.views)}</span>}
                                  {p.likes !== undefined && <span aria-label={`${p.likes} likes`} className="inline-flex items-center gap-1"><Heart size={12} aria-hidden="true" />{number(p.likes)}</span>}
                                  {p.comments !== undefined && <span aria-label={`${p.comments} comments`} className="inline-flex items-center gap-1"><MessageCircle size={12} aria-hidden="true" />{number(p.comments)}</span>}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                        </section>
                      )}
                    </div>
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
              <Modal.CloseTrigger className="bg-neutral-800! text-gray-100! hover:bg-neutral-700!" />
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
