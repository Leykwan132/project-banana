import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@heroui/toast";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "./lib/auth-client";
import { PostHogProvider } from '@posthog/react'
import App from './App'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Overview from './pages/Overview'
import Campaigns from './pages/Campaigns'
import CreateCampaign from './pages/CreateCampaign'
import CampaignDetails from './pages/CampaignDetails'
import Approvals from './pages/Approvals'
import ApprovalDetails from './pages/ApprovalDetails'
import ReviewSubmission from './pages/ReviewSubmission'
import Settings from './pages/Settings'
import Credits from './pages/Credits'
import TopUp from './pages/TopUp'
import Subscription from './pages/Subscription'
import Withdrawals from './pages/Withdrawals'
import RequestWithdrawal from './pages/RequestWithdrawal'
import BankAccounts from './pages/BankAccounts'
import { DashboardLayout } from './components/DashboardLayout'
import { AdminLayout } from './components/AdminLayout'
import AdminBankApprovals from './pages/admin/AdminBankApprovals'
import AdminSubmissions from './pages/admin/AdminSubmissions'
import AdminPayouts from './pages/admin/AdminPayouts'
import { HeroUIProvider } from "@heroui/react";
import { PostHogIdentitySync } from './components/PostHogIdentitySync';
import { PostHogPageViewTracker } from './components/PostHogPageViewTracker';
import { registerBaseAnalyticsContext } from './lib/analytics';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
  // Optionally pause queries until the user is authenticated
  expectAuth: true,
});

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  loaded: (client: Parameters<typeof registerBaseAnalyticsContext>[0]) => {
    registerBaseAnalyticsContext(client);
  },
  autocapture: true,
  capture_pageview: false,
  capture_pageleave: true,
} as const;


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <HeroUIProvider>
          <PostHogIdentitySync />
          <ToastProvider placement='top-center' toastOffset={30} toastProps={{
            timeout: 2000,
          }} />
          <BrowserRouter>
            <PostHogPageViewTracker />
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/business" element={<App />} />
              <Route path="/pricing" element={<App />} />
              <Route path="/about" element={<App />} />
              <Route path="/support" element={<App />} />
              <Route path="/privacy-policy" element={<App />} />
              <Route path="/terms-and-conditions" element={<App />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<DashboardLayout />}>
                <Route path="/overview" element={<Overview />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaign/new" element={<CreateCampaign />} />
                <Route path="/campaigns/:campaignId" element={<CampaignDetails />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/approvals/:id" element={<ApprovalDetails />} />
                <Route path="/approvals/:id/submission/:submissionId" element={<ReviewSubmission />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/credits" element={<Credits />} />
                <Route path="/withdrawals" element={<Withdrawals />} />
                <Route path="/withdrawals/request" element={<RequestWithdrawal />} />
                <Route path="/bank-accounts" element={<BankAccounts />} />
                <Route path="/credits/topup" element={<TopUp />} />
                <Route path="/subscription" element={<Subscription />} />
              </Route>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={null} />
                <Route path="/admin/bank-approvals" element={<AdminBankApprovals />} />
                <Route path="/admin/submissions" element={<AdminSubmissions />} />
                <Route path="/admin/payouts" element={<AdminPayouts />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </HeroUIProvider>
      </ConvexBetterAuthProvider>
    </PostHogProvider>
  </StrictMode>,
)
