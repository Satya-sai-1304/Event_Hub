import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { 
  PartyPopper, 
  Home, 
  Calendar, 
  Users, 
  Image as ImageIcon, 
  Package, 
  BookOpen,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Search,
  Bell,
  ChevronDown,
  Zap,
  Star,
  Phone,
  PanelLeft,
  Languages
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavbarProps {
  variant?: "default" | "dashboard";
}

const Navbar = ({ variant = "default" }: NavbarProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(variant === "dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const isDashboard = variant === "dashboard";

  const { data: serverCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<any[]>('/categories');
      return response.data;
    },
  });

  const { data: serverEvents } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<any[]>('/events');
      return response.data;
    },
  });

  const { data: serverServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<any[]>('/services');
      return response.data;
    },
  });

  const eventCategories = useMemo(() => {
    if (!serverCategories || serverCategories.length === 0) {
      return [];
    }

    // Filter categories to only show those that have actual merchant events
    const categoriesWithEvents = serverCategories.filter((cat: any) => {
      const catId = cat._id || cat.id;
      return serverEvents?.some((e: any) => {
        const eventCatId = typeof e.categoryId === 'object' ? (e.categoryId?._id || e.categoryId?.id) : e.categoryId;
        return eventCatId === catId;
      });
    });

    // Remove duplicates by name
    const uniqueCategories = categoriesWithEvents.reduce((acc: any[], current: any) => {
      const x = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

    return uniqueCategories.map((cat: any) => ({
      name: cat.name,
      path: `/events?category=${encodeURIComponent(cat.name)}`
    }));
  }, [serverCategories, serverEvents]);

  const { data: serverServiceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const response = await api.get<any[]>('/service-types');
      return response.data;
    },
  });

  const serviceCategories = useMemo(() => {
    const baseServices = [
      { name: "All Services", path: "/events?tab=services" },
    ];
    
    if (!serverServiceTypes || serverServiceTypes.length === 0) {
      return baseServices;
    }

    // Filter service types to only show those that have actual merchant services
    const serviceTypesWithItems = serverServiceTypes.filter((st: any) => {
      return serverServices?.some((s: any) => {
        return s.type?.toLowerCase() === st.name?.toLowerCase();
      });
    });

    // Remove duplicates by name
    const uniqueServiceTypes = serviceTypesWithItems.reduce((acc: any[], current: any) => {
      const x = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
      if (!x) {
        return acc.concat([current]);
      } else {
        return acc;
      }
    }, []);

    const dynamicServices = uniqueServiceTypes.map((st: any) => ({
      name: st.name,
      path: `/events?tab=services&type=${encodeURIComponent(st.name)}`
    }));

    return [...baseServices, ...dynamicServices];
  }, [serverServiceTypes, serverServices]);

  useEffect(() => {
    if (isDashboard) {
      setScrolled(true);
      return;
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isDashboard]);

  const navLinks = [
    { name: "Home", path: "/", icon: Home },
    { 
      name: "Events", 
      path: "/events", 
      icon: Calendar,
      dropdown: eventCategories.length > 0 ? eventCategories : undefined
    },
    { 
      name: "Services", 
      path: "/browse-events?tab=services", 
      icon: Package,
      dropdown: serviceCategories.length > 1 ? serviceCategories : undefined
    },
    { name: "Trending", path: "#trending", icon: Zap },
    { name: "Blogs", path: "#blogs", icon: BookOpen },
    { name: "About Us", path: "#about", icon: Users },
    { name: "Reviews", path: "#testimonials", icon: Star },
    { name: "Contact Us", path: "#contact", icon: Phone },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path.startsWith("#")) return false; 
    
    const [pathOnly, searchOnly] = path.split("?");
    const locationSearch = location.search;

    if (searchOnly) {
      return location.pathname === pathOnly && locationSearch.includes(searchOnly);
    }

    if (path !== "/" && (location.pathname.startsWith(path) || (path === "/events" && location.pathname === "/events"))) {
      // Avoid highlighting 'Events' if we're on 'Services' (which has ?tab=services)
      if (path === "/events" && locationSearch.includes("tab=services")) return false;
      return true;
    }
    return false;
  };

  const handleLinkClick = (path: string) => {
    if (path.startsWith("#")) {
      if (location.pathname === "/") {
        const element = document.querySelector(path);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        navigate("/" + path);
      }
    } else {
      navigate(path);
    }
  };

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await api.get<any[]>('/notifications', {
        params: { userId: user.id }
      });
      return response.data;
    },
    enabled: !!user?.id,
  });

  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead).length || 0;
  }, [notifications]);

  const handleNotificationClick = async (notif: any) => {
    try {
      // Mark as read
      await api.patch(`/notifications/${notif._id || notif.id}/read`);
      refetchNotifications();

      // Navigate based on type or actionUrl
      if (notif.actionUrl) {
        navigate(notif.actionUrl);
      } else if (notif.type === 'booking') {
        navigate(user?.role === 'customer' ? '/dashboard/my-bookings' : '/dashboard/merchant-bookings');
      } else if (notif.type === 'event') {
        navigate('/dashboard/browse-events');
      } else if (notif.type === 'payment') {
        navigate('/dashboard/billing-payments');
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  if (isDashboard) {
    return (
      <nav className="relative bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-gray-100 transition-colors" />
          <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />
          <h1 className="text-lg font-display font-bold text-gray-900 capitalize">
            {user?.role} <span className="text-gray-400 font-normal">Dashboard</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative rounded-full text-gray-600 hover:bg-gray-100"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] gradient-primary text-white border-2 border-white">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2 p-0 rounded-2xl overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-[10px] h-auto p-0"
                    onClick={async () => {
                      await api.patch(`/notifications/read-all?userId=${user?.id}`);
                      refetchNotifications();
                    }}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notif) => (
                    <div 
                      key={notif._id || notif.id} 
                      className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <p className="text-sm font-semibold">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No notifications yet.
                  </div>
                )}
              </div>
              <div className="p-3 text-center border-t border-gray-100">
                <Button variant="ghost" size="sm" className="text-xs text-primary font-bold" onClick={() => navigate("/dashboard/notifications")}>
                  View All Notifications
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-none">{user?.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">{user?.role}</p>
                </div>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  {(user as any)?.profileImage ? (
                    <img src={(user as any).profileImage} alt={user?.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full gradient-primary flex items-center justify-center text-white font-bold">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mt-2" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard/profile-settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    );
  }

  return (
    <nav 
      className={`${isDashboard ? "relative bg-white border-b border-gray-100" : "fixed top-0 left-0 right-0 z-50 transition-all duration-300"} px-4 md:px-8 py-3 ${
        !isDashboard && (scrolled 
          ? "bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm py-2" 
          : "bg-transparent py-4")
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Menu Toggle (Hamburger) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`lg:hidden rounded-full ${scrolled ? "text-gray-900" : "text-white hover:bg-white/10"}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </Button>

          {isDashboard && (
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-11 w-11 rounded-xl hover:bg-gray-100 transition-colors" />
              <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block" />
            </div>
          )}
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <PartyPopper className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <span className={`text-lg md:text-xl font-display font-bold tracking-tight ${scrolled || isDashboard ? "text-gray-900" : "text-white"}`}>
              Event<span className="text-primary">Hub</span>
            </span>
          </Link>
          
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => (
            link.dropdown ? (
              <DropdownMenu key={link.name}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 outline-none ${
                      isActive(link.path)
                        ? scrolled 
                          ? "text-primary bg-primary/5" 
                          : "text-white bg-white/20 shadow-sm"
                        : scrolled 
                          ? "text-gray-600 hover:text-primary hover:bg-gray-50" 
                          : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {link.name}
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-2 mt-2 rounded-2xl border-none shadow-xl backdrop-blur-xl bg-white/95">
                  {link.dropdown.map((item: any) => (
                    <DropdownMenuItem 
                      key={item.name} 
                      className="rounded-xl focus:bg-primary/5 focus:text-primary cursor-pointer py-2.5"
                      onClick={() => navigate(item.path)}
                    >
                      {item.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                key={link.name}
                onClick={() => handleLinkClick(link.path)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? scrolled 
                      ? "text-primary bg-primary/5" 
                      : "text-white bg-white/20 shadow-sm"
                    : scrolled 
                      ? "text-gray-600 hover:text-primary hover:bg-gray-50" 
                      : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.name}
              </button>
            )
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Search Toggle (Desktop) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`hidden md:flex rounded-full ${scrolled || isDashboard ? "text-gray-600" : "text-white hover:bg-white/10"}`}
            onClick={() => navigate("/browse-events")}
          >
            <Search className="h-6 w-6" />
          </Button>

          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`relative rounded-full ${scrolled ? "text-gray-600" : "text-white hover:bg-white/10"}`}
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] gradient-primary text-white border-2 border-white">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 mt-2 p-0 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-[10px] h-auto p-0"
                        onClick={async () => {
                          await api.patch(`/notifications/read-all?userId=${user?.id}`);
                          refetchNotifications();
                        }}
                      >
                        Mark all as read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications && notifications.length > 0 ? (
                      notifications.slice(0, 5).map((notif) => (
                        <div 
                          key={notif._id || notif.id} 
                          className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-primary/5' : ''}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <p className="text-sm font-semibold">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-center border-t border-gray-100">
                    <Button variant="ghost" size="sm" className="text-xs text-primary font-bold" onClick={() => navigate("/dashboard/notifications")}>
                      View All Notifications
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                    {(user as any)?.profileImage ? (
                      <img src={(user as any).profileImage} alt={user?.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full gradient-primary flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 mt-2" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/profile-settings")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button 
                className="gradient-primary text-white font-medium shadow-lg shadow-primary/20 border-none rounded-full px-6"
                onClick={() => navigate("/login")}
              >
                Join Now
              </Button>
            </div>
          )}

          {/* Mobile Search Toggle (Visible on mobile) */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`lg:hidden rounded-full ${scrolled || isDashboard ? "text-gray-600" : "text-white hover:bg-white/10"}`}
            onClick={() => navigate("/browse-events")}
          >
            <Search className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-xl animate-in slide-in-from-top duration-300 z-[100] max-h-[80vh] overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* User Profile in Mobile Menu */}
            {isAuthenticated ? (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-primary/20">
                  {(user as any)?.profileImage ? (
                    <img src={(user as any).profileImage} alt={user?.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 leading-none">{user?.name}</p>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">{user?.role}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
              <Button 
                className="rounded-xl gradient-primary text-white h-11 font-bold shadow-md border-none"
                onClick={() => {
                  navigate("/login");
                  setMobileMenuOpen(false);
                }}
              >
                Join Now
              </Button>
            </div>
            )}

            <div className="space-y-1">
              {navLinks.map((link) => (
              <div key={link.name}>
                {link.dropdown ? (
                  <div className="space-y-1">
                    <button
                      onClick={() => setExpandedSection(expandedSection === link.name ? null : link.name)}
                      className="flex items-center justify-between w-full p-3 text-sm font-bold text-gray-400 uppercase tracking-wider hover:bg-gray-50 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <link.icon className="h-6 w-6" />
                        {link.name}
                      </div>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSection === link.name ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedSection === link.name && (
                      <div className="space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {link.dropdown.slice(0, 10).map((item: any) => (
                          <Link
                            key={item.name}
                            to={item.path}
                            className="flex items-center gap-3 p-3 pl-11 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      handleLinkClick(link.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 p-3 w-full rounded-xl text-sm font-medium transition-all ${
                      isActive(link.path)
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:bg-gray-50 text-left"
                    }`}
                  >
                    <link.icon className="h-6 w-6" />
                    {link.name}
                  </button>
                )}
              </div>
              ))}
            </div>

            {isAuthenticated && (
              <div className="pt-4 border-t border-gray-100">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 p-3 rounded-xl text-destructive hover:bg-red-50 hover:text-red-600 transition-all font-bold"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-6 w-6" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;