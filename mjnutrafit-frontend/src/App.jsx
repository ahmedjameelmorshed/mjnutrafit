import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedLayout from "./components/ProtectedLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/ClientDashboard";
import CoachDashboard from "./pages/CoachDashboard";
import Plans from "./pages/Plans";
import Progress from "./pages/Progress";
import ActivityHistory from "./pages/ActivityHistory";
import Profile from "./pages/Profile";
import FitnessProfile from "./pages/FitnessProfile";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import AICoach from "./pages/AICoach";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<ClientDashboard />} />
              <Route path="/coach-dashboard" element={<CoachDashboard />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/activity" element={<ActivityHistory />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/fitness" element={<FitnessProfile />} />
              <Route path="/ai-coach" element={<AICoach />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
