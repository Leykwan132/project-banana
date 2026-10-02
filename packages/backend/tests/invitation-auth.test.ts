import { expect, test } from 'bun:test';
import { createAuthOptions } from '../convex/auth';
import { send } from '../convex/creatorInvitationActions';
import { memoryContext } from './creator-invitations.test';

test('public magic-link issuance cannot send arbitrary invitations', async () => {
  process.env.SITE_URL = 'https://web.example.com';
  const options = createAuthOptions(memoryContext());
  const plugin = options.plugins.find((p: any) => p.id === 'magic-link') as any;
  expect(plugin).toBeDefined();
  await expect(plugin.options.sendMagicLink({ email: 'outsider@example.com', token: 'magic', url: 'https://backend.example.com' })).rejects.toThrow('admin');
});
test('send action rejects nonadmins before preparing or sending', async () => {
  const ctx = memoryContext({ subject: 'outsider', email: 'outsider@example.com' });
  await expect((send as any)._handler(ctx, { email: 'invited@example.com' })).rejects.toThrow('admin');
  expect(ctx.records.size).toBe(0);
});

test('server-generated magic links use the Convex HTTP site as the auth base URL', () => {
  process.env.CONVEX_SITE_URL = 'https://dev-backend.convex.site';
  expect((createAuthOptions(memoryContext()) as any).baseURL).toBe('https://dev-backend.convex.site');
});
