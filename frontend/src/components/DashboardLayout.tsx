import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import Navbar from "@/components/Navbar";

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2"
    >
      <ChevronLeft size={16} />
      Back
    </button>
  );
};

const BACK_BUTTON_EXCLUDED = [
  "/dashboard",
  "/dashboard/browse-events",
  "/dashboard/my-bookings",
  "/dashboard/billing-payments",
  "/dashboard/profile-settings",
];

// Create a wrapper component to use useSidebar within SidebarProvider
const DashboardContent = ({ 
  showBackButton, 
  BackButton, 
  children 
}: { 
  showBackButton: boolean, 
  BackButton: React.ComponentType, 
  children: React.ReactNode 
}) => {
  const { openMobile } = useSidebar();
  
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-background">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex h-full">
        <AppSidebar />
      </div>
      
      <div className="flex flex-1 flex-col min-w-0 h-full">
        <Navbar variant="dashboard" />
        
        <main
          className="flex-1 overflow-y-auto bg-muted/20 custom-scrollbar p-3 md:p-4"
        >
          <div className="max-w-[1600px] mx-auto pb-4">
            {showBackButton && <BackButton />}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

const DashboardLayout = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const showBackButton = !BACK_BUTTON_EXCLUDED.includes(location.pathname);

  return (
    <SidebarProvider defaultOpen={false}>
      <DashboardContent showBackButton={showBackButton} BackButton={BackButton}>
        <Outlet />
      </DashboardContent>
    </SidebarProvider>
  );
};

export default DashboardLayout;
