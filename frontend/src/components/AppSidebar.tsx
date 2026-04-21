import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  LayoutDashboard,
  CalendarDays,
  Ticket,
  Users,
  BarChart3,
  PlusCircle,
  LogOut,
  PartyPopper,
  Search,
  CreditCard,
  UserCheck,
  Radio,
  Bell,
  Image,
  Heart,
  UserCog,
  HelpCircle,
  Calendar,
  Sparkles,
  Utensils,
  Lightbulb,
  Music,
  Tags,
  Tag,
  MessageSquare
} from "lucide-react";

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const { notificationCount, pendingBookingsCount } = useSocket();
  const { t } = useLanguage();
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const shouldCountEvents = !!user && (user.role === "admin" || user.role === "organizer" || user.role === "merchant");
  const { data: eventCount = 0 } = useQuery({
    queryKey: ['sidebar-event-count', user?.id, user?.role],
    queryFn: async () => {
      const url = user?.role === 'admin' ? `/events` : `/events?merchantId=${user?.id}`;
      const res = await api.get(url);
      return Array.isArray(res.data) ? res.data.length : 0;
    },
    enabled: shouldCountEvents
  });

  const customerLinks = [
    { title: t('dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('browse_events'), url: "/dashboard/browse-events", icon: Search },
    { title: t('my_bookings'), url: "/dashboard/my-bookings", icon: Ticket },
    { title: t('saved_events'), url: "/dashboard/saved-events", icon: Heart },
    { title: t('calendar'), url: "/dashboard/calendar", icon: Calendar },
    { title: t('billing_payments'), url: "/dashboard/billing-payments", icon: CreditCard },
    { title: t('notifications'), url: "/dashboard/notifications", icon: Bell, badge: notificationCount },
    { title: t('gallery'), url: "/dashboard/customer-gallery", icon: Image },
    { title: t('profile_settings'), url: "/dashboard/profile-settings", icon: UserCog },
  ];

  // On mobile, customers use sidebar for all links — including primary ones from BottomNavBar
  const customerMobileLinks = [
    { title: t('dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('browse_events'), url: "/dashboard/browse-events", icon: Search },
    { title: t('my_bookings'), url: "/dashboard/my-bookings", icon: Ticket },
    { title: t('billing_payments'), url: "/dashboard/billing-payments", icon: CreditCard },
    { title: t('profile_settings'), url: "/dashboard/profile-settings", icon: UserCog },
    { title: t('saved_events'), url: "/dashboard/saved-events", icon: Heart },
    { title: t('calendar'), url: "/dashboard/calendar", icon: Calendar },
    { title: t('notifications'), url: "/dashboard/notifications", icon: Bell, badge: notificationCount },
    { title: t('gallery'), url: "/dashboard/customer-gallery", icon: Image },
    { title: "Help & Support", url: "/dashboard/help", icon: HelpCircle },
  ];

  const organizerLinks = [
    { title: t('dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('my_events'), url: "/dashboard/events", icon: CalendarDays, badge: eventCount },
    { title: t('live_events'), url: "/dashboard/live-events", icon: Radio },
    { title: t('assigned_bookings'), url: "/dashboard/merchant-bookings", icon: Ticket, badge: pendingBookingsCount },
    { title: 'Ticket Analytics', url: "/dashboard/ticket-analytics", icon: BarChart3 },
    { title: t('create_event'), url: "/dashboard/events/create", icon: PlusCircle },
    { title: t('manage_categories'), url: "/dashboard/categories", icon: Tags },
    { title: t('services'), url: "/dashboard/services", icon: Sparkles },
    { title: t('messages'), url: "/dashboard/messages", icon: MessageSquare },
    { title: t('gallery'), url: "/dashboard/gallery", icon: Image },
    { title: t('profile_settings'), url: "/dashboard/profile-settings", icon: UserCog },
  ];

  const adminLinks = [
    { title: t('dashboard'), url: "/dashboard", icon: LayoutDashboard },
    { title: t('all_events'), url: "/dashboard/events", icon: CalendarDays, badge: eventCount },
    { title: t('live_events'), url: "/dashboard/live-events", icon: Radio },
    { title: t('manage_merchants'), url: "/dashboard/users", icon: UserCheck },
    { title: t('view_bookings'), url: "/dashboard/all-bookings", icon: Ticket, badge: pendingBookingsCount },
    { title: t('payments'), url: "/dashboard/payments", icon: CreditCard },
    { title: t('analytics'), url: "/dashboard/analytics", icon: BarChart3 },
  ];

  const customerSecondaryLinks = [
    { title: "Help & Support", url: "/dashboard/help", icon: HelpCircle },
  ];

  const links = user?.role === "admin"
    ? adminLinks
    : (user?.role === "organizer" || user?.role === "merchant")
      ? organizerLinks
      : (isMobile ? customerMobileLinks : customerLinks);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-gradient">EventPro</span>
            </div>
          </SidebarGroupLabel>
          {user?.role === "customer" && isMobile && (
            <SidebarGroupLabel>More</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <RouterNavLink to={item.url} onClick={() => setOpenMobile(false)} className="flex items-center w-full gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{item.title}</span>
                      {(item as any).badge > 0 && (
                        <Badge className="ml-auto h-5 w-5 p-0 flex items-center justify-center text-[10px] gradient-primary text-white border-none rounded-full animate-in fade-in zoom-in duration-300">
                          {(item as any).badge}
                        </Badge>
                      )}
                    </RouterNavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        {user && (
          <div className="px-2 mb-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => { setOpenMobile(false); logout(); }}>
          <LogOut className="h-4 w-4 mr-2 shrink-0" />
          <span>{t('sign_out')}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
