# Shared web login for businesses and creators

## Approved intent

Web is the primary product; mobile development is on hold. Businesses and creators share the existing Better Auth account system and Convex database. Existing creator records grant access without a new invitation. New creators require an admin invitation sent as a magic link. Creator campaign, submission, analytics, bank account, notification, and withdrawal behavior must reuse existing backend methods.

This spec defines login separation and workspace access. The broader creator feature migration and invitation lifecycle are separate implementation units, with integration requirements below. Login separation alone must not be reported as completing either unit.

## Current behavior

- Web uses Better Auth with Google sign-in and a shared Convex backend.
- `/login` sends Google callbacks to `/auth-redirect`.
- `AuthRedirect.tsx` checks only `businesses.getMyBusiness`, then sends users to `/overview` or `/onboarding`.
- `DashboardLayout.tsx` checks authentication, but not business membership.
- Business and creator records reference the authenticated identity through `user_id`. An account may have both records.
- `creators.completeOnboarding` currently creates a creator for any authenticated user. Invitation enforcement does not yet exist.
- Creator web pages and invitation records do not yet exist.

## Entry points and identity

Use `/business/login` and `/creator/login`, backed by a shared login component. Keep `/login` as a compatibility redirect to business login, preserving authentication errors. Existing business dashboard URLs remain unchanged.

Each login page has role-specific text and a link to the other login page. Google sign-in remains available through the existing provider configuration. Do not introduce a second identity store or duplicate user accounts. Sign-in may create an authentication identity; it must not automatically create a business or creator profile.

Pass `workspace=business` or `workspace=creator` through the authentication callback URL. Accept only these values; do not accept arbitrary redirect destinations. Legacy callbacks without a workspace use business intent. Signing in from an already authenticated session immediately resolves workspace access instead of leaving a disabled login button on screen.

## Workspace resolution

Resolve both records for the current authenticated identity. A current-account query may combine existing database lookups for safe, nullable membership results. It must derive the user ID from authentication rather than accept a client-supplied user ID. Record presence grants access, subject to existing creator deletion semantics: a creator marked `is_deleted` is not an active creator.

| Selected workspace | Business record | Active creator record | Result |
| --- | --- | --- | --- |
| Business | Yes | Either | Existing business overview |
| Business | No | Yes | Show creator workspace access and an explicit register-business action |
| Business | No | No | Existing business onboarding |
| Creator | Either | Yes | Creator campaign browsing page |
| Creator | Yes | No | Invitation-required page with a business workspace link |
| Creator | No | No | Invitation-required page |

For an accepted invitation without a completed creator profile, the invitation integration routes to creator onboarding. A query parameter, selected workspace, or Google email alone is never proof of an invitation.

The wrong-workspace page must offer explicit actions instead of creating records or starting business onboarding automatically. Registering a business from a creator account remains possible through an explicit action using existing business onboarding.

## Route protection and switching

Business dashboard routes require a business record. Creator routes require an active creator record, except invitation-authorized creator onboarding. Wait for authentication and membership queries before rendering protected pages; show a loading state and surface query errors with a retry path.

Unauthenticated visitors to protected routes go to the matching login. Authenticated users without access go to the corresponding access-resolution page. Avoid redirect cycles between login, callbacks, and onboarding.

Accounts with both records receive a Switch workspace control in each workspace navigation. Switching uses the same session and resolves membership again. Accounts with one record do not show a misleading switch control. Business registration for creator-only accounts remains a separate explicit action.

Frontend guards improve navigation; existing backend authorization remains authoritative for campaign and financial operations. Do not rewrite those operations to implement login routing.

## Public website integration

Business landing and business sign-up links use business login. Creator landing offers Creator login and communicates that new creators join by invitation. Public navigation exposes both login entry points. Update creator-facing copy that promises unrestricted creator registration or sends the primary web journey to app downloads.

## Creator workspace dependency

The successful creator destination is `/creator/campaigns`. This must be a functioning campaign browser backed by the existing campaign methods when login separation ships. A placeholder dashboard or broken destination is not an acceptable completion state.

The remaining creator workspace uses `/creator` routes to avoid collisions with existing business campaign, bank account, withdrawal, and settings routes. It reuses the mobile app's existing backend methods and data. Full migration of those pages is the previously requested feature-migration unit, not a new product design.

## Invitation dependency

Admin invitations are bound to an email, expire, and can be resent or revoked. The magic link verifies ownership of that email and establishes the shared authenticated session. It authorizes creator onboarding once; consuming or revoking the invitation prevents reuse for new profile creation. Resending invalidates the previous invitation link.

Invitation validation must occur in the backend creator onboarding path, including direct API calls. Existing active creators retain access without invitation validation. Business registration remains available. Do not expose a general magic-link endpoint that grants creator membership to arbitrary emails.

The invitation lifecycle is a separate implementation unit and must be completed before enabling new creator onboarding. Existing creators can use the new creator login independently once the creator destination works.

## Errors and account continuity

Preserve workspace intent when sign-in fails, and return to the matching login with a readable error and working retry. Handle both returned provider errors and thrown failures. Expired or revoked invitations show an explanatory message and do not create a creator profile.

Reuse current authentication identities and `user_id` relationships. Do not reconnect records by trusting an unverified client email. Existing records attached to a different authentication identity require a separate verified recovery process; this change must not silently reassign ownership.

## Verification

- Verify the membership routing matrix, including dual-role and deleted-creator cases.
- Verify callbacks retain workspace intent, legacy links still work, and signed-in login visits resolve immediately.
- Verify direct protected-route visits cannot render the wrong workspace.
- Verify creator-only business login requires an explicit business-registration action.
- Verify workspace switching preserves the session and account data.
- Verify creator campaign browsing is functional through existing methods.
- Run web type checking and build; distinguish existing failures from regressions.
- Verify the invitation unit separately for expiry, revocation, resend invalidation, single use, email binding, and direct onboarding bypass attempts.

## Implementation boundaries

Primary files: web login and authentication redirect pages, web route registration, public navigation and landing links, dashboard layouts and navigation, and a current-account membership query if needed. Creator campaign browsing is the minimal successful-login destination. Invitation tables, admin management, email sending, and onboarding enforcement belong to the invitation unit. Preserve unrelated local changes already present in this checkout.

The next implementation plan must sequence these units and identify which are delivered in each phase. This spec introduces no new campaign or withdrawal business methods.
