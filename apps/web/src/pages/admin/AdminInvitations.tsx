import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAction, useMutation, usePaginatedQuery } from 'convex/react';
import { MailPlus, Loader2 } from 'lucide-react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import type { Id } from '../../../../../packages/backend/convex/_generated/dataModel';
import { toast } from '../../components/ui/Toast';

const deliveryLabels: Record<string, string> = { sending: 'Sending', waiting: 'Queued', queued: 'Queued', sent: 'Sent', delivered: 'Delivered', failed: 'Delivery failed', bounced: 'Bounced', cancelled: 'Cancelled', delivery_delayed: 'Delivery delayed', complained: 'Reported as spam' };
const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-gray-900';
export default function AdminInvitations() {
  const { results, status, loadMore } = usePaginatedQuery(api.creatorInvitations.list, {}, { initialNumItems: 20 });
  const send = useAction(api.creatorInvitationActions.send);
  const revoke = useMutation(api.creatorInvitations.revoke);
  const [email, setEmail] = useState(''); const [name, setName] = useState('');
  const [busy, setBusy] = useState<string | null>(null); const [error, setError] = useState('');
  async function perform(key: string, action: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(key); setError('');
    try { await action(); toast({ title: success, color: 'success' }); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update invitation. Please retry.'); return false; }
    finally { setBusy(null); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await perform('new', () => send({ email, name: name.trim() || undefined }), 'Invitation email queued')) { setEmail(''); setName(''); }
  }
  function resend(invitationId: Id<'creator_invitations'>, recipient: string, recipientName?: string) {
    void perform(invitationId, () => send({ invitationId, email: recipient, name: recipientName }), 'New invitation email queued');
  }
  return <div className="max-w-6xl space-y-6">
    <header><h1 className="text-2xl font-bold tracking-tight text-gray-900">Creator invitations</h1><p className="mt-1 text-sm text-gray-600">Invite creators by email. Each magic link expires after 24 hours.</p></header>
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-gray-900">Email address<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="creator@example.com" className={`${fieldClass} mt-2`} /></label>
        <label className="text-sm font-medium text-gray-900">Name <span className="font-normal text-gray-500">(optional)</span><input maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="Creator name" className={`${fieldClass} mt-2`} /></label>
      </div>
      <button disabled={!!busy} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy === 'new' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}Send invitation</button>
    </form>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
    <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 px-5 py-4 font-semibold text-gray-900">Invitation history</h2>
      {status === 'LoadingFirstPage' ? <p role="status" className="p-8 text-center text-gray-600">Loading invitations…</p> : results.length === 0 ? <p className="p-8 text-center text-gray-600">No invitations yet. Send your first invitation above.</p> : <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600"><tr>{['Creator', 'Status', 'Email', 'Expires', 'Actions'].map(title => <th key={title} className="px-5 py-3 font-medium">{title}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">{results.map(row => <tr key={row._id}>
          <td className="px-5 py-4"><p className="font-medium text-gray-900">{row.email}</p>{row.name && <p className="mt-1 text-gray-500">{row.name}</p>}</td>
          <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${row.status === 'accepted' ? 'bg-green-100 text-green-800' : row.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>{row.status}</span></td>
          <td className="px-5 py-4 text-gray-600">{deliveryLabels[row.deliveryStatus] ?? row.deliveryStatus}</td>
          <td className="whitespace-nowrap px-5 py-4 text-gray-600">{new Date(row.expiresAt).toLocaleString()}</td>
          <td className="whitespace-nowrap px-5 py-4">{row.status !== 'accepted' && <div className="flex gap-3"><button type="button" disabled={!!busy} onClick={() => resend(row._id, row.email, row.name)} className="font-medium text-gray-900 underline underline-offset-4 disabled:opacity-40">{busy === row._id ? 'Working…' : 'Resend'}</button>{row.status !== 'revoked' && <button type="button" disabled={!!busy} onClick={() => void perform(row._id, () => revoke({ invitationId: row._id }), 'Invitation revoked')} className="font-medium text-red-700 disabled:opacity-40">Revoke</button>}</div>}</td>
        </tr>)}</tbody>
      </table>}
      {(status === 'CanLoadMore' || status === 'LoadingMore') && <div className="border-t border-gray-200 p-4 text-center"><button onClick={() => loadMore(20)} disabled={status === 'LoadingMore'} className="text-sm font-medium text-gray-900 disabled:opacity-50">{status === 'LoadingMore' ? 'Loading…' : 'Load more invitations'}</button></div>}
    </section>
    <p className="text-xs text-gray-500">Resending replaces the previous link. Revoking blocks the invitation; accepted creators keep their account access.</p>
  </div>;
}
