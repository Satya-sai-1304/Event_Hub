import { useAuth } from "@/contexts/AuthContext";
import CustomerDashboard from "./CustomerDashboard";
import OrganizerDashboard from "./OrganizerDashboard";
import AdminDashboard from "./AdminDashboard";

const DashboardHome = () => {
  const { user } = useAuth();

  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "organizer" || user?.role === "merchant") return <OrganizerDashboard />;
  return <CustomerDashboard />;
};

export default DashboardHome;
