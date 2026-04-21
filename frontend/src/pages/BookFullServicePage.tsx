import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Star, MapPin, Calendar, Phone, User, Users, MessageSquare, 
  Navigation, Locate, Clock, Sparkles, IndianRupee, 
  CheckCircle2, Tag, Percent, XCircle, Loader2, ArrowLeft,
  MessageCircle, Instagram, Youtube, Globe, Utensils, Paintbrush, 
  Camera, Music, Play, ExternalLink, Mail, Building2, Send
} from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const BookFullServicePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const queryClient = useQueryClient();
  
  // Map state
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [position, setPosition] = useState<[number, number]>([17.385, 78.4867]); // Hyderabad default

  // Form state
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState("1");
  const [timeSlot, setTimeSlot] = useState<"day" | "night">("day");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [liveCoupons, setLiveCoupons] = useState<any[]>([]);

  // Contact Form state
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    message: "",
    type: "message" // "message" or "call"
  });
  const [isSendingContact, setIsSendingContact] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingContact(true);
    try {
      // In a real app, this would send an email or a message to the merchant via backend
      // For now, we'll simulate it and maybe send a notification if socket is available
      await api.post("/messages", {
        senderId: user?.id || user?._id,
        receiverId: event?.organizerId,
        senderName: contactForm.name,
        senderEmail: contactForm.email,
        message: contactForm.type === 'call' ? `[CALL REQUEST] ${contactForm.message}` : contactForm.message,
        type: contactForm.type,
        eventId: id,
        eventTitle: event?.title
      });

      toast.success("Message sent successfully! The merchant will contact you soon.");
      setIsContactDialogOpen(false);
      setContactForm(prev => ({ ...prev, message: "" }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send message.");
    } finally {
      setIsSendingContact(false);
    }
  };

  // Fetch event data
  const { data: event, isLoading: isEventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await api.get(`/events/${id}`);
      return res.data;
    },
  });

  // Fetch vendor data
  const { data: vendor, isLoading: isVendorLoading } = useQuery({
    queryKey: ["vendor", event?.organizerId],
    enabled: !!event?.organizerId,
    queryFn: async () => {
      const res = await api.get(`/merchants/${event.organizerId}`);
      return res.data;
    },
  });

  // Fetch coupons
  const { data: coupons } = useQuery({
    queryKey: ['coupons', event?.organizerId, id, event?.category_id || event?.categoryId, selectedAddons],
    queryFn: async () => {
      const response = await api.get<any[]>(`/coupons`, {
        params: {
          merchantId: event?.organizerId,
          eventId: id,
          categoryId: event?.category_id || event?.categoryId,
          applicableType: 'EVENT' // This is an event booking, so we want EVENT coupons
        }
      });
      return response.data;
    },
    enabled: !!event?.organizerId && !!id
  });

  useEffect(() => {
    if (coupons) {
      setLiveCoupons(coupons);
    }
  }, [coupons]);

  useEffect(() => {
    if (socket) {
      socket.on('couponCreated', (newCoupon) => {
        // Only accept EVENT or GLOBAL coupons for event bookings
        const isMatch = newCoupon.merchantId === event?.organizerId && 
          (newCoupon.isGlobal || 
           (newCoupon.applicableType === 'EVENT' && newCoupon.applicableEvents && newCoupon.applicableEvents.some((eid: string) => String(eid) === String(id))) ||
           (newCoupon.applicableType === 'CATEGORY' && String(newCoupon.applicableCategory) === String(event?.category_id || event?.categoryId)) ||
           newCoupon.eventId === id || 
           (newCoupon.categoryId && newCoupon.categoryId === (event?.category_id || event?.categoryId)));
        
        if (isMatch) {
          setLiveCoupons(prev => [newCoupon, ...prev]);
          toast.info(`New coupon available: ${newCoupon.couponCode}`);
        }
      });

      socket.on('couponUsed', ({ couponId, userId, updatedCoupon }) => {
        setLiveCoupons(prev => prev.map(c => {
          if ((c._id || c.id) === couponId) {
            // Use updated coupon data if available
            if (updatedCoupon) return updatedCoupon;
            
            const usedBy = c.usedBy || [];
            if (!usedBy.includes(userId)) {
              return { ...c, usedBy: [...usedBy, userId], usageCount: (c.usageCount || 0) + 1 };
            }
          }
          return c;
        }));
      });

      return () => {
        socket.off('couponCreated');
        socket.off('couponUsed');
      };
    }
  }, [socket, event?.organizerId, id]);

  // Pricing calculations
  const getAddonPrice = (addonId: string) => {
    if (!addonId || !event?.addons) return 0;
    const addon = event.addons.find((a: any) => (a._id || a.id || a.serviceId) === addonId);
    return addon?.price || 0;
  };

  const guestsCount = parseInt(numberOfGuests) || 1;
  const addonsPrice = selectedAddons.reduce((acc, addonId) => {
    const addon = event?.addons?.find((a: any) => (a._id || a.id || a.serviceId) === addonId);
    if (!addon) return acc;
    
    // Catering is per guest, others are fixed
    if (addon.category?.toLowerCase() === 'catering') {
      return acc + (addon.price * guestsCount);
    }
    return acc + addon.price;
  }, 0);

  const basePrice = (event?.price || 0) + addonsPrice;

  const activeCoupons = React.useMemo(() => {
    if (!liveCoupons || !event) return [];
    const now = new Date();
    const currentAmount = basePrice || 0;

    return liveCoupons.filter(c => {
      const isNotExpired = new Date(c.expiryDate) >= now;
      const isMerchantMatch = String(c.merchantId) === 'admin' || String(c.merchantId) === String(event.organizerId);
      
      const isGlobalMatch = c.isGlobal || c.applicableType === 'ALL';
      const isEventMatch = (c.applicableType === 'EVENT' && c.applicableEvents && c.applicableEvents.some((eid: string) => String(eid) === String(id))) || 
                          (c.eventId && String(c.eventId) === String(id));
      const isCategoryMatch = (c.applicableType === 'CATEGORY' && String(c.applicableCategory) === String(event.category_id || event.categoryId)) ||
                             (c.categoryId && String(c.categoryId) === String(event.category_id || event.categoryId));

      // We ONLY want event/category/global coupons for event bookings, 
      // NOT service-specific coupons even if those services are selected.
      const isMatch = isGlobalMatch || isEventMatch || isCategoryMatch;
      const isAmountReached = currentAmount >= (c.minimumOrderAmount || 0);
      const isUsageLimitNotReached = !c.usageLimit || (c.usageCount || 0) < c.usageLimit;

      return isNotExpired && isMerchantMatch && isMatch && isAmountReached && isUsageLimitNotReached;
    });
  }, [liveCoupons, event, basePrice, id, selectedAddons]);

  // Check availability
  const { data: availability } = useQuery({
    queryKey: ['availability', id, eventDate],
    queryFn: async () => {
      if (!id || !eventDate) return null;
      const response = await api.get(`/events/${id}/availability`, {
        params: { date: eventDate }
      });
      return response.data;
    },
    enabled: !!(id && eventDate),
  });

  const isDateFull = eventDate && availability && availability[timeSlot === 'day' ? 'Day' : 'Night'] === 'Full';

  // Geocoding
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setManualAddress(data.display_name);
      } else {
        setManualAddress(`${lat}, ${lng}`);
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setManualAddress(`${lat}, ${lng}`);
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

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapLocation({ lat: latitude, lng: longitude });
          setPosition([latitude, longitude]);
          getAddressFromCoordinates(latitude, longitude);
        },
        () => {
          toast.error("Could not get your location.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const discountAmount = React.useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'fixed') return appliedCoupon.discountValue;
    return basePrice * (appliedCoupon.discountValue / 100);
  }, [appliedCoupon, basePrice]);

  const totalPrice = basePrice - discountAmount;

  const handleApplyCoupon = async (specificCode?: string) => {
    const codeToApply = (specificCode || couponCode).toUpperCase();
    if (!codeToApply) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      // Find the coupon in liveCoupons to see if it has a serviceType
      const localCoupon = liveCoupons.find(c => c.couponCode.toUpperCase() === codeToApply);

      const response = await api.post('/coupons/validate', {
        code: codeToApply,
        orderAmount: basePrice,
        userId: user?.id || user?._id,
        merchantId: event?.organizerId,
        eventId: id,
        categoryId: event?.category_id || event?.categoryId,
        serviceType: localCoupon?.serviceType,
        serviceIds: selectedAddons,
        applicableType: 'EVENT'
      });

      if (response.data) {
        setAppliedCoupon(response.data);
        if (specificCode) setCouponCode(specificCode.toUpperCase());
        toast.success(`Coupon ${response.data.couponCode} applied successfully!`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
    }
  };

  // Booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await api.post("/bookings", bookingData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("Booking request sent successfully!");
      navigate("/dashboard/my-bookings");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create booking.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to book.");
      navigate("/login", { state: { from: routeLocation.pathname + routeLocation.search } });
      return;
    }

    if (!eventDate) {
      toast.error("Please select a date.");
      return;
    }

    if (!mapLocation) {
      toast.error("Please select a location on the map.");
      return;
    }

    if (isDateFull) {
      toast.error("This slot is already full.");
      return;
    }

    const bookingData: any = {
      eventId: event.id,
      eventTitle: event.title,
      eventType: 'full-service',
      customerId: user._id || user.id,
      customerName: customerName,
      customerPhone: customerPhone,
      customerEmail: user.email,
      eventDate: eventDate,
      timeSlot,
      guests: guestsCount,
      totalPrice: totalPrice,
      totalAmount: totalPrice,
      discountAmount: discountAmount,
      convenienceFee: 0,
      couponCode: appliedCoupon?.couponCode,
      status: 'pending',
      paymentStatus: 'unpaid',
      organizerId: event.organizerId,
      location: manualAddress,
      lat: mapLocation.lat,
      lng: mapLocation.lng,
      requirements: additionalNotes,
      selectedAddons: selectedAddons, // Store the IDs of selected addons
      billingDetails: {
        subtotal: totalPrice,
        finalTotal: totalPrice,
        addons: selectedAddons.map(addonId => {
          const addon = event.addons.find((a: any) => (a._id || a.id || a.serviceId) === addonId);
          return {
            name: addon?.name,
            price: addon?.price,
            category: addon?.category
          };
        })
      }
    };

    bookingMutation.mutate(bookingData);
  };

  // Fetch reviews for the event
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const response = await api.get<any[]>(`/reviews/event/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const carouselImages = React.useMemo(() => {
    const images = [event?.image, ...(event?.images || [])].filter(Boolean);
    const uniqueImages = Array.from(new Set(images));
    // Filter out placeholder strings and ensure only valid URL-like strings are included
    const validImages = uniqueImages.filter((img: string) => {
      if (!img || img === "/placeholder.svg" || img.trim() === "") return false;
      // Ensure it's a URL-like string (starts with http, /, or data:)
      // This filters out placeholder strings like "Gallery 1", "Gallery 2", etc.
      return img.startsWith('http') || img.startsWith('/') || img.startsWith('data:');
    });
    return validImages.length > 0 ? validImages : ["/placeholder.svg"];
  }, [event]);

  if (isEventLoading || isVendorLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!event) return <div className="flex h-screen items-center justify-center">Event not found</div>;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-foreground">
      {/* 1. HERO SECTION */}
      <div className="relative w-full h-[300px] md:h-[400px] group overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <img 
          src={carouselImages[0]} 
          alt={event.title} 
          className="w-full h-full object-cover object-top transition-all duration-700"
        />
        
        {/* Back Button Overlay */}
        <div className="absolute top-6 left-6 z-30">
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-white/20 hover:bg-white/40 backdrop-blur-md text-white border-none transition-all rounded-full px-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
        </div>

        {/* Hero Content Overlay */}
        <div className="absolute bottom-8 left-0 right-0 z-20 container mx-auto px-6">
          <div className="max-w-4xl space-y-3">
            <Badge className="bg-primary hover:bg-primary text-white border-none px-4 py-1 text-sm font-semibold rounded-full shadow-lg">
              {event.category}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-2xl leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2 drop-shadow-lg">
                <MapPin className="h-5 w-5 text-primary" />
                <span className="font-semibold text-lg">{event.location || event.locationDetails?.manualLocation || "Multiple Locations"}</span>
              </div>
              <div className="flex items-center gap-2 drop-shadow-lg">
                <IndianRupee className="h-5 w-5 text-primary" />
                <span className="font-bold text-xl">Starting ₹{(event.basePrice || event.price)?.toLocaleString() || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 drop-shadow-lg">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-lg">{event.rating || "4.8"} (120+ Reviews)</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <Button 
                className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 py-6 text-lg font-bold shadow-xl shadow-primary/20 flex items-center gap-2"
                onClick={() => {
                  setContactForm(prev => ({ ...prev, type: 'call' }));
                  setIsContactDialogOpen(true);
                }}
              >
                <Phone className="h-5 w-5" /> Call Now
              </Button>
              <Button 
                variant="secondary"
                className="bg-white hover:bg-white/90 text-primary rounded-full px-8 py-6 text-lg font-bold shadow-xl flex items-center gap-2 border-none"
                onClick={() => {
                  setContactForm(prev => ({ ...prev, type: 'message' }));
                  setIsContactDialogOpen(true);
                }}
              >
                <MessageCircle className="h-5 w-5" /> Message
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Main Content Area (8 Columns) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* 2. IMAGE GALLERY BELOW HERO */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                  Photos & Videos
                </h2>
                <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5">
                  View All ({carouselImages.length})
                </Button>
              </div>
              
              <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-6 px-6">
                {carouselImages.map((img: string, idx: number) => (
                  <div key={idx} className="flex-shrink-0 w-64 h-40 rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-md transition-all cursor-pointer relative group">
                    <img 
                      src={img} 
                      alt={`Gallery ${idx}`} 
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" 
                    />
                    {idx === 0 && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="bg-white/30 backdrop-blur-md p-3 rounded-full">
                          <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 3. PORTFOLIO / LINKS SECTION */}
            <section className="space-y-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-border/40">
              <h2 className="text-2xl font-black text-foreground">Our Work / Portfolio</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a 
                  href={vendor?.socialLinks?.instagram || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-pink-100 hover:shadow-md transition-all group"
                >
                  <div className="bg-white p-3 rounded-xl shadow-sm text-pink-500">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Instagram</p>
                    <p className="text-xs text-muted-foreground">Recent Photos</p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto text-pink-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a 
                  href={vendor?.socialLinks?.youtube || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 hover:shadow-md transition-all group"
                >
                  <div className="bg-white p-3 rounded-xl shadow-sm text-red-500">
                    <Youtube className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">YouTube</p>
                    <p className="text-xs text-muted-foreground">Event Highlights</p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto text-red-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a 
                  href={vendor?.website || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 hover:shadow-md transition-all group"
                >
                  <div className="bg-white p-3 rounded-xl shadow-sm text-blue-500">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Website</p>
                    <p className="text-xs text-muted-foreground">Official Page</p>
                  </div>
                  <ExternalLink className="h-4 w-4 ml-auto text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </section>

            {/* 4. BOOKING FORM (MAIN SECTION) */}
            <section className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-border/40">
              <div className="flex items-center gap-3">
                <div className="h-12 w-1.5 bg-primary rounded-full" />
                <div>
                  <h2 className="text-3xl font-black text-foreground">Book Your Event</h2>
                  <p className="text-muted-foreground font-medium">Customize your dream event experience</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-foreground font-bold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" /> Full Name
                    </Label>
                    <Input 
                      placeholder="Enter your name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="h-14 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-foreground font-bold flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary" /> Phone Number
                    </Label>
                    <Input 
                      type="tel"
                      placeholder="Enter phone number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="h-14 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-foreground font-bold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" /> Event Date
                    </Label>
                    <Input 
                      type="date" 
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="h-14 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-foreground font-bold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> Number of Guests
                    </Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={numberOfGuests}
                      onChange={(e) => setNumberOfGuests(e.target.value)}
                      required
                      className="h-14 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 text-lg"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-foreground font-bold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Preferred Slot
                    </Label>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        onClick={() => setTimeSlot("day")}
                        variant={timeSlot === "day" ? "default" : "secondary"}
                        className={`flex-1 h-14 rounded-2xl font-bold transition-all ${timeSlot === "day" ? "shadow-lg shadow-primary/20" : "bg-[#F8F9FB] text-muted-foreground border-none"}`}
                      >
                        <Sparkles className="h-4 w-4 mr-2" /> Day Slot
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setTimeSlot("night")}
                        variant={timeSlot === "night" ? "default" : "secondary"}
                        className={`flex-1 h-14 rounded-2xl font-bold transition-all ${timeSlot === "night" ? "shadow-lg shadow-primary/20" : "bg-[#F8F9FB] text-muted-foreground border-none"}`}
                      >
                        <Clock className="h-4 w-4 mr-2" /> Night Slot
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 5. ADD-ONS SELECTION (DYNAMIC) */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-xl font-black text-foreground">Select Add-ons</Label>
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-bold border-primary/20 text-primary bg-primary/5">
                      {selectedAddons.length} Selected
                    </Badge>
                  </div>

                  {(!event?.addons || event.addons.length === 0) ? (
                    <div className="p-10 text-center bg-[#F8F9FB] rounded-[2rem] border-2 border-dashed border-border/50">
                      <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No additional add-ons available for this event.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">The base package includes all essential services.</p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {/* Group addons by category */}
                      {Object.entries(
                        (event.addons || []).reduce((acc: any, addon: any) => {
                          const cat = addon.category || "Other";
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(addon);
                          return acc;
                        }, {})
                      ).map(([category, addons]: [string, any]) => (
                        <div key={category} className="space-y-4">
                          <Label className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">
                            {category} Options
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {addons.map((addon: any) => {
                              const addonId = addon._id || addon.id || addon.serviceId;
                              const isSelected = selectedAddons.includes(addonId);
                              const isCatering = category.toLowerCase() === 'catering';
                              
                              return (
                                <div 
                                  key={addonId}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedAddons(selectedAddons.filter(id => id !== addonId));
                                    } else {
                                      setSelectedAddons([...selectedAddons, addonId]);
                                    }
                                  }}
                                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center gap-4 group relative overflow-hidden ${
                                    isSelected 
                                    ? "border-primary bg-primary/5 shadow-xl shadow-primary/10" 
                                    : "border-border/50 bg-[#F8F9FB] hover:border-primary/30 hover:bg-white hover:shadow-lg"
                                  }`}
                                >
                                  <div className={`p-3 rounded-2xl transition-all ${isSelected ? "bg-primary text-white" : "bg-white text-primary shadow-sm"}`}>
                                    {category.toLowerCase() === 'catering' ? <Utensils className="h-6 w-6" /> : 
                                     category.toLowerCase() === 'decoration' ? <Paintbrush className="h-6 w-6" /> :
                                     category.toLowerCase() === 'music' ? <Music className="h-6 w-6" /> :
                                     category.toLowerCase() === 'photography' ? <Camera className="h-6 w-6" /> :
                                     <Sparkles className="h-6 w-6" />}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-black text-foreground leading-tight group-hover:text-primary transition-colors">
                                      {addon.name}
                                    </p>
                                    <p className="text-sm font-bold text-primary flex items-center gap-1 mt-1">
                                      <IndianRupee className="h-3 w-3" />
                                      {addon.price.toLocaleString()}
                                      {isCatering && <span className="text-[10px] text-muted-foreground ml-1">/guest</span>}
                                    </p>
                                  </div>
                                  {isSelected && <CheckCircle2 className="h-6 w-6 text-primary animate-in zoom-in duration-300" />}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location Map */}
                <div className="space-y-6">
                  <Label className="text-xl font-black text-foreground block">Event Location</Label>
                  <div className="h-[400px] w-full rounded-[2rem] overflow-hidden relative border-4 border-[#F8F9FB] shadow-inner">
                    <MapContainer
                      center={position}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {mapLocation && (
                        <Marker position={[mapLocation.lat, mapLocation.lng]}>
                          <Popup>Your Event Location</Popup>
                        </Marker>
                      )}
                      <LocationSelector />
                    </MapContainer>
                    <Button
                      type="button"
                      onClick={handleUseMyLocation}
                      className="absolute bottom-6 right-6 z-[1000] shadow-2xl bg-white text-primary hover:bg-white/90 rounded-full font-bold px-6 py-4"
                      size="sm"
                    >
                      <Locate className="w-5 h-5 mr-2" /> Use My Location
                    </Button>
                  </div>
                  <Input 
                    placeholder="Search address or click on map..." 
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    required
                    className="h-14 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 text-lg px-6"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-foreground font-bold">Additional Notes</Label>
                  <Textarea 
                    placeholder="Anything else we should know?"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    rows={4}
                    className="rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 p-6 text-lg"
                  />
                </div>
              </form>
            </section>

            {/* 6. REVIEWS SECTION */}
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-foreground">Customer Reviews</h2>
                <Button variant="ghost" className="text-primary font-bold">See All Reviews ({reviews.length})</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.length > 0 ? (
                  reviews.slice(0, 4).map((r: any) => (
                    <div key={r.id || r._id} className="bg-white p-6 rounded-3xl shadow-sm border border-border/40 space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/10">
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {(r.customerName || r.userName || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-foreground">{r.customerName || r.userName || "Anonymous"}</p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3 w-3 ${s <= (r.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                            ))}
                            <span className="text-[10px] text-muted-foreground ml-2">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "Recent"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed italic line-clamp-3">
                        "{r.comment || "Great service, very professional!"}"
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center bg-white rounded-3xl border border-dashed border-border/60">
                    <p className="text-muted-foreground font-medium">No reviews yet for this event.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar Area (4 Columns) - Sticky Summary */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden bg-white">
                <div className="bg-primary p-6 text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> Booking Summary
                  </h3>
                </div>
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Base Package</span>
                      <span className="font-bold text-foreground">₹{(event.basePrice || event.price)?.toLocaleString()}</span>
                    </div>
                    {selectedAddons.map(addonId => {
                      const addon = event.addons?.find((a: any) => (a._id || a.id || a.serviceId) === addonId);
                      if (!addon) return null;
                      const isCatering = addon.category?.toLowerCase() === 'catering';
                      const finalAddonPrice = isCatering ? (addon.price * guestsCount) : addon.price;
                      
                      return (
                        <div key={addonId} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-medium">
                            {addon.name} {isCatering && `(${numberOfGuests} guests)`}
                          </span>
                          <span className="font-bold text-foreground">₹{finalAddonPrice.toLocaleString()}</span>
                        </div>
                      );
                    })}
                    
                    <Separator className="bg-border/50" />
                    
                    {/* Coupon Section in Summary */}
                    <div className="space-y-4">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Apply Coupon</Label>
                      
                      {/* Available Coupons List */}
                      {activeCoupons.length > 0 && !appliedCoupon && (
                        <div className="flex flex-col gap-2 mb-2">
                          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Available Offers</p>
                          <div className="flex flex-wrap gap-2">
                            {activeCoupons.slice(0, 3).map((coupon: any) => (
                              <button
                                key={coupon.id || coupon._id}
                                type="button"
                                onClick={() => {
                                  handleApplyCoupon(coupon.couponCode);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left group"
                              >
                                <Percent className="h-3 w-3 text-primary" />
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-primary leading-none">{coupon.couponCode}</span>
                                  <span className="text-[8px] font-bold text-primary/60 uppercase">{coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : ' OFF'}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input 
                          placeholder="Coupon Code" 
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="h-12 rounded-xl bg-[#F8F9FB] border-none font-bold"
                          disabled={!!appliedCoupon}
                        />
                        {appliedCoupon ? (
                          <Button 
                            variant="outline" 
                            className="h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5" 
                            onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        ) : (
                          <Button 
                            className="h-12 rounded-xl bg-primary hover:bg-primary/90 text-white" 
                            onClick={() => handleApplyCoupon()}
                          >
                            Apply
                          </Button>
                        )}
                      </div>
                      
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center bg-green-50 p-3 rounded-xl border border-green-100">
                          <span className="text-green-700 font-bold text-xs flex items-center gap-1">
                            <Tag className="h-3 w-3" /> Coupon Applied
                          </span>
                          <span className="text-green-700 font-bold text-sm">- ₹{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 space-y-2">
                      <div className="flex justify-between items-end">
                        <span className="text-muted-foreground font-bold">Total Payable</span>
                        <span className="text-3xl font-black text-primary">₹{totalPrice.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right italic">*Inclusive of all taxes and services</p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSubmit}
                    className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
                    disabled={bookingMutation.isPending}
                  >
                    {bookingMutation.isPending ? (
                      <><Loader2 className="mr-2 h-6 w-6 animate-spin" /> Booking...</>
                    ) : "BOOK NOW"}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      <CheckCircle2 className="h-3 w-3 text-green-500" /> Secure Payment
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      <CheckCircle2 className="h-3 w-3 text-green-500" /> Best Price
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                      <CheckCircle2 className="h-3 w-3 text-green-500" /> 24/7 Support
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Contact Card */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-border/40 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={vendor?.logo} />
                    <AvatarFallback className="bg-primary/5 text-primary font-black">VM</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-black text-foreground">{vendor?.businessName || "Event Organizer"}</p>
                    <p className="text-xs text-muted-foreground">Certified Professional Vendor</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl font-bold h-12" onClick={() => {
                    setContactForm(prev => ({ ...prev, type: 'call' }));
                    setIsContactDialogOpen(true);
                  }}>
                    <Phone className="h-4 w-4 mr-2" /> Call
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-xl font-bold h-12" onClick={() => {
                    setContactForm(prev => ({ ...prev, type: 'message' }));
                    setIsContactDialogOpen(true);
                  }}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Chat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. FOOTER SECTION */}
      <footer className="bg-white border-t border-border mt-20">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-6 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black text-foreground tracking-tighter">EventHub</span>
              </div>
              <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                Your one-stop destination for all event planning and booking needs. We make your special moments unforgettable.
              </p>
            </div>
            
            <div className="space-y-6">
              <h4 className="font-black text-foreground uppercase tracking-widest text-xs">Quick Links</h4>
              <ul className="space-y-3 text-sm font-bold text-muted-foreground">
                <li className="hover:text-primary transition-colors cursor-pointer">About Us</li>
                <li className="hover:text-primary transition-colors cursor-pointer">How It Works</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Terms & Conditions</li>
                <li className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-black text-foreground uppercase tracking-widest text-xs">Contact Details</h4>
              <div className="space-y-4 text-sm font-medium text-muted-foreground">
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-primary mt-1" />
                  <span>{vendor?.businessName || "EventHub HQ"}<br />{vendor?.address || "123 Event Street, City, State"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{vendor?.phone || "+91 98765 43210"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>{vendor?.email || "contact@eventhub.com"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="font-black text-foreground uppercase tracking-widest text-xs">Newsletter</h4>
              <p className="text-xs text-muted-foreground font-medium">Subscribe for latest event trends and offers.</p>
              <div className="flex gap-2">
                <Input placeholder="Your Email" className="h-12 rounded-xl bg-[#F8F9FB] border-none" />
                <Button className="h-12 w-12 rounded-xl bg-primary text-white">Go</Button>
              </div>
            </div>
          </div>
          
          <Separator className="my-12 bg-border/50" />
          
          <div className="flex flex-col md:row justify-between items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <p>© 2024 EventHub Platforms Pvt Ltd. All Rights Reserved.</p>
            <div className="flex gap-6">
              <Instagram className="h-4 w-4 hover:text-primary transition-colors cursor-pointer" />
              <Youtube className="h-4 w-4 hover:text-primary transition-colors cursor-pointer" />
              <Globe className="h-4 w-4 hover:text-primary transition-colors cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <DialogTitle className="text-3xl font-black mb-2">Let's Talk About Your Event</DialogTitle>
              <DialogDescription className="text-white/80 text-lg font-medium">
                Our team is here to help you plan the celebration of your dreams.
              </DialogDescription>
            </div>
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl" />
          </div>
          
          <div className="p-8 bg-white">
            <div className="flex gap-4 mb-6">
              <Button 
                type="button"
                variant={contactForm.type === 'message' ? 'default' : 'outline'}
                className="flex-1 rounded-xl h-12 font-bold"
                onClick={() => setContactForm(prev => ({ ...prev, type: 'message' }))}
              >
                <MessageSquare className="h-4 w-4 mr-2" /> Message
              </Button>
              <Button 
                type="button"
                variant={contactForm.type === 'call' ? 'default' : 'outline'}
                className="flex-1 rounded-xl h-12 font-bold"
                onClick={() => setContactForm(prev => ({ ...prev, type: 'call' }))}
              >
                <Phone className="h-4 w-4 mr-2" /> Request Call
              </Button>
            </div>
            
            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contactName" className="font-bold text-foreground">Name</Label>
                  <Input 
                    id="contactName"
                    placeholder="Your name" 
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="h-12 rounded-xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail" className="font-bold text-foreground">Email</Label>
                  <Input 
                    id="contactEmail"
                    type="email"
                    placeholder="Your email" 
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="h-12 rounded-xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactMessage" className="font-bold text-foreground">Message</Label>
                <Textarea 
                  id="contactMessage"
                  placeholder="How can we help?" 
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  required
                  className="rounded-xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 p-4"
                />
              </div>
              
              <div className="flex flex-col gap-4 pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20"
                  disabled={isSendingContact}
                >
                  {isSendingContact ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="mr-2 h-5 w-5" /> Send Message</>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-6 pt-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" /> {vendor?.phone || "+91 123 456 7890"}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" /> {vendor?.email || "hello@eventpro.com"}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookFullServicePage;
