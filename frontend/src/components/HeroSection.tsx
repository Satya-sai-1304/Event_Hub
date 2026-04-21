import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Users, MapPin, Star, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { AnimatePresence } from "framer-motion";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/autoplay";

const FALLBACK_HERO_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80",
    title: "Weddings",
  },
  {
    url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1920&q=80",
    title: "Birthdays",
  },
  {
    url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&q=80",
    title: "Concerts",
  },
  {
    url: "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=1920&q=80",
    title: "Sports",
  },
  {
    url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80",
    title: "Corporate",
  },
];

interface HeroSectionProps {
  onSearch?: (term: string) => void;
}

const HeroSection = ({ onSearch }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await api.get('/banners');
      return response.data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get('/events');
      return response.data;
    },
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get('/services');
      return response.data;
    },
  });

  const searchSuggestions = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 1) return [];
    
    const combined = [
      ...(events || []).map((e: any) => ({ ...e, type: 'event' })),
      ...(services || []).map((s: any) => ({ ...s, type: 'service' }))
    ];

    const searchLower = debouncedSearch.toLowerCase();
    return combined.filter((item: any) => {
      const title = (item.title || item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      
      return title.includes(searchLower) || 
             description.includes(searchLower) || 
             category.includes(searchLower);
    }).slice(0, 5);
  }, [debouncedSearch, events, services]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      if (onSearch) {
        onSearch(search);
      } else {
        // Navigate to browse-events directly, or login if not authenticated
        // The browse-events page will handle authentication if needed
        navigate(`/dashboard/browse-events?search=${encodeURIComponent(search)}`);
      }
    }
  };

  const displayBanners = banners && banners.length > 0 
    ? banners.map((b: any) => ({ url: b.image, title: b.title }))
    : FALLBACK_HERO_IMAGES;

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Image Slider */}
      <div className="absolute inset-0">
        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          speed={1500}
          autoplay={{
            delay: 4000,
            disableOnInteraction: false,
          }}
          loop={true}
          className="w-full h-full"
        >
          {displayBanners.map((image: any, index: number) => (
            <SwiperSlide key={index}>
              <div
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${image.url})` }}
                role="img"
                aria-label={image.title}
              >
                {/* Fallback for background image if needed */}
                <div className="absolute inset-0 bg-black/40" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        <div className="max-w-5xl mx-auto text-center mb-10">
          {/* Main Heading with Framer Motion */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-5xl md:text-8xl font-display font-extrabold mb-6 leading-tight text-white drop-shadow-2xl"
          >
            Create Moments <br />
            <span className="text-gradient">That Matter</span>
          </motion.h1>

          {/* Subtext with Framer Motion */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="text-lg md:text-2xl text-white/95 max-w-2xl mx-auto mb-10 leading-relaxed font-medium"
          >
            Plan, manage, and book unforgettable events all in one place.
          </motion.p>
        </div>

        {/* Search Bar with Framer Motion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          className="relative w-full max-w-2xl px-4 md:px-0"
        >
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (search) {
                navigate(`/dashboard/browse-events?search=${encodeURIComponent(search)}`);
              }
            }}
            className="flex items-center gap-2 md:gap-3 bg-white/10 backdrop-blur-xl p-2 md:p-3 rounded-2xl md:rounded-3xl border border-white/20 shadow-2xl focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/20 transition-all duration-300 group"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60 group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Search events, movies, concerts..."
                className="w-full h-12 md:h-14 pl-12 pr-4 bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-white/50 group-focus-within:text-gray-900 group-focus-within:placeholder:text-gray-400 font-medium"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
            </div>
            <Button 
              type="submit"
              className="h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl gradient-primary text-white font-bold shadow-lg hover:scale-105 transition-transform"
            >
              <span className="hidden md:inline">Search</span>
              <Search className="h-5 w-5 md:hidden" />
            </Button>
          </form>

          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSuggestions(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 text-left"
                >
                  {searchSuggestions.length > 0 ? (
                    <>
                      <div className="p-2 space-y-1">
                        {searchSuggestions.map((item: any) => (
                          <div 
                            key={item.id || item._id}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-primary/5 cursor-pointer group/item transition-colors"
                            onClick={() => {
                              const id = item.id || item._id;
                              if (item.type === 'service') {
                                navigate(`/dashboard/browse-events?tab=services&search=${encodeURIComponent(item.name)}`);
                              } else {
                                navigate(`/dashboard/browse-events?search=${encodeURIComponent(item.title)}`);
                              }
                              setShowSuggestions(false);
                            }}
                          >
                            <div className="h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                              <img 
                                src={item.image} 
                                alt={item.title || item.name} 
                                className="h-full w-full object-cover group-hover/item:scale-110 transition-transform duration-500" 
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-gray-900 truncate group-hover/item:text-primary transition-colors">
                                {item.title || item.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] px-1.5 h-4 bg-primary/5 text-primary border-none font-bold uppercase">
                                  {item.category || item.type}
                                </Badge>
                                <span className="text-[10px] font-bold text-primary">₹{item.price?.toLocaleString()}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                          </div>
                        ))}
                      </div>
                      <div 
                        className="p-3 bg-gray-50 border-t border-gray-100 text-center cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          navigate(`/dashboard/browse-events?search=${encodeURIComponent(search)}`);
                          setShowSuggestions(false);
                        }}
                      >
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">View all results</p>
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center">
                      <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-900">No events found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try searching for something else</p>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Quick Stats with Framer Motion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
          className="mt-12 flex gap-8 md:gap-16 text-white"
        >
          <div className="text-center">
            <p className="text-3xl font-bold font-display">10k+</p>
            <p className="text-sm text-white/70">Events Hosted</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-display">50+</p>
            <p className="text-sm text-white/70">Cities Covered</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold font-display">200+</p>
            <p className="text-sm text-white/70">Pro Organizers</p>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 hidden md:block"
      >
        <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1.5">
          <motion.div
            className="w-1.5 h-3 bg-white/60 rounded-full"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
