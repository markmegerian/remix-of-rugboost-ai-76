import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CompanyProvider } from "@/hooks/useCompany";
import { AppInitializer } from "@/components/AppInitializer";
import { DeepLinkHandler } from "@/hooks/useDeepLinking";
import { queryClient } from "@/lib/queryClient";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CompanyGuard } from "@/components/CompanyGuard";
import BottomTabBar from "@/components/BottomTabBar";

// Skeleton fallbacks for per-route Suspense
import DashboardSkeleton from "@/components/skeletons/DashboardSkeleton";
import JobDetailSkeleton from "@/components/skeletons/JobDetailSkeleton";
import AnalyticsSkeleton from "@/components/skeletons/AnalyticsSkeleton";
import HistorySkeleton from "@/components/skeletons/HistorySkeleton";
import JobListSkeleton from "@/components/skeletons/JobListSkeleton";

// Lazy-load GlobalSearch (Cmd+K dialog — not needed on initial render)
const GlobalSearch = lazy(() => import("@/components/GlobalSearch"));

// Eagerly load Index — it's the landing route and LCP-critical
import Index from "./pages/Index";

// Lazy load pages for code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewJob = lazy(() => import("./pages/NewJob"));
const JobDetail = lazy(() => import("./pages/JobDetail"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Analytics = lazy(() => import("./pages/Analytics"));

// Client Portal Pages
const ClientAuth = lazy(() => import("./pages/ClientAuth"));
const ClientPortal = lazy(() => import("./pages/ClientPortal"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientHistory = lazy(() => import("./pages/ClientHistory"));
const ClientSetPassword = lazy(() => import("./pages/ClientSetPassword"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserDetail = lazy(() => import("./pages/admin/AdminUserDetail"));
const AdminPayouts = lazy(() => import("./pages/admin/AdminPayouts"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Utility Pages
const ScreenshotGenerator = lazy(() => import("./pages/ScreenshotGenerator"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

// Legal Pages
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const CompanySetup = lazy(() => import("./pages/CompanySetup"));

// History page
const History = lazy(() => import("./pages/History"));

// Loading fallback component - iOS safe area aware
const PageLoader = () => (
  <div className="min-h-screen-safe flex items-center justify-center safe-y">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <ErrorBoundary>
     <QueryClientProvider client={queryClient}>
       <AuthProvider>
         <CompanyProvider>
           <AppInitializer>
             <TooltipProvider>
              <Toaster />
             <OfflineBanner />
              <BrowserRouter>
                {/* Deep link handler for Capacitor native apps */}
                <DeepLinkHandler />
                {/* GlobalSearch is lazy-loaded since it's a Cmd+K dialog */}
                <Suspense fallback={null}>
                  <GlobalSearch />
                </Suspense>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                   {/* ===== PUBLIC ROUTES — no guard ===== */}
                   <Route path="/" element={<Index />} />
                   <Route path="/auth" element={<Auth />} />
                   <Route path="/reset-password" element={<ResetPassword />} />
                   <Route path="/auth-callback" element={<AuthCallback />} />
                   <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                   <Route path="/privacy" element={<PrivacyPolicy />} />
                   <Route path="/terms-of-service" element={<TermsOfService />} />
                   <Route path="/support" element={<Support />} />
                   {import.meta.env.DEV && <Route path="/screenshots" element={<ScreenshotGenerator />} />}

                   {/* ===== CLIENT TOKEN-BASED ROUTES — no auth guard (uses access tokens) ===== */}
                   <Route path="/client/auth" element={<ClientAuth />} />
                   <Route path="/client/set-password" element={<ClientSetPassword />} />
                   <Route path="/client/:accessToken" element={<ClientPortal />} />
                   <Route path="/client/payment-success" element={<PaymentSuccess />} />
                   <Route path="/client/payment-cancelled" element={<PaymentCancelled />} />
                   {/* Stable payment routes for Capacitor deep linking */}
                   <Route path="/payment/success" element={<PaymentSuccess />} />
                   <Route path="/payment/cancel" element={<PaymentCancelled />} />

                   {/* ===== STAFF ROUTES — require authentication + staff role ===== */}
                   <Route element={<ProtectedRoute requiredRole="staff" />}>
                     <Route element={<CompanyGuard />}>
                       <Route path="/dashboard" element={
                         <Suspense fallback={<DashboardSkeleton />}>
                           <Dashboard />
                         </Suspense>
                       } />
                       <Route path="/jobs/new" element={
                         <Suspense fallback={<JobListSkeleton />}>
                           <NewJob />
                         </Suspense>
                       } />
                       <Route path="/jobs/:jobId" element={
                         <Suspense fallback={<JobDetailSkeleton />}>
                           <JobDetail />
                         </Suspense>
                       } />
                       <Route path="/job/:jobId" element={
                         <Suspense fallback={<JobDetailSkeleton />}>
                           <JobDetail />
                         </Suspense>
                       } />
                       <Route path="/settings" element={<AccountSettings />} />
                       <Route path="/analytics" element={
                         <Suspense fallback={<AnalyticsSkeleton />}>
                           <Analytics />
                         </Suspense>
                       } />
                       <Route path="/history" element={
                         <Suspense fallback={<HistorySkeleton />}>
                           <History />
                         </Suspense>
                       } />
                     </Route>
                     <Route path="/company/setup" element={<CompanySetup />} />
                   </Route>

                   {/* ===== CLIENT PORTAL ROUTES — require client authentication ===== */}
                   <Route element={<ProtectedRoute requiredRole="client" redirectTo="/client/auth" />}>
                     <Route path="/client/dashboard" element={<ClientDashboard />} />
                     <Route path="/client/history" element={<ClientHistory />} />
                   </Route>

                   {/* ===== ADMIN ROUTES — require admin role ===== */}
                   <Route element={<ProtectedRoute requiredRole="admin" />}>
                     <Route path="/admin" element={<AdminDashboard />} />
                     <Route path="/admin/users" element={<AdminUsers />} />
                     <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
                     <Route path="/admin/payouts" element={<AdminPayouts />} />
                     <Route path="/admin/settings" element={<AdminSettings />} />
                     <Route path="/admin/audit-log" element={<AdminAuditLog />} />
                   </Route>

                <Route path="*" element={<NotFound />} />
                 </Routes>
                </Suspense>
                <BottomTabBar />
              </BrowserRouter>
             </TooltipProvider>
           </AppInitializer>
         </CompanyProvider>
        </AuthProvider>
      </QueryClientProvider>
   </ErrorBoundary>
);

export default App;
