import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import OfferDetail from "./pages/OfferDetail.tsx";
import Wallet from "./pages/Wallet.tsx";
import MapPage from "./pages/MapPage.tsx";
import Profile from "./pages/Profile.tsx";
import Merchant from "./pages/Merchant.tsx";
import Auth from "./pages/Auth.tsx";
import ProAuth from "./pages/ProAuth.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RequireRole } from "@/components/jeck/RequireRole";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public auth routes */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/pro/auth" element={<ProAuth />} />

          {/* Client-only routes */}
          <Route path="/" element={<RequireRole role="client"><Index /></RequireRole>} />
          <Route path="/offer/:id" element={<RequireRole role="client"><OfferDetail /></RequireRole>} />
          <Route path="/wallet" element={<RequireRole role="client"><Wallet /></RequireRole>} />
          <Route path="/map" element={<RequireRole role="client"><MapPage /></RequireRole>} />
          <Route path="/profile" element={<RequireRole role="client"><Profile /></RequireRole>} />

          {/* Pro-only route */}
          <Route path="/merchant" element={<RequireRole role="pro"><Merchant /></RequireRole>} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
