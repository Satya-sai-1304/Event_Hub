import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { categories, type Event } from "@/data/mockData";
import { PartyPopper, ArrowRight, CalendarDays, Users, MapPin, Loader2, Star, Zap, Shield, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import HeroSection from "@/components/HeroSection";
import CategoryCards from "@/components/CategoryCards";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import HowItWorks from "@/components/HowItWorks";
import EventGallery from "@/components/EventGallery";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const Index = () => {
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const featuredEvents = events?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ─── NAVBAR ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          <PartyPopper className="h-7 w-7 text-primary" />
          <span className="text-xl font-display font-bold text-gradient">EventPro</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#categories" className="hover:text-primary transition-colors">Categories</a>
          <a href="#events" className="hover:text-primary transition-colors">Events</a>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="font-medium" onClick={() => navigate("/login")}>Sign In</Button>
          <Button className="gradient-primary text-white font-medium shadow-lg shadow-primary/30" onClick={() => navigate("/login")}>
            Get Started <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </nav>

      {/* ─── HERO: FULL VIDEO BACKGROUND ────────────────────────── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70 z-10" />

        <div className="relative z-20 max-w-5xl mx-auto text-center px-6">
          <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-5 py-2">
            ✨ India's #1 Event Management Platform
          </Badge>
          <h1 className="text-5xl md:text-8xl font-display font-extrabold mb-6 leading-tight text-white drop-shadow-2xl">
            Create Moments<br />That <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Matter</span>
          </h1>
          <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Plan, manage, and book unforgettable events. Weddings, concerts, corporate — all in one place.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="gradient-primary text-white font-display text-lg px-10 h-14 shadow-2xl shadow-purple-500/40 hover:scale-105 transition-all" onClick={() => navigate("/login")}>
              Start Planning <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 font-display text-lg px-10 h-14 backdrop-blur-sm" onClick={() => navigate("/login")}>
              Browse Events
            </Button>
          </div>
          {/* Scroll indicator */}
          <div className="mt-16 flex justify-center">
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1.5">
              <div className="w-1.5 h-3 bg-white/60 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ────────────────────────────────────────── */}
      <section className="py-14 px-6 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "500+", label: "Events Hosted", icon: CalendarDays },
            { value: "10K+", label: "Happy Customers", icon: Users },
            { value: "200+", label: "Organizers", icon: Globe },
            { value: "50+", label: "Cities", icon: MapPin },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-2xl bg-primary/10">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-4xl font-display font-extrabold text-gradient">{s.value}</p>
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES: VIDEO LEFT + TEXT RIGHT ──────────────────── */}
      <section id="features" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-4 text-gray-900">
            Why Choose <span className="text-gradient">EventPro?</span>
          </h2>
          <p className="text-center text-gray-500 mb-14 text-lg">Everything you need to create extraordinary events</p>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Video */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video">
              <video autoPlay muted loop playsInline className="w-full h-full object-cover">
                <source src={SECTION_VIDEO_1} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <Badge className="bg-red-600 text-white border-0 flex items-center gap-1.5 px-3 py-1.5">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE EVENTS
                </Badge>
              </div>
            </div>
            {/* Features */}
            <div className="space-y-7">
              {[
                { icon: Zap, title: "Instant Booking", desc: "Book any event in seconds with our streamlined checkout and Razorpay payment integration.", color: "bg-yellow-100 text-yellow-600" },
                { icon: Shield, title: "Secure & Trusted", desc: "Every organizer is verified and approved by admin before listing their events.", color: "bg-green-100 text-green-600" },
                { icon: Star, title: "Top Rated Events", desc: "Browse curated events rated by thousands of happy attendees across India.", color: "bg-purple-100 text-purple-600" },
                { icon: Globe, title: "50+ Cities", desc: "Find amazing events near you or across India — weddings, concerts, sports and more.", color: "bg-blue-100 text-blue-600" },
              ].map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className={`p-3 rounded-xl ${f.color} shrink-0`}><f.icon className="h-5 w-5" /></div>
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

      {/* ─── CATEGORIES ─────────────────────────────────────────── */}
      <section id="categories" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-4 text-gray-900">
            Explore <span className="text-gradient">Categories</span>
          </h2>
          <p className="text-center text-gray-500 mb-12 text-lg">Find the perfect event for every occasion</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 p-6 text-center cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                onClick={() => navigate("/login")}
              >
                <span className="text-5xl block mb-3 group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                <p className="font-display font-semibold text-gray-800">{cat.name}</p>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── WEDDING VIDEO BANNER ────────────────────────────────── */}
      <section className="relative h-72 overflow-hidden">
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src={SECTION_VIDEO_2} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/55 z-10" />
        <div className="relative z-20 h-full flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-4">💒 Wedding Season is Here!
          </h2>
          <p className="text-white/80 text-lg mb-6">Book premium wedding packages at exclusive prices</p>
          <Button className="gradient-primary text-white px-8 h-12 font-medium shadow-lg hover:scale-105 transition-transform" onClick={() => navigate("/login")}>
            Explore Wedding Events
          </Button>
        </div>
      </section>

      {/* ─── FEATURED EVENTS ─────────────────────────────────────── */}
      <section id="events" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-display font-bold text-center mb-4 text-gray-900">
            Featured <span className="text-gradient">Events</span>
          </h2>
          <p className="text-center text-gray-500 mb-12 text-lg">Handpicked events just for you</p>
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {featuredEvents.map((event) => (
                <div
                  key={event.id}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  onClick={() => navigate("/login")}
                >
                  <div className="relative h-52 overflow-hidden">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-gray-800 border-0">{event.category}</Badge>
                    <span className="absolute bottom-3 right-3 bg-white/90 text-gray-900 font-bold text-sm px-3 py-1 rounded-full">
                      ₹{event.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display font-semibold text-lg text-gray-900 mb-2 line-clamp-1">{event.title}</h3>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                      <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location.split(",")[0]}</span>
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{event.capacity} seats</span>
                    </div>
                    <Button className="w-full gradient-primary text-white font-medium" size="sm">
                      View Details <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────────── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-95 z-0" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">Ready to Create Magic?</h2>
          <p className="text-white/80 text-lg mb-8">Join 10,000+ customers and 200+ organizers on EventPro today</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="bg-white text-primary font-display font-semibold px-10 h-13 hover:bg-white/90 hover:scale-105 transition-all" onClick={() => navigate("/login")}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="border-white/50 text-white font-display px-10 h-13 hover:bg-white/10" onClick={() => navigate("/login")}>
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────── */}
      <footer className="py-10 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <PartyPopper className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-white text-lg">EventPro</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#categories" className="hover:text-white transition-colors">Categories</a>
              <a href="#events" className="hover:text-white transition-colors">Events</a>
              <a href="/login" className="hover:text-white transition-colors">Sign In</a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 text-center text-sm">
            © 2026 EventPro. All rights reserved. Made with ❤️ for unforgettable events.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
