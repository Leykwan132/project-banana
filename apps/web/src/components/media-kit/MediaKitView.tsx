import { Card, Button, Tag, TagGroup, Tabs } from "@heroui/react";
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
  return (
    <div className="mx-auto max-w-3xl space-y-8 text-gray-900">
      <header className="flex flex-col items-center text-center pt-8 gap-4">
        {kit.photoUrl ? (
          <img
            src={kit.photoUrl}
            alt=""
            className="size-24 rounded-full object-cover ring-4 ring-white"
          />
        ) : (
          <div className="size-24 rounded-full bg-lime-100 grid place-items-center text-3xl">
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
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-normal text-gray-600"
                >
                  <NicheIcon niche={niche} />
                  {niche}
                </Tag>
              ))}
            </TagGroup.List>
          </TagGroup>
        )}
        {kit.bio && (
          <p className="max-w-lg whitespace-pre-line text-gray-500 leading-relaxed">
            {kit.bio}
          </p>
        )}
        {kit.totalAudience !== undefined && (
          <div>
            <p className="text-3xl font-semibold tracking-tight">
              {number(kit.totalAudience)}
            </p>
            <p className="text-sm text-gray-500">Combined audience</p>
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
        <Tabs.ListContainer className="w-full rounded-full">
          <Tabs.List
            aria-label="Explore media kit"
            className="flex w-full flex-row flex-nowrap"
          >
            {[
              { id: "partnerships", label: "Partnerships" },
              { id: "contacts", label: "Contacts" },
              { id: "instagram", label: "Instagram" },
              { id: "tiktok", label: "TikTok" },
            ].map((tab) => (
              <Tabs.Tab
                key={tab.id}
                id={tab.id}
                className="min-w-0 flex-1 px-1 text-xs font-normal text-black sm:px-3 sm:text-sm"
              >
                {tab.label}
                <Tabs.Indicator />
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
                  <Card
                    key={i}
                    className="rounded-2xl border border-gray-100 bg-white p-5 shadow-none"
                  >
                    <h3 className="font-medium">{p.brand_name}</h3>
                    {p.description && (
                      <p className="mt-2 whitespace-pre-line text-sm text-gray-500">
                        {p.description}
                      </p>
                    )}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm font-medium text-black underline underline-offset-4"
                      >
                        View collaboration ↗
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}
          {!kit.partnerships.length && (
            <p className="rounded-2xl bg-gray-100 p-6 text-center text-sm text-gray-500">
              No partnerships to showcase yet.
            </p>
          )}
        </Tabs.Panel>
        <Tabs.Panel id="contacts" className="w-full">
          {!!kit.contacts.length && (
            <div className="flex flex-wrap justify-center gap-2">
              {kit.contacts.map((c) => (
                <Button
                  key={c.kind}
                  variant="ghost"
                  className="text-black"
                  onPress={() =>
                    window.open(c.href, "_blank", "noopener,noreferrer")
                  }
                >
                  <ContactIcon kind={c.kind} />
                  {c.kind === "email"
                    ? "Email"
                    : c.kind === "website"
                      ? "Website"
                      : c.label}
                </Button>
              ))}
            </div>
          )}
          {!kit.contacts.length && (
            <p className="rounded-2xl bg-gray-100 p-6 text-center text-sm text-gray-500">
              No public contact methods yet.
            </p>
          )}
        </Tabs.Panel>
        {(["instagram", "tiktok"] as const).map((platform) => (
          <Tabs.Panel key={platform} id={platform} className="w-full space-y-5">
            {kit.accounts
              .filter((account) => account.platform === platform)
              .map((a) => (
                <Card
                  key={a.id}
                  className="bg-white border border-gray-100 shadow-none rounded-3xl p-6"
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
                            <p className="text-xs text-gray-500 mt-1">
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
                            className="aspect-square overflow-hidden rounded-xl bg-gray-50"
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
            {!kit.accounts.some((account) => account.platform === platform) && (
              <p className="rounded-2xl bg-gray-100 p-6 text-center text-sm text-gray-500">
                No public {platform === "instagram" ? "Instagram" : "TikTok"}{" "}
                accounts yet.
              </p>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
      {!!kit.rates.length && (
        <section>
          <h2 className="font-semibold mb-4">Work with me</h2>
          <div className="space-y-3">
            {kit.rates.map((r, i) => (
              <Card
                key={i}
                className="bg-white shadow-none border border-gray-100 p-5 rounded-2xl"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{r.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {r.description}
                    </p>
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
      <footer className="text-center text-xs text-gray-400 pb-8 pt-6">
        Media kit by{" "}
        <a href="/" className="font-semibold text-gray-700">
          lumina
        </a>
      </footer>
    </div>
  );
}
