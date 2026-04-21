import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { type Event, categories } from "@/data/mockData";
import { 
  PartyPopper, 
  ArrowRight, 
  CalendarDays, 
  Users, 
  MapPin, 
  Loader2, 
  Star, 
  Zap, 
  Shield, 
  Globe, 
  ChevronDown,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  ExternalLink,
  MessageCircle,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
  Search
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import HeroSection from "@/components/HeroSection";
import CategoryCards from "@/components/CategoryCards";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import HowItWorks from "@/components/HowItWorks";
import EventGallery from "@/components/EventGallery";
import EventDetailModal from "@/components/EventDetailModal";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  // Handle scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle hash scrolling on mount and hash change
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        // Small delay to ensure images/content are loaded for accurate position
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location.hash, location.pathname]);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const { data: galleryImages } = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      const response = await api.get('/gallery');
      return response.data;
    },
  });

  const featuredEvents = events?.slice(0, 6) || [];
  
  const categoryEvents = selectedCategory 
    ? events?.filter(e => 
        e.category.toLowerCase().includes(selectedCategory.toLowerCase()) || 
        selectedCategory.toLowerCase().includes(e.category.toLowerCase())
      ) || []
    : [];

  const handleCategorySelect = (categoryName: string) => {
    navigate(`/dashboard/browse-events?category=${categoryName}`);
  };

  const handleSearch = (term: string) => {
    if (!events) return;
    const results = events.filter(e => 
      e.title.toLowerCase().includes(term.toLowerCase()) || 
      e.category.toLowerCase().includes(term.toLowerCase()) ||
      e.description.toLowerCase().includes(term.toLowerCase())
    );
    setSearchResults(results);
    setSearchModalOpen(true);
  };

  const handleViewDetails = (event: Event) => {
    setSelectedEvent(event);
    setDetailModalOpen(true);
  };

  const handleBookNow = (event: Event) => {
    const id = event.id || (event as any)._id;
    let targetUrl = "";
    if (event.eventType === 'full-service') {
      targetUrl = `/book-full-service/${id}`;
    } else if (event.eventType === 'ticketed') {
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
  };

  return (
    <div className="min-h-screen bg-white font-sans scroll-smooth">
      <Navbar />
      {/* ─── HERO SECTION ───────────────────────────────────────── */}
      <HeroSection onSearch={handleSearch} />

      {/* ─── CATEGORIES SECTION ─────────────────────────────────── */}
      <CategoryCards onCategorySelect={handleCategorySelect} />

      {/* ─── FEATURES SECTION ───────────────────────────────────── */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-4 text-gray-900">
            Why Choose <span className="text-gradient">EventPro?</span>
          </h2>
          <p className="text-center text-gray-500 mb-14 text-lg">Everything you need to create extraordinary events</p>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video group">
              <img 
                src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200" 
                alt="Live Events"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <Badge className="absolute top-4 left-4 bg-red-600 text-white border-0 flex items-center gap-1.5 px-3 py-1.5 animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full" /> LIVE EVENTS
              </Badge>
            </div>
            <div className="space-y-7">
              {[
                { icon: Zap, title: "Instant Booking", desc: "Book any event in seconds with our streamlined checkout and Razorpay payment integration.", color: "bg-yellow-100 text-yellow-600" },
                { icon: Shield, title: "Secure & Trusted", desc: "Every organizer is verified and approved by admin before listing their events.", color: "bg-green-100 text-green-600" },
                { icon: Star, title: "Top Rated Events", desc: "Browse curated events rated by thousands of happy attendees across India.", color: "bg-purple-100 text-purple-600" },
                { icon: Globe, title: "50+ Cities", desc: "Find amazing events near you or across India — weddings, concerts, sports and more.", color: "bg-blue-100 text-blue-600" },
              ].map((f) => (
                <div key={f.title} className="flex gap-4 group hover-lift">
                  <div className={`p-3 rounded-xl ${f.color} shrink-0 group-hover:scale-110 transition-transform`}><f.icon className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-display font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-gray-500 text-sm mt-1">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRENDING EVENTS CAROUSEL ───────────────────────────── */}
      <section id="trending" className="py-20 px-6 bg-gradient-to-b from-white to-purple-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-center mb-4">
            Trending <span className="text-gradient">Events</span>
          </h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Don't miss out on these popular events</p>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Swiper
              modules={[Autoplay, Pagination, Navigation]}
              spaceBetween={24}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              pagination={{ clickable: true }}
              navigation
              loop
              className="pb-12"
            >
              {featuredEvents.map((event) => (
                <SwiperSlide key={event.id}>
                  <div
                    className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover-lift h-full"
                    onClick={() => handleViewDetails(event)}
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img 
                        src={event.image || "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80"} 
                        alt={event.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800 border-0 backdrop-blur-sm">
                        {event.category}
                      </Badge>
                      <span className="absolute bottom-3 right-3 bg-white/90 text-gray-900 font-bold text-sm px-3 py-1.5 rounded-full shadow-lg">
                        ₹{event.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display font-semibold text-lg text-gray-900 mb-3 line-clamp-1">{event.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.location.split(",")[0]}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {event.capacity} seats
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl border-none" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(event);
                          }}
                        >
                          Details
                        </Button>
                        <Button 
                          className="flex-1 gradient-primary text-white font-bold rounded-xl border-none shadow-md shadow-primary/20" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookNow(event);
                          }}
                        >
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>
      </section>

      {/* ─── HOW IT WORKS ───────────────────────────────────────── */}
      <HowItWorks />

      {/* ─── BLOGS SECTION (GALLERY) ────────────────────────────── */}
      <section id="blogs" className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Latest <span className="text-gradient">Blogs & Gallery</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl">
                Explore real stories and stunning moments from our merchant community.
              </p>
            </div>
            <Button variant="outline" className="rounded-full px-6" onClick={() => navigate("/login")}>
              View All Gallery <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            spaceBetween={20}
            slidesPerView={1.2}
            breakpoints={{
              640: { slidesPerView: 2.5 },
              1024: { slidesPerView: 4.5 },
            }}
            pagination={{ clickable: true }}
            className="pb-12"
          >
            {(galleryImages && galleryImages.length > 0 ? galleryImages : [
              { id: 1, imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800", eventTitle: "Dream Wedding", category: "Wedding", caption: "A beautiful celebration of love" },
              { id: 2, imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800", eventTitle: "Birthday Bash", category: "Birthday", caption: "Joyful moments with family" },
              { id: 3, imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800", eventTitle: "Tech Summit", category: "Corporate", caption: "Innovating the future" },
              { id: 4, imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800", eventTitle: "Music Night", category: "Concert", caption: "Rhythm and soul" },
              { id: 5, imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800", eventTitle: "Engagement", category: "Wedding", caption: "Perfect moments" },
            ]).slice(0, 6).map((photo: any, idx: number) => (
                <SwiperSlide key={photo.id || idx}>
                  <div className="group relative rounded-2xl overflow-hidden aspect-[4/5] shadow-md hover:shadow-xl transition-all duration-500 hover-lift">
                    <img 
                      src={photo.imageUrl} 
                      alt={photo.caption || "Gallery image"} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?w=800";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                      <Badge className="bg-primary text-white mb-2">{photo.category || "Event"}</Badge>
                      <h3 className="text-white font-semibold text-lg line-clamp-2">{photo.eventTitle}</h3>
                      <p className="text-white/70 text-sm mt-1 flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> {photo.caption || "View Moment"}
                      </p>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              <SwiperSlide>
                <div 
                  className="flex flex-col items-center justify-center h-full aspect-[4/5] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors group"
                  onClick={() => navigate("/login")}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-bold text-gray-600">View All</span>
                </div>
              </SwiperSlide>
          </Swiper>
        </div>
      </section>

      {/* ─── ABOUT US SECTION ───────────────────────────────────── */}
      <section id="about" className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
              <img 
                src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800" 
                alt="About Us" 
                className="rounded-3xl shadow-2xl relative z-10"
              />
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl z-20 hidden md:block border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-xl">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">10k+</p>
                    <p className="text-sm text-gray-500">Happy Customers</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0 mb-4 px-3 py-1">OUR STORY</Badge>
              <h2 className="text-4xl font-display font-bold mb-6">Redefining How India <span className="text-gradient">Celebrates</span></h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Founded in 2024, EventPro started with a simple mission: to make event planning as easy as ordering food online. We've built a platform that connects thousands of talented organizers with customers looking for that perfect celebration.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Verified Partners</h4>
                    <p className="text-sm text-gray-500">Strict approval process</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Verified Partners</h4>
                    <p className="text-sm text-gray-500">Strict approval process</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ───────────────────────────────────────── */}
      <section id="testimonials">
        <TestimonialsCarousel />
      </section>

      {/* ─── CONTACT SECTION ────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-900 rounded-[3rem] p-8 md:p-16 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent z-0" />
            <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">Let's Talk About Your <br /><span className="text-primary">Next Big Event</span></h2>
                <p className="text-gray-400 text-lg mb-10 max-w-md">
                  Have questions? Our team is here to help you plan the celebration of your dreams.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4 group">
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-primary/20 transition-colors">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Call Us</p>
                      <p className="text-xl font-semibold">+91 123 456 7890</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:bg-primary/20 transition-colors">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Email Us</p>
                      <p className="text-xl font-semibold">hello@eventpro.com</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2rem] border border-white/10">
                <form className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Name</label>
                      <input type="text" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Email</label>
                      <input type="email" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Your email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Message</label>
                    <textarea className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary h-32" placeholder="How can we help?"></textarea>
                  </div>
                  <Button className="w-full gradient-primary py-6 text-lg font-semibold rounded-xl border-0">Send Message</Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-95 z-0" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 animate-fadeInDown">
            Ready to Create Magic?
          </h2>
          <p className="text-white/90 text-lg mb-8">Join 10,000+ customers and 200+ organizers on EventPro today</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button 
              size="lg" 
              className="bg-white text-primary font-display font-semibold px-10 h-13 hover:bg-white/90 hover:scale-105 transition-all shadow-2xl border-0" 
              onClick={() => navigate("/login")}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white/50 text-white font-display px-10 h-13 hover:bg-white/10" 
              onClick={() => navigate("/login")}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-20 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <PartyPopper className="h-8 w-8 text-primary" />
                <span className="font-display font-bold text-white text-2xl">EventPro</span>
              </div>
              <p className="text-base leading-relaxed">
                India's leading platform for discovering and booking unforgettable events. From intimate weddings to massive concerts, we handle it all.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary transition-colors"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary transition-colors"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-primary transition-colors"><Facebook className="h-5 w-5" /></a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-display font-bold text-white text-lg mb-6">Quick Links</h4>
              <ul className="space-y-4">
                <li><a href="/" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Home page</a></li>
                <li><a href="#trending" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Trending</a></li>
                <li><a href="#blogs" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Blogs</a></li>
                <li><a href="#about" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> About us</a></li>
                <li><a href="#testimonials" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Reviews</a></li>
                <li><a href="#contact" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Contact us</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display font-bold text-white text-lg mb-6">Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Terms and conditions</a></li>
                <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Privacy policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Cookie Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Refund Policy</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-display font-bold text-white text-lg mb-6">Contact Us</h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <MapPin className="h-6 w-6 text-primary shrink-0" />
                  <p>123 Event Plaza, Jubilee Hills, Hyderabad, TS 500033</p>
                </div>
                <div className="flex gap-4">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <p>+91 123 456 7890</p>
                </div>
                <div className="flex gap-4">
                  <Mail className="h-5 w-5 text-primary shrink-0" />
                  <p>support@eventpro.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm">
              © 2026 EventPro. All rights reserved. Made with ❤️ in India.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1 text-green-500"><Globe className="h-4 w-4" /> All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── CATEGORY PREVIEW MODAL (LIST OF EVENTS) ──────────────── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden border-0 bg-gray-50 rounded-3xl shadow-2xl">
          <div className="p-8 md:p-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <Badge className="bg-primary/10 text-primary font-bold px-4 py-1.5 border-0 mb-3">
                  {selectedCategory} CATEGORY
                </Badge>
                <DialogHeader>
                  <DialogTitle className="text-3xl md:text-4xl font-display font-bold text-gray-900">
                    Explore <span className="text-gradient">{selectedCategory}</span> Events
                  </DialogTitle>
                  <DialogDescription className="text-lg text-gray-600">
                    Find the perfect {selectedCategory?.toLowerCase()} experience from our curated list.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hidden md:block">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Events</p>
                <p className="text-2xl font-bold text-primary">{categoryEvents.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {categoryEvents.length > 0 ? (
                categoryEvents.map((event) => (
                  <Card 
                    key={event.id} 
                    className="group overflow-hidden rounded-2xl border-0 shadow-md hover:shadow-xl transition-all cursor-pointer bg-white"
                    onClick={() => {
                      setPreviewOpen(false);
                      handleViewDetails(event);
                    }}
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/20" />
                      <Badge className="absolute top-3 right-3 bg-white/90 text-primary font-bold border-0">
                        ₹{event.price.toLocaleString()}
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <h4 className="font-bold text-gray-900 mb-2 line-clamp-1">{event.title}</h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(event.eventDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location.split(',')[0]}</span>
                      </div>
                      <Button variant="outline" className="w-full text-xs font-bold rounded-xl border-primary/20 hover:bg-primary/5 text-primary">
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-300">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarDays className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No events found</h3>
                  <p className="text-gray-500">We don't have any events listed in this category yet.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── SEARCH RESULTS MODAL ────────────────────────────────── */}
      <Dialog open={searchModalOpen} onOpenChange={setSearchModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 bg-white rounded-3xl shadow-2xl">
          <div className="p-8 md:p-10">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-display font-bold">Search <span className="text-gradient">Results</span></DialogTitle>
              <DialogDescription>
                We found {searchResults?.length || 0} events matching your search.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {searchResults && searchResults.length > 0 ? (
                searchResults.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100 group"
                    onClick={() => {
                      setSearchModalOpen(false);
                      handleViewDetails(event);
                    }}
                  >
                    <div className="w-32 h-32 rounded-xl overflow-hidden shrink-0">
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex flex-col justify-between py-1">
                      <div>
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] mb-1">{event.category}</Badge>
                        <h4 className="font-bold text-gray-900 line-clamp-1">{event.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {event.location}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-primary font-bold">₹{event.price.toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 font-medium">View Details →</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500">Try searching for different keywords like "Wedding" or "Music".</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── EVENT DETAIL MODAL ──────────────────────────────────── */}
      <EventDetailModal 
        event={selectedEvent}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onBook={handleBookNow}
      />
    </div>
  );
};

export default Index;
