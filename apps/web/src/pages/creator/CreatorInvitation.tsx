import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../packages/backend/convex/_generated/api';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { authClient } from '../../lib/auth-client';
import iconDark from '../../assets/icon-dark.svg';

const goals = [['side_income', 'Earn extra side income'], ['full_time_creator', 'Become a full-time creator'], ['brand', 'Work with brands'], ['monetize_audience', 'Monetize my existing audience'], ['try_ugc', 'Just trying it out']];
const referrals = [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['threads', 'Threads'], ['linkedin', 'LinkedIn'], ['friends', 'Friends']];
export default function CreatorInvitation() {
  const [params] = useSearchParams(); const token = params.get('token') ?? '';
  const { session, loading, membership } = useWorkspaces();
  const invitation = useQuery(api.creatorInvitations.getMyInvitation, !loading && session?.user && token ? { token } : 'skip');
  const complete = useMutation(api.creators.completeOnboarding);
  const [username, setUsername] = useState(''); const [selectedGoals, setGoals] = useState<string[]>([]); const [referral, setReferral] = useState('');
  const availability = useQuery(api.creators.checkUsernameAvailability, session?.user && username.trim().length >= 3 ? { username: username.trim() } : 'skip');
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try { await complete({ username: username.trim(), signupGoal: selectedGoals, referralSource: referral, invitationToken: token }); window.location.replace('/creator/campaigns'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create your creator profile. Please retry.'); setSaving(false); }
  }
  const authError = params.get('error');
  let message = '';
  if (authError || !token) message = 'This invitation link is invalid, expired, or has been replaced. Ask the admin to send a new invitation.';
  else if (!loading && !session?.user) message = 'Open the magic link in your invitation email to verify your account. If you already used the link, sign in with the invited account and open this page again.';
  else if (invitation && !invitation.valid) message = invitation.message;
  return <div className="min-h-screen bg-gray-50 px-6 py-10">
    <header className="mx-auto mb-10 flex max-w-lg items-center gap-2"><img src={iconDark} alt="Lumina" className="h-8 w-8" /><span className="text-xl font-semibold text-gray-900">Lumina</span></header>
    <main className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Your creator invitation</h1>
      {message ? <><p role="alert" className="mt-4 text-sm text-gray-700">{message}</p><div className="mt-6 flex gap-4 text-sm font-medium"><Link to="/creator/login" className="underline">Creator login</Link>{session?.user && <button onClick={() => void authClient.signOut().then(() => window.location.reload())} className="underline">Sign out</button>}</div></>
      : loading || invitation === undefined ? <p role="status" className="mt-4 text-sm text-gray-600">Verifying your invitation…</p>
      : membership?.creatorId ? <><p className="mt-4 text-sm text-gray-600">You already have a creator account.</p><a href="/creator/campaigns" className="mt-6 inline-block text-sm font-semibold underline">Open creator workspace</a></>
      : invitation.valid && <form onSubmit={submit} className="mt-6 space-y-6">
        <p className="text-sm text-gray-600">Welcome, {invitation.name || invitation.email}. Finish setting up your creator profile.</p>
        <label className="block text-sm font-medium text-gray-900">Username<input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} minLength={3} maxLength={30} pattern="[a-z0-9_]+" required autoComplete="username" placeholder="yourname" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5" />{availability?.available === false && <span className="mt-1 block text-xs text-red-700">This username is already taken.</span>}</label>
        <fieldset><legend className="mb-3 text-sm font-medium text-gray-900">What are your goals?</legend><div className="space-y-3">{goals.map(([id, label]) => <label key={id} className="flex items-center gap-3 text-sm text-gray-700"><input type="checkbox" checked={selectedGoals.includes(id)} onChange={e => setGoals(e.target.checked ? [...selectedGoals, id] : selectedGoals.filter(goal => goal !== id))} />{label}</label>)}</div></fieldset>
        <label className="block text-sm font-medium text-gray-900">How did you hear about us?<select required value={referral} onChange={e => setReferral(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"><option value="">Select an option</option>{referrals.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={saving || selectedGoals.length === 0 || availability?.available !== true} className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Creating your profile…' : 'Create creator account'}</button>
        <p className="text-xs text-gray-500">Signed in as {session?.user.email}. <button type="button" onClick={() => void authClient.signOut().then(() => window.location.reload())} className="underline">Use another account</button></p>
      </form>}
    </main>
  </div>;
}
