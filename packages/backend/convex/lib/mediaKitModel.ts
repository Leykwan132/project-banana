export const DAY = 86_400_000;
export const defaultMetrics = {
  followers: true,
  postCount: true,
  engagementRate: true,
  averageLikes: true,
  averageComments: true,
  averageVideoViews: true,
  recentPosts: true,
};
export type MetricVisibility = typeof defaultMetrics;
export type Rate = {
  name: string;
  description: string;
  amount_minor: number;
  currency: "MYR" | "USD" | "SGD";
  starting_from: boolean;
  is_visible: boolean;
};
export type Contact = {
  kind: "email" | "whatsapp" | "website" | "instagram";
  value: string;
  is_visible: boolean;
};
export type Partnership = {
  logo_url?: string;
  brand_name: string;
  description: string;
  url: string;
  is_visible: boolean;
};
export type Settings = {
  partnerships?: Partnership[];
  partnerships_visible?: boolean;
  slug: string;
  display_name: string;
  bio: string;
  category: string;
  total_audience_visible: boolean;
  rates_visible: boolean;
  contacts_visible: boolean;
  rates: Rate[];
  contacts: Contact[];
};
export type Post = {
  id: string;
  url: string;
  caption: string;
  timestamp?: number;
  likes?: number;
  comments?: number;
  views?: number;
  imageUrl?: string;
  imageStorageId?: string;
};
export type ProfileSnapshot = {
  displayName: string;
  biography: string;
  category: string;
  verified: boolean;
  profileImageUrl?: string;
  avatarStorageId?: string;
  followers?: number;
  postCount?: number;
  averageLikes?: number;
  averageComments?: number;
  averageVideoViews?: number;
  engagementRate?: number;
  engagementSampleSize: number;
  videoSampleSize: number;
  likesSampleSize: number;
  commentsSampleSize: number;
  posts: Post[];
};
export type PublicAccount = {
  displayName: string;
  biography: string;
  verified: boolean;
  followers?: number;
  postCount?: number;
  averageLikes?: number;
  averageComments?: number;
  averageVideoViews?: number;
  engagementRate?: number;
  engagementSampleSize?: number;
  videoSampleSize?: number;
  likesSampleSize?: number;
  commentsSampleSize?: number;
  posts?: Omit<Post, "imageUrl" | "imageStorageId">[];
};
export function normalizeInstagramHandle(input: string): string {
  let handle = input.trim();
  if (/^https?:\/\//i.test(handle)) {
    const url = new URL(handle);
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new Error("Enter an Instagram profile URL or username.");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1)
      throw new Error("Enter a profile, not a post or reel.");
    handle = parts[0];
  }
  handle = handle.replace(/^@/, "").toLowerCase();
  if (
    !/^[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?$/.test(handle) ||
    /\.\./.test(handle) ||
    ["p", "reel", "reels", "stories", "explore", "accounts"].includes(handle)
  )
    throw new Error("Enter a valid Instagram username.");
  return handle;
}
export function validateSlug(input: string): string {
  const slug = input.trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) ||
    [
      "admin",
      "support",
      "login",
      "lumina",
      "creator",
      "business",
      "api",
    ].includes(slug)
  )
    throw new Error(
      "Use 3–40 letters, numbers or hyphens for your public link.",
    );
  return slug;
}
function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}
const count = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
const mean = (values: number[]): number | undefined =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined;
export function normalizeProfile(
  raw: unknown,
  expectedHandle: string,
): ProfileSnapshot {
  if (!raw || typeof raw !== "object")
    throw new Error("Instagram returned no profile.");
  const r = raw as Record<string, unknown>;
  if (
    r.error ||
    r.errorMessage ||
    r.private === true ||
    r.isPrivate === true ||
    r.username !== expectedHandle
  )
    throw new Error(
      "This profile is unavailable or private. Check the username and try again.",
    );
  const posts = (Array.isArray(r.latestPosts) ? r.latestPosts : [])
    .slice(0, 12)
    .flatMap((value): Post[] => {
      if (!value || typeof value !== "object") return [];
      const p = value as Record<string, unknown>;
      const code = text(p.shortCode, 100);
      if (!/^[A-Za-z0-9_-]+$/.test(code)) return [];
      const timestamp =
        typeof p.timestamp === "string" ? Date.parse(p.timestamp) : undefined;
      const views =
        p.type === "Video"
          ? count(p.videoViewCount ?? p.videoPlayCount)
          : undefined;
      return [
        {
          id: text(p.id, 100) || code,
          url: `https://www.instagram.com/p/${code}/`,
          caption: text(p.caption, 1000),
          ...(timestamp !== undefined && Number.isFinite(timestamp)
            ? { timestamp }
            : {}),
          ...(count(p.likesCount) !== undefined
            ? { likes: count(p.likesCount) }
            : {}),
          ...(count(p.commentsCount) !== undefined
            ? { comments: count(p.commentsCount) }
            : {}),
          ...(views !== undefined ? { views } : {}),
          ...(typeof p.displayUrl === "string"
            ? { imageUrl: p.displayUrl }
            : {}),
        },
      ];
    })
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  const complete = posts.filter(
    (p) => p.likes !== undefined && p.comments !== undefined,
  );
  const videos = posts.flatMap((p) => (p.views === undefined ? [] : [p.views]));
  const followers = count(r.followersCount);
  const result: ProfileSnapshot = {
    displayName: text(r.fullName, 100) || expectedHandle,
    biography: text(r.biography, 1000),
    category: text(r.businessCategoryName, 100),
    verified: r.verified === true || r.isVerified === true,
    engagementSampleSize: complete.length,
    videoSampleSize: videos.length,
    likesSampleSize: posts.filter((p) => p.likes !== undefined).length,
    commentsSampleSize: posts.filter((p) => p.comments !== undefined).length,
    posts,
  };
  const optional = {
    followers,
    postCount: count(r.postsCount),
    profileImageUrl:
      typeof r.profilePicUrlHd === "string"
        ? r.profilePicUrlHd
        : typeof r.profilePicUrl === "string"
          ? r.profilePicUrl
          : undefined,
    averageLikes: mean(
      posts.flatMap((p) => (p.likes === undefined ? [] : [p.likes])),
    ),
    averageComments: mean(
      posts.flatMap((p) => (p.comments === undefined ? [] : [p.comments])),
    ),
    averageVideoViews: mean(videos),
    engagementRate:
      followers && complete.length
        ? (mean(complete.map((p) => p.likes! + p.comments!))! / followers) * 100
        : undefined,
  };
  for (const [key, value] of Object.entries(optional))
    if (value !== undefined) Object.assign(result, { [key]: value });
  return result;
}
export function projectAccount(
  snapshot: ProfileSnapshot,
  switches: MetricVisibility,
): PublicAccount {
  const result: PublicAccount = {
    displayName: snapshot.displayName,
    biography: snapshot.biography,
    verified: snapshot.verified,
  };
  for (const key of [
    "followers",
    "postCount",
    "averageLikes",
    "averageComments",
    "averageVideoViews",
    "engagementRate",
  ] as const)
    if (switches[key] && snapshot[key] !== undefined)
      result[key] = snapshot[key];
  if (switches.engagementRate && snapshot.engagementRate !== undefined)
    result.engagementSampleSize = snapshot.engagementSampleSize;
  if (switches.averageLikes && snapshot.averageLikes !== undefined)
    result.likesSampleSize = snapshot.likesSampleSize;
  if (switches.averageComments && snapshot.averageComments !== undefined)
    result.commentsSampleSize = snapshot.commentsSampleSize;
  if (switches.averageVideoViews && snapshot.averageVideoViews !== undefined)
    result.videoSampleSize = snapshot.videoSampleSize;
  if (switches.recentPosts)
    result.posts = snapshot.posts.slice(0, 6).map((p) => ({
      id: p.id,
      url: p.url,
      caption: p.caption,
      ...(p.timestamp !== undefined ? { timestamp: p.timestamp } : {}),
      ...(switches.averageLikes && p.likes !== undefined
        ? { likes: p.likes }
        : {}),
      ...(switches.averageComments && p.comments !== undefined
        ? { comments: p.comments }
        : {}),
      ...(switches.averageVideoViews && p.views !== undefined
        ? { views: p.views }
        : {}),
    }));
  return result;
}
export function contactHref(contact: Contact): string {
  const value = contact.value.trim();
  if (/[\r\n]/.test(value))
    throw new Error("Contact details cannot contain line breaks.");
  switch (contact.kind) {
    case "email":
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254)
        throw new Error("Enter a valid email address.");
      return `mailto:${encodeURIComponent(value)}`;
    case "whatsapp":
      if (!/^\+[1-9]\d{6,14}$/.test(value))
        throw new Error(
          "Use an international WhatsApp number, such as +60123456789.",
        );
      return `https://wa.me/${value.slice(1)}`;
    case "website": {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password)
        throw new Error("Use an HTTPS website URL.");
      return url.toString();
    }
    case "instagram":
      return `https://www.instagram.com/${normalizeInstagramHandle(value)}/`;
    default:
      throw new Error("Unsupported contact method.");
  }
}
export function validateSettings(input: unknown): Settings {
  const s = input as Settings;
  const slug = validateSlug(s.slug);
  const partnerships = s.partnerships ?? [];
  if (partnerships.length > 10) throw Error("Add up to ten past partnerships.");
  const normalizedPartnerships = partnerships.map((p) => {
    if (
      !p.brand_name.trim() ||
      p.brand_name.length > 100 ||
      p.description.length > 500 ||
      p.url.length > 2048 ||
      (p.logo_url?.length ?? 0) > 2048
    )
      throw Error(
        "Enter a brand name up to 100 characters and a description up to 500 characters.",
      );
    const url = p.url.trim();
    return {
      ...p,
      ...(p.logo_url
        ? {
            logo_url: contactHref({
              kind: "website",
              value: p.logo_url,
              is_visible: true,
            }),
          }
        : {}),
      brand_name: p.brand_name.trim(),
      description: p.description.trim(),
      url: url
        ? contactHref({ kind: "website", value: url, is_visible: true })
        : "",
    };
  });
  if (
    !s.display_name.trim() ||
    s.display_name.length > 100 ||
    s.bio.length > 1000 ||
    s.category.length > 1000
  )
    throw new Error(
      "Enter a name up to 100 characters, a short category, and a bio up to 1,000 characters.",
    );
  if (s.rates.length > 10 || s.contacts.length > 4)
    throw new Error("Add up to ten rates and four contact methods.");
  for (const r of s.rates)
    if (
      !r.name.trim() ||
      r.name.length > 100 ||
      r.description.length > 500 ||
      !Number.isSafeInteger(r.amount_minor) ||
      r.amount_minor < 0 ||
      r.amount_minor > 100000000 ||
      !["MYR", "USD", "SGD"].includes(r.currency)
    )
      throw new Error("Check your service name and price.");
  if (new Set(s.contacts.map((c) => c.kind)).size !== s.contacts.length)
    throw new Error("Use each contact method once.");
  for (const c of s.contacts) {
    if (c.value.length > 2048) throw new Error("Contact value is too long.");
    contactHref(c);
  }
  return {
    ...s,
    partnerships: normalizedPartnerships,
    partnerships_visible: s.partnerships_visible ?? true,
    slug,
    display_name: s.display_name.trim(),
    category: s.category.trim(),
    contacts: s.contacts.map((c) => ({ ...c, value: c.value.trim() })),
  };
}

export type Platform = "instagram" | "tiktok";
export function normalizeAccountHandle(
  input: string,
  platform: Platform,
): string {
  if (platform === "instagram") return normalizeInstagramHandle(input);
  let handle = input.trim();
  if (/^https?:\/\//i.test(handle)) {
    const url = new URL(handle);
    if (
      url.protocol !== "https:" ||
      !["tiktok.com", "www.tiktok.com"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port ||
      !/^\/@[a-z0-9_.]+\/?$/i.test(url.pathname)
    )
      throw Error("Enter a TikTok profile URL or username.");
    handle = url.pathname.split("/")[1];
  }
  handle = handle.replace(/^@/, "").toLowerCase();
  if (
    !/^[a-z0-9_][a-z0-9_.]{0,23}$/.test(handle) ||
    handle.endsWith(".") ||
    handle.includes("..")
  )
    throw Error("Enter a valid TikTok username.");
  return handle;
}
export function accountProfileUrl(handle: string, platform: Platform) {
  return platform === "tiktok"
    ? `https://www.tiktok.com/@${handle}`
    : `https://www.instagram.com/${handle}/`;
}
export function normalizeTikTokProfile(
  items: unknown[],
  handle: string,
): ProfileSnapshot {
  const rows = items
    .slice(0, 12)
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object",
    );
  const first = rows[0];
  const author = first?.authorMeta as Record<string, unknown> | undefined;
  if (
    !author ||
    typeof author.name !== "string" ||
    author.name.toLowerCase() !== handle ||
    author.privateAccount === true ||
    first.error
  )
    throw Error("This TikTok profile is unavailable or private.");
  for (const row of rows) {
    const a = row.authorMeta as Record<string, unknown> | undefined;
    if (
      !a ||
      typeof a.name !== "string" ||
      a.name.toLowerCase() !== handle ||
      a.privateAccount === true ||
      row.error
    )
      throw Error("TikTok returned an unexpected profile.");
  }
  const videos = rows.filter(
    (r) => typeof r.id === "string" && /^\d+$/.test(r.id),
  );
  const snapshot = normalizeProfile(
    {
      username: handle,
      fullName: author.nickName,
      biography: author.signature,
      verified: author.verified,
      followersCount: author.fans,
      postsCount: author.video,
      profilePicUrlHd: author.avatar,
      latestPosts: videos.map((r) => ({
        id: r.id,
        shortCode: r.id,
        caption: r.text,
        timestamp: r.createTimeISO,
        likesCount: r.diggCount,
        commentsCount: r.commentCount,
        type: r.isSlideshow === true ? "Sidecar" : "Video",
        videoViewCount: r.playCount,
        displayUrl: (r.videoMeta as Record<string, unknown> | undefined)
          ?.coverUrl,
      })),
    },
    handle,
  );
  snapshot.posts = snapshot.posts.map((p) => ({
    ...p,
    url: `https://www.tiktok.com/@${handle}/video/${p.id}`,
  }));
  return snapshot;
}
