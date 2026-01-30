import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos";
import { ConvexReactClient } from "convex/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from './App'
import Overview from './pages/Overview'
import Campaigns from './pages/Campaigns'
import CampaignDetails from './pages/CampaignDetails'
import Approvals from './pages/Approvals'
import ApprovalDetails from './pages/ApprovalDetails'
import Settings from './pages/Settings'
import Credits from './pages/Credits'
import { DashboardLayout } from './components/DashboardLayout'
import { HeroUIProvider } from "@heroui/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HeroUIProvider>
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
                <Route path="/campaigns/:campaignId" element={<CampaignDetails />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/approvals/:id" element={<ApprovalDetails />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/credits" element={<Credits />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConvexProviderWithAuthKit>
      </AuthKitProvider>
    </HeroUIProvider>
  </StrictMode>,
)
