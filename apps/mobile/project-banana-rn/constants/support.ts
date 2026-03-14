export const CREATOR_COMMUNITY_URL = 'https://chat.whatsapp.com/K012OZHBhq63tMrAgqyJX6';

export const REPORT_ISSUE_FORM_URL =
    process.env.EXPO_PUBLIC_REPORT_ISSUE_FORM_URL ?? 'https://forms.gle/Th4oth7TKtx4W1cG8';

const publicSiteBaseUrl = (process.env.EXPO_PUBLIC_CONVEX_SITE_URL ?? 'https://lumina-app.my').replace(/\/$/, '');

export const PRIVACY_POLICY_URL = `${publicSiteBaseUrl}/privacy-policy`;

export const TERMS_AND_CONDITIONS_URL = `${publicSiteBaseUrl}/terms-and-conditions`;
