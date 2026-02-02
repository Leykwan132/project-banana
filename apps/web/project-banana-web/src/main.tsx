import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@heroui/toast";

import App from './App'
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
import { DashboardLayout } from './components/DashboardLayout'
import { HeroUIProvider } from "@heroui/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeroUIProvider>
      <ToastProvider placement='top-center' toastOffset={30} toastProps={{
        timeout: 2000,
      }} />
      <AuthKitProvider
        clientId={import.meta.env.VITE_WORKOS_CLIENT_ID}
        redirectUri={import.meta.env.VITE_WORKOS_REDIRECT_URI}
      >
        <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
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
                <Route path="/credits/topup" element={<TopUp />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConvexProviderWithAuthKit>
      </AuthKitProvider>
    </HeroUIProvider>
  </StrictMode>,
)
