import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Landing page routes only
import LandingPage from "./pages/LandingPage";
import BlogPage from "./pages/BlogPage";
import BlogAdmin from "./pages/BlogAdmin";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";

/**
 * Standalone Landing Page App
 * 
 * This is a minimal router for the marketing site only.
 * It includes:
 * - Landing page (/)
 * - Blog (/blog, /blog/:slug)
 * - Blog admin (/blog-admin)
 * - Legal pages (/privacy, /terms)
 * - Support page (/support)
 * 
 * For full application, use the main App.tsx instead.
 */
function LandingApp() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Main landing page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />
          
          {/* Blog */}
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
          <Route path="/blog-admin" element={<BlogAdmin />} />
          
          {/* Legal & Support */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/support" element={<Support />} />
          
          {/* Redirect app routes to main app or show message */}
          <Route path="/auth" element={<AppRedirect />} />
          <Route path="/dashboard" element={<AppRedirect />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  );
}

// Component shown when users try to access app routes on the standalone landing page
function AppRedirect() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Application Access
        </h1>
        <p className="text-muted-foreground mb-6">
          This is the marketing website. To access the RugBoost application, 
          please visit our main platform.
        </p>
        <a 
          href="https://rug-scan-report.lovable.app" 
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Go to App →
        </a>
      </div>
    </div>
  );
}

export default LandingApp;
