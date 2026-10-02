import { expect, test } from 'bun:test';
process.env.RESEND_WEBHOOK_SECRET = 'whsec_aW52aXRhdGlvbi10ZXN0LXNlY3JldA==';
process.env.SITE_URL = 'https://web.example.com';
const { default: http } = await import('../convex/http');

test('Resend delivery webhook is registered and rejects unsigned requests', async () => {
  const route = http.lookup('/webhooks/resend', 'POST');
  expect(route).not.toBeNull();
  const [handler] = route!;
  const response = await (handler as any)._handler({ runMutation: async () => { throw new Error('Unsigned request reached database'); } }, new Request('https://backend.example.com/webhooks/resend', { method: 'POST', body: '{}' }));
  expect(response.status).toBeGreaterThanOrEqual(400);
});


test('signed Resend delivery events update the email component', async () => {
  const route = http.lookup('/webhooks/resend', 'POST')!;
  const event = { type: 'email.bounced', created_at: new Date().toISOString(), data: { email_id: 'test-email', from: 'test@example.com', to: ['bounced@resend.dev'], subject: 'Invitation' } };
  const body = JSON.stringify(event); const timestamp = String(Math.floor(Date.now() / 1000)); const id = 'test-webhook-id';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('invitation-test-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  let observed: unknown;
  const response = await (route[0] as any)._handler({ runMutation: async (_: unknown, args: unknown) => { observed = args; } }, new Request('https://backend.example.com/webhooks/resend', { method: 'POST', body, headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${Buffer.from(signature).toString('base64')}` } }));
  expect(response.status).toBe(201);
  expect(observed).toEqual({ event });
});
