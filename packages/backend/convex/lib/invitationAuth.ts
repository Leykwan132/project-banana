export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
export async function hashToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export function newSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
export function invitationCallback(siteUrl: string, secret: string): string {
  const url = new URL('/creator/invitation', siteUrl);
  url.searchParams.set('token', secret);
  return url.toString();
}
export function callbackSecret(siteUrl: string, callback: unknown): string | null {
  if (typeof callback !== 'string') return null;
  try {
    const url = new URL(callback);
    const secret = url.searchParams.get('token');
    if (!secret || callback !== invitationCallback(siteUrl, secret)) return null;
    return secret;
  } catch { return null; }
}
