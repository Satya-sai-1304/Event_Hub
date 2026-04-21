import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { type Event } from "@/data/mockData";
import EventCard from "@/components/EventCard";
import EventDetailModal from "@/components/EventDetailModal";
import ContactVendorModal from "@/components/ContactVendorModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Search, CalendarDays, Filter, Loader2, Sparkles,
  Music, Camera, PartyPopper, Heart, Baby, Briefcase,
  Tag, CheckCircle2, TrendingUp, MapPin, Info, ArrowLeft
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

import { useLanguage } from "@/contexts/LanguageContext";

interface Service {
  _id: string;
  id: string;
  name: string;
  image: string;
  description: string;
  category: string;
  type: string;
  price: number;
  perPlatePrice?: number;
  merchantId: string;
}

interface Merchant {
  id: string;
  name: string;
  services: string[];
  description: string;
  rating?: number;
  contact: string;
  profileImage?: string;
}

const BrowseEventsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "events");
  
  // Read search and location from query params
  const searchQuery = searchParams.get("search") || "";
  const locationQuery = searchParams.get("location") || "";
  
  const [search, setSearch] = useState(searchQuery);
  const [locationSearch, setLocationSearch] = useState(locationQuery);
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");

  const { data: serverCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  // Sync local search state with URL params when they change externally
  useEffect(() => {
    setSearch(searchQuery);
    setLocationSearch(locationQuery);
    
    const categoryParam = searchParams.get("category");
    if (categoryParam && serverCategories) {
      const foundCategory = serverCategories.find((c: any) => 
        c.name.toLowerCase() === categoryParam.toLowerCase()
      );
      if (foundCategory) {
        setCategoryFilter(foundCategory.name);
      }
    } else if (!categoryParam) {
      setCategoryFilter("all");
    }

    setStatusFilter(searchParams.get("status") || "all");
  }, [searchQuery, locationQuery, searchParams, serverCategories]);

  // Update URL when search, location or category changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search === searchQuery && locationSearch === locationQuery && categoryFilter === (searchParams.get("category") || "all")) return;

      const params = new URLSearchParams(searchParams);
      if (search) {
        params.set("search", search);
        // Track search activity
        if (user?.id) {
          api.post(`/users/${user.id}/activity`, {
            type: 'search',
            searchQuery: search
          }).catch(console.error);
        }
      }
      else params.delete("search");
      
      if (locationSearch) params.set("location", locationSearch);
      else params.delete("location");

      if (categoryFilter !== "all") params.set("category", categoryFilter);
      else params.delete("category");
      
      navigate(`/dashboard/browse-events?${params.toString()}`, { replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [search, locationSearch, categoryFilter, navigate, searchParams, searchQuery, locationQuery, user?.id]);

  // Track category filter changes
  useEffect(() => {
    if (categoryFilter !== "all" && user?.id) {
      api.post(`/users/${user.id}/activity`, {
        type: 'click',
        category: categoryFilter
      }).catch(console.error);
    }
  }, [categoryFilter, user?.id]);

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', searchQuery, locationQuery],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events', {
        params: {
          search: searchQuery,
          location: locationQuery
        }
      });
      return response.data;
    },
  });

  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['merchants', searchQuery],
    queryFn: async () => {
      const response = await api.get<Merchant[]>('/merchants', {
        params: {
          search: searchQuery
        }
      });
      return response.data;
    },
  });

  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', searchQuery],
    queryFn: async () => {
      const response = await api.get<Service[]>('/services', {
        params: {
          search: searchQuery
        }
      });
      return response.data;
    },
  });

  useEffect(() => {
    const category = searchParams.get("category");
    const tab = searchParams.get("tab");
    const eventId = searchParams.get("eventId");
    const book = searchParams.get("book");
    const type = searchParams.get("type");
    const s = searchParams.get("search");
    const l = searchParams.get("location");

    if (s) setSearch(s);
    if (l) setLocationSearch(l);
    
    if (category && serverCategories) {
      const foundCategory = serverCategories.find((c: any) => 
        c.name.toLowerCase() === category.toLowerCase()
      );
      if (foundCategory) {
        setCategoryFilter(foundCategory.name);
      }
    }

    if (tab) {
      setActiveTab(tab);
    }

    if (type) {
      setServiceTypeFilter(type);
      setActiveTab('services');
    }

    if (eventId && events) {
      const event = events.find(e => (e as any)._id === eventId || e.id === eventId);
      if (event) {
        setDetailEvent(event);
        if (book === "true") {
          const id = event.id || (event as any)._id;
          if (event.eventType === 'full-service') {
            navigate(`/book-full-service/${id}`);
          } else if (event.eventType === 'ticketed') {
            navigate(`/book-ticketed-event/${id}`);
          } else {
            navigate(`/book/event/${id}`);
          }
        } else {
          const id = event.id || (event as any)._id;
          navigate(`/book/event/${id}`);
        }
      }
    }
  }, [searchParams, serverCategories, events]);
  const [dateFilter, setDateFilter] = useState("");
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactVendorOpen, setContactVendorOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string } | null>(null);
  const [page] = useState(1);
  const perPage = 9;

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => {
      // Backend already filters by search and location, but local filters might still be applied
      const eventCatId = typeof e.categoryId === 'object' ? (e.categoryId?._id || e.categoryId?.id) : e.categoryId;
      const eventCatName = (typeof e.categoryId === 'object' ? e.categoryId?.name : 
                           serverCategories?.find((c: any) => (c._id || c.id) === eventCatId)?.name || "").toLowerCase();
      
      // Category Matching: If categoryFilter is "all", it matches everything UNLESS categoryQuery is present.
      // If it's a specific name, we match any category with the same name (case-insensitive).
      const categoryQuery = searchParams.get("category")?.toLowerCase();
      
      let matchCat = categoryFilter === "all";
      if (categoryFilter !== "all") {
        matchCat = eventCatName === categoryFilter.toLowerCase();
      }
      
      // If there's a category query in the URL, we use it to filter if categoryFilter is "all"
      if (categoryQuery && categoryFilter === "all") {
        const eventTitle = (e.title || "").toLowerCase();
        // Match if category name matches OR title contains the word
        matchCat = eventCatName === categoryQuery || eventTitle.includes(categoryQuery);
      }
      
      const matchDate = !dateFilter || new Date(e.eventDate).toISOString().split('T')[0] === dateFilter;
      const matchPrice = e.price >= priceRange[0] && (priceRange[1] === 100000 || e.price <= priceRange[1]);
      
      // Status and Event Type Filters
      const typeQuery = searchParams.get("type")?.toLowerCase();
      const statusQuery = searchParams.get("status")?.toLowerCase();
      const matchStatus = statusFilter === "all" || e.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchType = !typeQuery || e.eventType?.toLowerCase() === typeQuery;

      // Special rule: Live events must NOT be full-service events
      if (statusQuery === 'live' && e.eventType === 'full-service') {
        return false;
      }
      
      return matchCat && matchDate && matchPrice && matchStatus && matchType;
    });
  }, [events, categoryFilter, dateFilter, priceRange, searchParams, serverCategories, statusFilter]);

  // Group events by category only when search or location filter is active
  const hasActiveSearch = searchQuery || locationSearch;
  
  const groupedEvents = useMemo(() => {
    if (!hasActiveSearch) return null; // Don't group when no search
    
    const groups: Record<string, any[]> = {};
    filteredEvents.forEach((e) => {
      // Get category name from categoryId
      const eventCatId = typeof e.categoryId === 'object' ? (e.categoryId?._id || e.categoryId?.id) : e.categoryId;
      const category = serverCategories?.find((cat: any) => 
        (cat._id || cat.id) === eventCatId
      )?.name || 'Other Events';
      
      if (!groups[category]) groups[category] = [];
      groups[category].push(e);
    });
    return groups;
  }, [filteredEvents, hasActiveSearch, serverCategories]);

  const filteredMerchants = useMemo(() => {
    if (!merchants) return [];
    return merchants.filter((m) => {
      const matchService = serviceTypeFilter === "all" || (m.services || []).some(s => s.toLowerCase().includes(serviceTypeFilter.toLowerCase()));
      return matchService;
    });
  }, [merchants, serviceTypeFilter]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s) => {
      // Only show services that have a merchantId (actual merchant added services)
      if (!s.merchantId) return false;
      
      const matchCat = categoryFilter === "all" || s.category === categoryFilter;
      const matchType = serviceTypeFilter === "all" || s.type.toLowerCase().includes(serviceTypeFilter.toLowerCase());
      const basePrice = s.type?.toLowerCase().includes('catering')
        ? (s.perPlatePrice ?? s.price ?? 0)
        : (s.price ?? 0);
      const matchPrice = basePrice >= priceRange[0] && (priceRange[1] === 100000 || basePrice <= priceRange[1]);
      return matchCat && matchType && matchPrice;
    });
  }, [services, categoryFilter, serviceTypeFilter, priceRange]);

  const paginatedEvents = (filteredEvents || []).slice(0, page * perPage);

  const serviceTypes = useMemo(() => {
    if (!services) return [];
    const types = new Set(services.map(s => s.type));
    return Array.from(types);
  }, [services]);

  const categoryIcons: Record<string, any> = {
    "Wedding": Heart,
    "Birthday": Baby,
    "Corporate": Briefcase,
    "Party": PartyPopper,
    "Concert": Music,
    "Festival": Sparkles,
    "Workshop": Info,
    "Exhibition": Camera,
    "Sports": TrendingUp,
    "Other": Tag
  };

  return (
    <div className="space-y-4 animate-fade-in px-2 py-3 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto bg-background text-foreground transition-colors duration-300">
      <div className="flex items-center gap-2 mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)} 
          className="text-muted-foreground hover:text-primary p-0 h-auto font-bold flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </Button>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground">{t('explore_events_services')}</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-lg">{t('find_perfect_celebration')}</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-muted">
          <TabsTrigger value="events" className="data-[state=active]:bg-background">{t('events')}</TabsTrigger>
          <TabsTrigger value="services" className="data-[state=active]:bg-background">{t('services')}</TabsTrigger>
          <TabsTrigger value="vendors" className="data-[state=active]:bg-background">{t('vendors')}</TabsTrigger>
        </TabsList>

        <Card className="mb-6 border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">{t('filters')}</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder={activeTab === 'events' ? t('search_events') : t('search_services')} 
                  className="pl-10 bg-background text-foreground border-border shadow-sm" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>

              {activeTab === 'events' && (
                <div className="relative hidden sm:flex">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={t('search_location')} 
                    className="pl-10 bg-background text-foreground border-border shadow-sm w-full" 
                    value={locationSearch} 
                    onChange={(e) => setLocationSearch(e.target.value)} 
                  />
                </div>
              )}

              {activeTab === 'events' ? (
                <>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-background text-foreground border-border shadow-sm">
                      <SelectValue placeholder={t('all_categories')} />
                    </SelectTrigger>
                    <SelectContent className="w-auto max-w-[95vw]">
                      <div className="grid grid-flow-col grid-rows-6 gap-x-2 p-1 min-w-[200px]">
                        <SelectItem value="all">{t('all_categories')}</SelectItem>
                        {Array.from(new Set((serverCategories || []).map((cat: any) => cat.name.toLowerCase()))).map((catName: string) => {
                          const originalCat = serverCategories.find((c: any) => c.name.toLowerCase() === catName);
                          return (
                            <SelectItem key={catName} value={originalCat.name}>
                              {originalCat.name}
                            </SelectItem>
                          );
                        })}
                      </div>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="date"
                      className="pl-10 bg-background text-foreground border-border shadow-sm" 
                      value={dateFilter} 
                      onChange={(e) => setDateFilter(e.target.value)} 
                    />
                  </div>
                </>
              ) : (
                <>
                  <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                    <SelectTrigger className="bg-background text-foreground border-border shadow-sm">
                      <SelectValue placeholder={t('all_service_types')} />
                    </SelectTrigger>
                    <SelectContent className="w-auto max-w-[95vw]">
                      <div className="grid grid-flow-col grid-rows-6 gap-x-2 p-1 min-w-[200px]">
                        <SelectItem value="all">{t('all_service_types')}</SelectItem>
                        {serviceTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                  <div className="lg:col-span-1"></div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t('max_price')}: {priceRange[1] === 100000 ? t('any_price') : `₹${priceRange[1].toLocaleString()}`}</Label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100000"
                  step="1000"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm font-medium w-24 text-right text-muted-foreground">
                  {priceRange[1] === 100000 ? t('any_price') : `₹${priceRange[1].toLocaleString()}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="events" className="mt-0">
          {eventsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed border-border">
              <p className="text-muted-foreground font-bold">No events available</p>
            </div>
          ) : hasActiveSearch && groupedEvents ? (
            // Show grouped by category when search is active
            <div className="space-y-8">
              {Object.entries(groupedEvents).map(([category, catEvents]) => (
                <div key={category} className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground mb-3">{category}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                    {catEvents.map((event) => (
                      <div key={event.id} className="min-w-0">
                        <EventCard
                          event={event}
                          showActions="customer"
                          onViewDetails={(e) => {
                            setDetailEvent(e);
                            setDetailOpen(true);
                          }}
                          onBook={(e) => {
                            const id = e.id || (e as any)._id;
                            let targetUrl = "";
                            if (e.eventType === 'full-service') {
                              targetUrl = `/book-full-service/${id}`;
                            } else if (e.eventType === 'ticketed') {
                              targetUrl = `/book-ticketed-event/${id}`;
                            } else {
                              targetUrl = `/book/event/${id}`;
                            }

                            if (!isAuthenticated) {
                              toast.error("Please login to book events");
                              navigate("/login", { state: { from: targetUrl } });
                              return;
                            }
                            
                            navigate(targetUrl);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Show flat grid when no search
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {paginatedEvents.map((event) => (
                <div key={event.id} className="min-w-0">
                  <EventCard
                    event={event}
                    showActions="customer"
                    onViewDetails={(e) => {
                      setDetailEvent(e);
                      setDetailOpen(true);
                    }}
                    onBook={(e) => {
                      const id = e.id || (e as any)._id;
                      let targetUrl = "";
                      if (e.eventType === 'full-service') {
                        targetUrl = `/book-full-service/${id}`;
                      } else if (e.eventType === 'ticketed') {
                        targetUrl = `/book-ticketed-event/${id}`;
                      } else {
                        targetUrl = `/book/event/${id}`;
                      }

                      if (!isAuthenticated) {
                        toast.error("Please login to book events");
                        navigate("/login", { state: { from: targetUrl } });
                        return;
                      }
                      
                      navigate(targetUrl);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="mt-0">
          {servicesLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed border-border">
              <p className="text-muted-foreground font-bold">No services available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {filteredServices.map((service) => {
                const Icon = categoryIcons[service.category] || Sparkles;
                return (
                  <Card key={service._id || service.id} className="overflow-hidden hover:shadow-lg transition-shadow border-border bg-card flex flex-col">
                    <div className="aspect-[4/3] bg-muted relative">
                      {service.image ? (
                        <img src={service.image} alt={service.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/5">
                          <Sparkles className="h-8 w-8 text-primary/20" />
                        </div>
                      )}
                      <Badge className="absolute top-2 right-2 bg-background/90 text-primary hover:bg-background border-border text-[9px] px-2 py-0.5">
                        {service.type}
                      </Badge>
                    </div>
                    <CardContent className="p-3 sm:p-5 flex flex-col flex-1">
                      <div className="mb-2">
                        <h3 className="font-bold text-sm sm:text-lg text-foreground line-clamp-1">{service.name || "Unnamed Service"}</h3>
                        <p className="text-[10px] sm:text-xs text-primary font-medium">{service.category || "Uncategorized"}</p>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold">Starting</p>
                          <span className="text-primary font-black text-sm sm:text-lg">
                            ₹{(service.type?.toLowerCase().includes('catering') 
                              ? (service.perPlatePrice || service.price || 0) 
                              : (service.price || 0)).toLocaleString()}
                            {service.type?.toLowerCase().includes('catering') && <span className="text-[9px] ml-0.5">/plate</span>}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 hidden sm:block">
                        {service.description || "No description provided."}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 mt-auto">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full rounded-xl border-border text-foreground hover:bg-muted text-[10px] h-8 px-1" 
                          onClick={() => {
                            navigate(`/book-service/${service._id || service.id}`);
                          }}
                        >
                          <Info className="h-3 w-3 mr-0.5 shrink-0" />
                          <span className="truncate">Details</span>
                        </Button>
                        <Button 
                          size="sm"
                          className="w-full rounded-xl gradient-primary text-white shadow-sm border-none text-[10px] h-8 px-1"
                          onClick={() => {
                            const targetUrl = `/book-service/${service._id || service.id}`;
                            if (!isAuthenticated) {
                              toast.error("Please login to book services");
                              navigate("/login", { state: { from: targetUrl } });
                              return;
                            }
                            navigate(targetUrl);
                          }}
                        >
                          <span className="truncate">Book Now</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vendors" className="mt-0">
          {merchantsLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredMerchants.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed border-border">
              <p className="text-muted-foreground">No vendors found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMerchants.map((merchant) => (
                <Card key={merchant.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-border bg-card">
                  <div className="p-6 flex flex-col items-center text-center space-y-4">
                    <div className="relative cursor-pointer" onClick={() => navigate(`/vendor/${merchant.id}`)}>
                      <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-primary/5 group-hover:ring-primary/20 transition-all duration-500 bg-muted flex items-center justify-center">
                        {merchant.profileImage ? (
                          <img src={merchant.profileImage} alt={merchant.name} className="h-full w-full object-cover" />
                        ) : (
                          <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${merchant.name}`} alt={merchant.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      {merchant.rating && (
                        <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                          <Heart className="h-3 w-3 fill-current" />
                          {merchant.rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div className="cursor-pointer" onClick={() => navigate(`/vendor/${merchant.id}`)}>
                      <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">{merchant.name}</h3>
                      <div className="flex flex-wrap justify-center gap-2 mt-3">
                        {merchant.services.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] uppercase font-bold bg-primary/5 text-primary border-primary/10">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {merchant.description || "No description provided for this vendor."}
                    </p>
                    <div className="w-full pt-4 space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full rounded-xl border-border text-foreground hover:bg-muted font-bold"
                        onClick={() => {
                          setSelectedVendor({ id: merchant.id, name: merchant.name });
                          setContactVendorOpen(true);
                        }}
                      >
                        Contact Vendor
                      </Button>
                      <Button 
                        className="w-full rounded-xl gradient-primary text-white font-bold border-none"
                        onClick={() => navigate(`/vendor/${merchant.id}`)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EventDetailModal
        event={detailEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onBook={(e) => {
          setDetailOpen(false);
          const id = e.id || (e as any)._id;
          let targetUrl = "";
          if (e.eventType === 'full-service') {
            targetUrl = `/book-full-service/${id}`;
          } else if (e.eventType === 'ticketed') {
            targetUrl = `/book-ticketed-event/${id}`;
          } else {
            targetUrl = `/book/event/${id}`;
          }

          if (!isAuthenticated) {
            toast.error("Please login to book events");
            navigate("/login", { state: { from: targetUrl } });
            return;
          }
          
          navigate(targetUrl);
        }}
      />

      <ContactVendorModal
        vendor={selectedVendor}
        open={contactVendorOpen}
        onOpenChange={setContactVendorOpen}
      />
    </div>
  );
};

export default BrowseEventsPage;
