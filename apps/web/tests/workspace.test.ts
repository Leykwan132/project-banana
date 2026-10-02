import { describe, expect, test } from 'bun:test';
import { callbackPath, loginPath, parseWorkspace, resolveWorkspace, protectedWorkspacePath } from '../src/lib/workspace';

const business = { businessId: 'business-1', creatorId: null };
const creator = { businessId: null, creatorId: 'creator-1' };
const both = { businessId: 'business-1', creatorId: 'creator-1' };
const neither = { businessId: null, creatorId: null };

describe('workspace selection and access', () => {
  test('business intent opens its dashboard for business and dual-role accounts', () => {
    expect(resolveWorkspace('business', business)).toBe('/overview');
    expect(resolveWorkspace('business', both)).toBe('/overview');
  });
  test('creator-only business login requires explicit business registration', () => {
    expect(resolveWorkspace('business', creator)).toBe('/workspace-access?workspace=business');
  });
  test('new business accounts start business onboarding', () => {
    expect(resolveWorkspace('business', neither)).toBe('/onboarding');
  });
  test('creator intent opens campaigns only with a creator record', () => {
    expect(resolveWorkspace('creator', creator)).toBe('/creator/campaigns');
    expect(resolveWorkspace('creator', both)).toBe('/creator/campaigns');
    expect(resolveWorkspace('creator', business)).toBe('/workspace-access?workspace=creator');
    expect(resolveWorkspace('creator', neither)).toBe('/workspace-access?workspace=creator');
  });
  test('legacy and invalid workspace values cannot redirect to arbitrary URLs', () => {
    expect(parseWorkspace(null)).toBe('business');
    expect(parseWorkspace('https://evil.example')).toBe('business');
    expect(parseWorkspace('creator')).toBe('creator');
  });
  test('callbacks and errors preserve intent and encode untrusted error text', () => {
    expect(callbackPath('creator')).toBe('/auth-redirect?workspace=creator');
    expect(loginPath('creator', 'bad&workspace=business')).toBe('/creator/login?error=bad%26workspace%3Dbusiness');
    expect(loginPath('business')).toBe('/business/login');
  });
  test('protected routes wait for membership instead of starting onboarding', () => {
    expect(protectedWorkspacePath('business', undefined)).toBe(null);
    expect(protectedWorkspacePath('creator', undefined)).toBe(null);
    expect(protectedWorkspacePath('business', null)).toBe('/business/login');
    expect(protectedWorkspacePath('creator', null)).toBe('/creator/login');
    expect(protectedWorkspacePath('business', creator)).toBe('/workspace-access?workspace=business');
    expect(protectedWorkspacePath('creator', business)).toBe('/workspace-access?workspace=creator');
    expect(protectedWorkspacePath('creator', creator)).toBe(null);
    expect(protectedWorkspacePath('business', both)).toBe(null);
  });
});
