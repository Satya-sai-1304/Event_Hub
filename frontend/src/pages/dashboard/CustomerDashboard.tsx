import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { type Event, type Booking } from "@/data/mockData";
import EventCard from "@/components/EventCard";
import BookingModal from "@/components/BookingModal";
import PaymentModal from "@/components/PaymentModal";
import EventDetailModal from "@/components/EventDetailModal";
import RecommendedEvents from "@/components/RecommendedEvents";
import ContactVendorModal from "@/components/ContactVendorModal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, Ticket, Clock, Loader2, Sparkles, Tag, Percent, Gift, Tags, Users, Heart, ArrowRight, Star, TrendingUp, ChevronRight, MapPin, Navigation, Locate, Cake, Trophy, Music } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useLanguage } from "@/contexts/LanguageContext";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Available coupons
const COUPONS = [
  { code: "EVENT500", discount: 500, minOrder: 5000, description: "₹500 off on orders above ₹5000" },
  { code: "GRAND10", discountPercent: 10, minOrder: 10000, description: "10% off on orders above ₹10000" },
  { code: "FIRSTBOOK", discount: 1000, minOrder: 3000, description: "₹1000 off on your first booking" },
];

// Headline offers
const OFFERS = [
  { icon: "🎉", title: "Summer Special", text: "Get 15% off on all outdoor events!", color: "from-blue-500 to-cyan-400" },
  { icon: "💒", title: "Wedding Season", text: "Book now & save up to ₹5000", color: "from-pink-500 to-rose-400" },
  { icon: "🎂", title: "Birthday Bash", text: "Free decoration worth ₹2000", color: "from-purple-500 to-indigo-400" },
  { icon: "🏢", title: "Corporate Deal", text: "Special rates for 100+ guests", color: "from-orange-500 to-amber-400" },
];

const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [contactVendorOpen, setContactVendorOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string } | null>(null);

  // New Search States
  const [locationSearch, setLocationSearch] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [position, setPosition] = useState<[number, number]>([17.385, 78.4867]); // Default Hyderabad
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setLocationSearch(data.display_name);
      } else {
        setLocationSearch(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setLocationSearch(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapLocation({ lat: latitude, lng: longitude });
          setPosition([latitude, longitude]);
          getAddressFromCoordinates(latitude, longitude);
          toast.success("Location updated!");
        },
        () => {
          toast.error("Could not get your location.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  function LocationSelector() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setMapLocation({ lat, lng });
        setPosition([lat, lng]);
        getAddressFromCoordinates(lat, lng);
      },
    });
    return null;
  }

  const { data: serverCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<any[]>('/services');
      return response.data;
    },
  });

  const { data: galleryPhotos } = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      const response = await api.get<any[]>('/gallery');
      return response.data;
    },
  });

  const { data: merchants, isLoading: merchantsLoading } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const response = await api.get<any[]>('/merchants');
      return response.data;
    },
  });

  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await api.get('/banners');
      return response.data;
    },
  });

  const activeBanners = useMemo(() => {
    return (banners || []).filter((b: any) => b.isActive);
  }, [banners]);

  const handleBookEvent = (e: Event) => {
    const id = e.id || (e as any)._id;
    let targetUrl = "";
    if (e.eventType === 'full-service') {
      targetUrl = `/book-full-service/${id}`;
    } else if (e.eventType === 'ticketed') {
      targetUrl = `/book-ticketed-event/${id}`;
    } else {
      targetUrl = `/book/event/${id}`;
    }

    if (!user) {
      toast.error("Please login to book events");
      navigate("/login", { state: { from: targetUrl } });
      return;
    }

    navigate(targetUrl);
  };

  const featuredEvents = (events || []).slice(0, 4);
  const popularVendors = useMemo(() => {
    if (!merchants) return [];
    return merchants.slice(0, 4).map(m => ({
      id: m.id || m._id,
      name: m.name,
      services: m.services || [],
      image: m.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`,
      rating: m.rating || 4.5,
      description: m.description || '',
      contact: m.contact || m.email || ''
    }));
  }, [merchants]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const { data: allServiceTypes } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () => {
      const response = await api.get('/service-types');
      return response.data;
    },
  });

  const { data: allBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
  });

  const searchSuggestions = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 1) return [];
    
    const combined = [
      ...(events || []).map(e => ({ ...e, type: 'event' })),
      ...(services || []).map(s => ({ ...s, type: 'service' }))
    ];

    const searchLower = debouncedSearch.toLowerCase();
    return combined.filter(item => {
      const title = (item.title || item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      
      return title.includes(searchLower) || 
             description.includes(searchLower) || 
             category.includes(searchLower);
    }).slice(0, 5);
  }, [debouncedSearch, events, services]);

  const quickServiceItems = [
    { id: 'wedding', label: 'Wedding', icon: Heart, color: 'bg-pink-100 text-pink-600', url: '/dashboard/browse-events?category=Wedding&tab=events' },
    { id: 'birthday', label: 'Birthday', icon: Cake, color: 'bg-purple-100 text-purple-600', url: '/dashboard/browse-events?category=Birthday&tab=events' },
    { id: 'sports', label: 'Sports', icon: Trophy, color: 'bg-blue-100 text-blue-600', url: '/dashboard/browse-events?category=Sports&tab=events' },
    { id: 'live-events', label: 'Live Events', icon: Music, color: 'bg-orange-100 text-orange-600', url: '/dashboard/browse-events?status=live&tab=events' },
    { id: 'all-categories', label: 'All', icon: Tags, color: 'bg-gray-100 text-gray-600', url: '/dashboard/browse-events?tab=events' },
  ];

  const myBookings = (allBookings || []).filter((b) => b.customerId === user?.id) || [];
  const pendingRatings = myBookings.filter(b => (b.status === 'confirmed' || b.status === 'completed' || b.status === 'paid') && new Date(b.eventDate) < new Date() && !b.isRated);

  return (
    <div className="space-y-4 animate-fade-in pb-4 px-3">
      {/* Compact Single-Row Search Bar */}
      <section className="relative z-50">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl shadow-sm px-3 py-2 h-11">
          {/* Location selector — compact, fixed width */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 shrink-0 max-w-[110px] text-left group">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">
                  {locationSearch || "Location"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] sm:w-[450px] p-0 rounded-2xl shadow-2xl border-none overflow-hidden" align="start">
              <div className="p-4 border-b bg-background">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-primary font-bold hover:bg-primary/5 p-3 rounded-xl gap-3"
                  onClick={handleUseMyLocation}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Locate className="h-4 w-4" />
                  </div>
                  {t('use_my_location')}
                </Button>
                <div className="mt-3">
                  <Input 
                    placeholder="Or enter manually..." 
                    className="rounded-xl"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="h-[300px] w-full relative">
                <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {mapLocation && <Marker position={[mapLocation.lat, mapLocation.lng]} />}
                  <LocationSelector />
                </MapContainer>
                <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-lg text-[10px] text-center font-medium shadow-sm z-[1000]">
                  Click on map to pick location
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Divider */}
          <div className="w-px h-5 bg-border shrink-0" />

          {/* Search input — takes remaining width */}
          <div className="flex-1 relative flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              className="border-none shadow-none focus-visible:ring-0 text-sm p-0 h-6 bg-transparent placeholder:text-muted-foreground"
              placeholder="Search events, services..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(e.target.value.length >= 1);
              }}
              onFocus={() => { if (search.length >= 1) setShowSuggestions(true); }}
            />
            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-background rounded-xl shadow-2xl border border-border overflow-hidden z-50 min-w-[260px]"
                  >
                    {searchSuggestions.length > 0 ? (
                      <>
                        <div className="p-2 space-y-1">
                          {searchSuggestions.map((item: any) => (
                            <div
                              key={item.id || item._id}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 cursor-pointer transition-colors"
                              onClick={() => {
                                const id = item.id || item._id;
                                if (item.type === 'service') navigate(`/book/service/${id}`);
                                else handleBookEvent(item);
                                setShowSuggestions(false);
                              }}
                            >
                              <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-border">
                                <img src={item.image} alt={item.title || item.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold truncate">{item.title || item.name}</h4>
                                <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-primary/5 text-primary border-none font-bold uppercase">
                                  {item.category || item.type}
                                </Badge>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                          ))}
                        </div>
                        <div
                          className="p-2 bg-muted/50 border-t border-border text-center cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            navigate(`/dashboard/browse-events?search=${encodeURIComponent(search)}&location=${encodeURIComponent(locationSearch)}`);
                            setShowSuggestions(false);
                          }}
                        >
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">View all results</p>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center">
                        <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm font-semibold">No results found</p>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Search button — icon only on mobile */}
          <button
            className="shrink-0 h-7 w-7 rounded-lg gradient-primary flex items-center justify-center shadow-sm"
            onClick={() => {
              if (search || locationSearch) {
                navigate(`/dashboard/browse-events?search=${encodeURIComponent(search)}&location=${encodeURIComponent(locationSearch)}`);
              }
            }}
          >
            <Search className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </section>

      {/* Quick Services Section - BookMyShow Style */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold tracking-tight text-gray-500 italic flex items-center gap-2">
            "Your celebration, our inspiration—making every moment extraordinary."
          </h2>
        </div>
        <div className="grid grid-cols-5 gap-2 items-start">
          {quickServiceItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.url)}
              className="flex flex-col items-center gap-2 group w-full"
            >
              <div className={`h-10 w-10 min-[360px]:h-12 min-[360px]:w-12 sm:h-14 sm:w-14 rounded-full ${item.color.split(' ')[0]} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md border-2 border-white`}>
                <item.icon className={`h-5 w-5 min-[360px]:h-6 min-[360px]:w-6 sm:h-7 sm:w-7 ${item.color.split(' ')[1]}`} />
              </div>
              <span className="text-[9px] min-[360px]:text-[10px] font-bold text-gray-700 group-hover:text-primary transition-colors text-center leading-tight px-1 truncate w-full">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Latest Bookings Section - List Layout */}
      {myBookings.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" /> Latest Bookings
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/my-bookings")} className="text-primary hover:bg-primary/5 font-bold group">
              View All <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          <Card className="rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100/50 overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardContent className="p-0 divide-y divide-gray-100">
              {myBookings.slice(0, 3).map((booking: Booking, index: number) => (
                <div 
                  key={booking.id} 
                  className="flex items-center gap-6 p-5 hover:bg-white transition-all cursor-pointer group"
                  onClick={() => navigate(`/dashboard/my-bookings?booking=${booking.id || (booking as any)._id}`)}
                >
                  <div className="h-14 w-14 rounded-2xl bg-primary/5 flex flex-col items-center justify-center shrink-0 border border-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <span className="text-[9px] font-bold uppercase group-hover:text-white/80">{new Date(booking.eventDate).toLocaleDateString("en-IN", { month: "short" })}</span>
                    <span className="text-lg font-black">{new Date(booking.eventDate).getDate()}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                        {booking.eventTitle || booking.serviceName || "Untitled Service"}
                      </h3>
                      <span className="text-sm font-bold text-gray-900">₹{booking.totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[9px] py-0 h-4 border-none capitalize px-2 font-bold ${
                        booking.status === 'confirmed' || booking.status === 'paid' ? 'bg-green-50 text-green-600' :
                        booking.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {booking.location || 'Location not specified'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground pr-4 border-l border-gray-50 pl-6 ml-auto">
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-gray-400">Order ID</span>
                      <span className="font-mono text-gray-600 uppercase">#{booking.id.slice(-6)}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Admin Banners Section (Moved Down) */}
      {activeBanners.length > 0 && (
        <section className="relative rounded-[2.5rem] overflow-hidden shadow-2xl h-[300px] md:h-[400px]">
          <Swiper
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            loop={true}
            className="w-full h-full"
          >
            {activeBanners.map((banner: any) => (
              <SwiperSlide key={banner._id || banner.id}>
                <div 
                  className="w-full h-full relative cursor-pointer group"
                  onClick={() => banner.link && window.open(banner.link, '_blank')}
                >
                  <img 
                    src={banner.image} 
                    alt={banner.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-10 left-10 right-10">
                    <motion.h2 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl md:text-5xl font-display font-bold text-white mb-2"
                    >
                      {banner.title}
                    </motion.h2>
                    {banner.link && (
                      <Button className="mt-4 gradient-primary border-none text-white rounded-xl px-6">
                        Learn More <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      )}

      {/* Pending Ratings Alert */}
      {pendingRatings.length > 0 && (
        <section className="animate-bounce-subtle">
          <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <p className="font-bold text-yellow-900 text-sm">Rate Your Experience!</p>
                  <p className="text-xs text-yellow-700">You have {pendingRatings.length} completed event{pendingRatings.length > 1 ? 's' : ''} waiting for your review.</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl"
                onClick={() => navigate("/dashboard/my-bookings?rate=" + pendingRatings[0].id)}
              >
                Rate Now
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Featured Events Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-500 fill-yellow-500" /> Featured Events
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/events")} className="text-primary hover:bg-primary/5 font-bold group">
            View All <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
        {isLoading ? (
          <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id || (event as any)._id}
                event={event}
                showActions="customer"
                onBook={handleBookEvent}
                onViewDetails={(e) => {
                  setDetailEvent(e);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
        {!isLoading && featuredEvents.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No events available</p>
        )}
      </section>

      {/* Popular Vendors Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" /> Popular Vendors
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/vendors")} className="text-primary hover:bg-primary/5 font-bold group">
            Browse All <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {merchantsLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-3xl" />
            ))
          ) : popularVendors.length === 0 ? (
            <div className="col-span-4 text-center py-10 bg-muted/20 rounded-3xl border-2 border-dashed">
              <p className="text-muted-foreground">No vendors available at the moment.</p>
            </div>
          ) : (
            popularVendors.map((vendor) => (
              <div key={vendor.id} className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-primary/5 group-hover:ring-primary/20 transition-all duration-500">
                      <img src={vendor.image} alt={vendor.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                      <Star className="h-3 w-3 fill-current" />
                      {vendor.rating.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors">{vendor.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{vendor.description}</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                      {vendor.services.slice(0, 3).map((s: string, i: number) => (
                        <span key={i} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white transition-all font-bold" 
                    onClick={() => {
                      setSelectedVendor({ id: vendor.id, name: vendor.name });
                      setContactVendorOpen(true);
                    }}
                  >
                    Contact Vendor
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Trending Decorations Gallery */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-display font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" /> Latest Blogs & Gallery
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/gallery")} className="text-primary hover:bg-primary/5 font-bold group">
            View All Gallery <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
        <Swiper
          modules={[Autoplay, Pagination]}
          spaceBetween={24}
          slidesPerView="auto"
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          grabCursor={true}
          className="w-full pb-12"
        >
          {(galleryPhotos || []).slice(0, 10).map((photo: any) => (
            <SwiperSlide key={photo._id || photo.id} className="!w-[280px]">
              <div className="h-48 rounded-3xl overflow-hidden relative group cursor-pointer shadow-lg bg-muted">
                <img src={photo.imageUrl} alt={photo.caption} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-5">
                  <p className="text-white font-bold text-sm truncate">{photo.serviceName}</p>
                  <p className="text-white/70 text-xs truncate mt-1">{photo.caption}</p>
                </div>
              </div>
            </SwiperSlide>
          ))}
          {(!galleryPhotos || galleryPhotos.length === 0) && [1,2,3,4,5].map(i => (
            <SwiperSlide key={i} className="!w-[280px]">
              <div className="h-48 rounded-3xl bg-muted animate-pulse" />
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* Available Coupons */}
      <div className="pt-8 border-t">
        <h2 className="text-lg font-display font-semibold mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Offers & Coupons
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COUPONS.map((coupon) => (
            <div key={coupon.code} className="relative group overflow-hidden bg-white rounded-xl border-2 border-dashed border-primary/20 p-4 hover:border-primary/40 transition-colors">
              <div className="absolute -right-2 -top-2 bg-primary/5 rounded-full h-12 w-12 group-hover:scale-150 transition-transform" />
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="font-mono text-sm bg-primary/10 text-primary border-none">{coupon.code}</Badge>
                <Percent className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-medium text-gray-700">{coupon.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Min. order: ₹{coupon.minOrder.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <RecommendedEvents customerId={user?.id} limit={4} />

      <BookingModal 
        event={selectedEvent} 
        open={bookingOpen} 
        onOpenChange={setBookingOpen}
        onBookingComplete={(booking) => {
          if (booking.eventType === 'ticketed') {
            setSelectedBooking(booking);
            setPaymentOpen(true);
          }
        }}
      />
      <PaymentModal booking={selectedBooking} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <EventDetailModal
        event={detailEvent}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onBook={(e) => handleBookEvent(e)}
      />
      <ContactVendorModal
        vendor={selectedVendor}
        open={contactVendorOpen}
        onOpenChange={setContactVendorOpen}
      />
    </div>
  );
};

export default CustomerDashboard;
