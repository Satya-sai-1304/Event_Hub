import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, Phone, User, MessageSquare, Navigation, Locate, Tag, Percent, XCircle, CheckCircle2, Sparkles, IndianRupee, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from "react-leaflet";
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

const BookingPage = () => {
  const { type, id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [vendorLocation, setVendorLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [position, setPosition] = useState<[number, number]>([17.385, 78.4867]); // Hyderabad

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [liveCoupons, setLiveCoupons] = useState<any[]>([]);

  const { data: item, isLoading: isItemLoading } = useQuery({
    queryKey: [type, id],
    queryFn: async () => {
      const res = await api.get(`/${type}s/${id}`);
      return res.data;
    },
  });

  const isEventBooking = useMemo(() => {
    if (!item) return true;
    return !!item.eventType || !!(item as any).category_id || !!(item as any).categoryId;
  }, [item]);

  const { data: coupons, refetch: refetchCoupons } = useQuery({
    queryKey: ['coupons', item?.merchantId, id, item?.category_id || item?.categoryId, isEventBooking],
    queryFn: async () => {
      const applicableType = isEventBooking ? 'EVENT' : 'SERVICE';
      const response = await api.get<any[]>(`/coupons`, {
        params: {
          merchantId: item?.merchantId,
          eventId: isEventBooking ? id : undefined,
          categoryId: isEventBooking ? (item?.category_id || item?.categoryId) : undefined,
          serviceId: !isEventBooking ? id : undefined,
          applicableType
        }
      });
      return response.data;
    },
    enabled: !!item?.merchantId && !!id
  });

  useEffect(() => {
    if (coupons) {
      setLiveCoupons(coupons);
    }
  }, [coupons]);

  useEffect(() => {
    if (socket) {
      socket.on('couponCreated', (newCoupon) => {
        // Only accept EVENT, CATEGORY or GLOBAL coupons for event bookings
        const isMatch = newCoupon.merchantId === item?.merchantId && 
          (newCoupon.isGlobal || 
           (newCoupon.applicableType === 'EVENT' && newCoupon.applicableEvents && newCoupon.applicableEvents.some((eid: string) => String(eid) === String(id))) ||
           (newCoupon.applicableType === 'CATEGORY' && String(newCoupon.applicableCategory) === String(item?.category_id || item?.categoryId)) ||
           newCoupon.eventId === id || 
           (newCoupon.categoryId && newCoupon.categoryId === (item?.category_id || item?.categoryId)));
        
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
  }, [socket, item?.merchantId, id]);

  const activeCoupons = useMemo(() => {
    if (!liveCoupons || !item) return [];
    const now = new Date();
    const currentAmount = item.price || 0;

    // Determine if this is an event or service booking
    const isEventBooking = !!item.eventType || !!(item as any).category_id || !!(item as any).categoryId;
    
    return liveCoupons.filter(c => {
      const isNotExpired = new Date(c.expiryDate) >= now;
      const isMerchantMatch = String(c.merchantId) === 'admin' || String(c.merchantId) === String(item.merchantId);
      
      // Filter based on applicableType BEFORE showing
      let isMatch = false;
      const isGlobalMatch = c.isGlobal || c.applicableType === 'ALL';
      
      if (isEventBooking) {
        const isEventMatch = (c.applicableType === 'EVENT' && c.applicableEvents && c.applicableEvents.some((eid: string) => String(eid) === String(id))) || 
                            (c.eventId && String(c.eventId) === String(id));
        const isCategoryMatch = (c.applicableType === 'CATEGORY' && String(c.applicableCategory) === String(item.category_id || item.categoryId)) ||
                               (c.categoryId && String(c.categoryId) === String(item.category_id || item.categoryId));
        isMatch = isGlobalMatch || isEventMatch || isCategoryMatch;
      } else {
        const isServiceMatch = (c.applicableType === 'SERVICE' && c.applicableServices && c.applicableServices.some((sid: string) => String(sid) === String(id))) ||
                              (c.serviceIds && c.serviceIds.some((sid: string) => String(sid) === String(id))) ||
                              (c.serviceType && String(c.serviceType) === String((item as any).type));
        isMatch = isGlobalMatch || isServiceMatch;
      }
      
      // Visibility based on minimum order amount and usage limit
      const isAmountReached = currentAmount >= (c.minimumOrderAmount || 0);
      const isUsageLimitNotReached = !c.usageLimit || (c.usageCount || 0) < c.usageLimit;

      return isNotExpired && isMerchantMatch && isMatch && isAmountReached && isUsageLimitNotReached;
    });
  }, [liveCoupons, item]);

  const basePrice = item?.price || 0;

  const discountAmount = useMemo(() => {
    if (!appliedCoupon || !basePrice) return 0;
    if (appliedCoupon.discountType === 'fixed') return appliedCoupon.discountValue;
    return basePrice * (appliedCoupon.discountValue / 100);
  }, [appliedCoupon, basePrice]);

  const totalPrice = basePrice - discountAmount;

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    try {
      const response = await api.post('/coupons/validate', {
        code: couponCode.toUpperCase(),
        orderAmount: basePrice,
        userId: user?.id || user?._id,
        merchantId: item?.merchantId,
        eventId: isEventBooking ? (item?.id || item?._id) : undefined,
        categoryId: isEventBooking ? (item?.category_id || item?.categoryId) : undefined,
        serviceType: !isEventBooking ? (item as any).type : undefined,
        serviceId: !isEventBooking ? (item?.id || item?._id) : undefined,
        applicableType: isEventBooking ? 'EVENT' : 'SERVICE'
      });

      if (response.data) {
        setAppliedCoupon(response.data);
        toast.success(`Coupon ${response.data.couponCode} applied successfully!`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const { data: vendor, isLoading: isVendorLoading } = useQuery({
    queryKey: ["vendor", item?.merchantId],
    enabled: !!item?.merchantId,
    queryFn: async () => {
      const res = await api.get(`/merchants/${item.merchantId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (vendor?.location?.lat && vendor?.location?.lng) {
      setVendorLocation([vendor.location.lat, vendor.location.lng]);
    }
  }, [vendor]);

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

  const calculateRoute = async (start: { lat: number; lng: number }, end: [number, number]) => {
    try {
      if (!start || !end || !start.lat || !start.lng || !end[0] || !end[1]) return;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRoute(coords);
        setDistance((data.routes[0].distance / 1000).toFixed(2) + " km");
        setDuration(Math.round(data.routes[0].duration / 60) + " min");
      }
    } catch (err) {
      console.error("Error calculating route:", err);
    }
  };

  useEffect(() => {
    if (mapLocation && vendorLocation) {
      calculateRoute(mapLocation, vendorLocation);
    }
  }, [mapLocation, vendorLocation]);

  function LocationSelector({ setLocation, setPosition, getAddressFromCoordinates }: { 
    setLocation: (loc: { lat: number; lng: number }) => void,
    setPosition: (pos: [number, number]) => void,
    getAddressFromCoordinates: (lat: number, lng: number) => void
  }) {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setLocation({ lat, lng });
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

  const bookingMutation = useMutation({
    mutationFn: async (bookingData: any) => {
      const res = await api.post("/bookings", bookingData);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Booking request sent successfully!");
      navigate("/dashboard/my-bookings");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create booking.");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to book a service.");
      navigate("/login", { state: { from: routeLocation.pathname + routeLocation.search } });
      return;
    }

    if (!mapLocation) {
      toast.error("Please select a location on the map.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const eventDate = formData.get("eventDate");

    if (!eventDate) {
      toast.error("Please select event date");
      return;
    }

    if (!user?._id && !user?.id) {
      toast.error("User not found. Please login again.");
      return;
    }

    const bookingData = {
      customerId: user._id || user.id,
      serviceId: type === 'service' ? id : undefined,
      eventId: type === 'event' ? id : undefined,
      merchantId: item.merchantId,
      name: formData.get("name"),
      phone: formData.get("phone"),
      eventDate: eventDate,
      location: manualAddress,
      lat: mapLocation.lat,
      lng: mapLocation.lng,
      requirements: formData.get("message"),
      status: "pending",
      totalPrice: totalPrice,
      discountAmount: discountAmount,
      couponCode: appliedCoupon?.couponCode,
      customerName: user.name,
      customerEmail: user.email,
      serviceName: type === 'service' ? item.name : undefined,
      eventTitle: type === 'event' ? item.title : undefined,
      eventType: type === 'service' ? 'service' : (item.eventType || 'full-service')
    };

    bookingMutation.mutate(bookingData);
  };

  if (isItemLoading || isVendorLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const images = [item?.image, ...(item?.images || [])].filter(Boolean);
  const uniqueImages = Array.from(new Set(images));
  const carouselImages = uniqueImages.length > 0 ? uniqueImages : ["/placeholder.svg"];

  const BackButton = () => (
    <Button 
      variant="ghost" 
      size="sm" 
      className="mb-4 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all flex items-center gap-2 px-0"
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Browse
    </Button>
  );

  if (!showBookingForm) {
    return (
      <div className="w-full px-6 py-8 animate-fade-in">
        <BackButton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Image and Details */}
          <div className="space-y-6">
            {/* Detailed Image View */}
            <Card className="overflow-hidden border-none shadow-2xl bg-background/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <Carousel className="w-full" opts={{ loop: true }}>
                <CarouselContent>
                  {carouselImages.map((img: string, index: number) => (
                    <CarouselItem key={`image-${index}`}>
                      <div className="w-full h-[350px] flex items-center justify-center bg-gray-50">
                        <img 
                          src={img} 
                          alt={item?.name || item?.title} 
                          loading="lazy"
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-white/80 hover:bg-white text-primary border-none shadow-lg" />
                <CarouselNext className="right-4 bg-white/80 hover:bg-white text-primary border-none shadow-lg" />
              </Carousel>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border-none">
                    {item?.category}
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 text-xs font-bold uppercase tracking-wider border-primary/20 text-primary/80">
                    {item?.type}
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">{item?.name || item?.title}</h1>
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                    <AvatarImage src={vendor?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${vendor?.name}`} />
                    <AvatarFallback className="bg-primary/5 text-primary font-bold">{vendor?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Offered by</p>
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      {vendor?.name}
                      <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-8 mx-2" />
                  <div className="flex items-center bg-yellow-400/10 text-yellow-600 px-3 py-1.5 rounded-full border border-yellow-400/20">
                    <Star className="w-4 h-4 fill-current mr-1.5" />
                    <span className="font-black text-sm">{vendor?.rating || "4.8"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 w-full md:w-auto min-w-[200px] text-center md:text-left">
                <p className="text-xs text-primary font-bold uppercase tracking-widest mb-1">Starting from</p>
                <div className="flex items-center justify-center md:justify-start gap-1">
                  <IndianRupee className="h-6 w-6 text-primary stroke-[3]" />
                  <span className="text-4xl font-black text-primary">{(item?.price || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Description
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {item?.description || "No description provided for this service."}
              </p>
            </div>

            <div className="pt-8 pb-12">
              <Button 
                onClick={() => setShowBookingForm(true)}
                className="w-full h-16 text-xl font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 gradient-primary text-white border-none group"
              >
                Book Now
                <Sparkles className="ml-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
              </Button>
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Service/Event Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-t-lg">
              <Carousel className="w-full" opts={{ loop: true }}>
                <CarouselContent>
                  {carouselImages.map((img: string, index: number) => (
                    <CarouselItem key={`image-${index}`}>
                      <div className="w-full h-[500px] flex items-center justify-center bg-gray-50">
                        <img 
                          src={img} 
                          alt={item?.name || item?.title} 
                          className="w-full h-full object-contain" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </Carousel>
            </CardContent>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold">{item?.name || item?.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={vendor?.profileImage || `https://api.dicebear.com/7.x/initials/svg?seed=${vendor?.name}`} />
                      <AvatarFallback>{vendor?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-muted-foreground flex items-center">
                      By {vendor?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                  <Star className="w-4 h-4 fill-current mr-1" />
                  <span className="font-bold">{vendor?.rating || "New"}</span>
                </div>
              </div>
              <p className="text-lg mb-6">{item?.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{item?.category || item?.type}</Badge>
                {item?.type && <Badge variant="outline">{item?.type}</Badge>}
                {item?.price > 0 && (
                  <Badge className="bg-primary text-primary-foreground">Base: ₹{item?.price}</Badge>
                )}
                {item?.perPlatePrice > 0 && (
                  <Badge className="bg-primary text-primary-foreground">Plate: ₹{item?.perPlatePrice}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" /> Select Event Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full rounded-lg overflow-hidden relative mb-4">
                <MapContainer
                  center={position}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {vendorLocation && (
                    <Marker position={vendorLocation}>
                      <Popup>Vendor: {vendor?.name}</Popup>
                    </Marker>
                  )}
                  {mapLocation && (
                    <Marker position={[mapLocation.lat, mapLocation.lng]}>
                      <Popup>Your Event Location</Popup>
                    </Marker>
                  )}
                  {route.length > 0 && <Polyline positions={route} color="blue" />}
                  <LocationSelector setLocation={setMapLocation} setPosition={setPosition} getAddressFromCoordinates={getAddressFromCoordinates} />
                </MapContainer>
                <Button
                  onClick={handleUseMyLocation}
                  className="absolute bottom-4 right-4 z-[1000] shadow-lg"
                  variant="secondary"
                  size="sm"
                >
                  <Locate className="w-4 h-4 mr-2" /> Use My Location
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manualLocation">Manual Location Input</Label>
                  <Input 
                    id="manualLocation" 
                    placeholder="Enter location manually or click on map" 
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                  />
                </div>

                {distance && (
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <div className="flex items-center">
                      <Navigation className="w-5 h-5 mr-2 text-primary" />
                      <div>
                        <p className="text-sm font-medium">Route Info</p>
                        <p className="text-xs text-muted-foreground">From Vendor to You</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{distance}</p>
                      <p className="text-xs text-muted-foreground">{duration}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Applicable Coupons Section */}
          {activeCoupons.length > 0 && (
            <Card className="border-primary/10 bg-primary/5 dark:bg-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                  <Percent className="h-5 w-5" />
                  Available Coupons For You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {activeCoupons.map((coupon: any) => {
                    const isUsed = coupon.usedBy?.includes(user?.id || user?._id);
                    return (
                      <div key={coupon._id || coupon.id} className={`bg-background border border-primary/20 rounded-xl p-3 flex flex-col justify-between group hover:border-primary transition-all ${isUsed ? 'opacity-70' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-black text-sm tracking-wider text-primary ${isUsed ? 'line-through' : ''}`}>{coupon.couponCode}</span>
                          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/10 px-1.5 py-0 uppercase font-bold">
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-3">
                          Min. order: ₹{coupon.minimumOrderAmount.toLocaleString()} {isUsed && "• (Used)"}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={`h-7 text-[10px] font-bold rounded-lg w-full ${isUsed ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300'}`}
                          onClick={() => {
                            if (!isUsed) {
                              setCouponCode(coupon.couponCode);
                              toast.success(`Coupon ${coupon.couponCode} selected!`);
                            }
                          }}
                          disabled={isUsed || !!appliedCoupon}
                        >
                          {isUsed ? 'ALREADY USED' : 'APPLY CODE'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Side: Booking Form */}
        <div>
          <Card className="sticky top-8">
            <CardHeader>
              <CardTitle>Book this {type === 'service' ? 'Service' : 'Event'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="Enter your name" required defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" placeholder="Enter your phone number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Event Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="eventDate" name="eventDate" type="date" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Special Requirements</Label>
                  <Textarea id="message" name="message" placeholder="Any specific details you want to share..." className="min-h-[100px]" />
                </div>

                <Separator />

                {/* Coupon Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Apply Coupon</h3>
                  </div>
                  
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Enter coupon code" 
                          className="pl-9"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={handleApplyCoupon}>
                        Apply
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{appliedCoupon.couponCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {appliedCoupon.discountType === 'fixed' ? `₹${appliedCoupon.discountValue}` : `${appliedCoupon.discountValue}%`} discount applied
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </div>
                  )}

                  {/* Coupon Recommendations */}
                  {!appliedCoupon && activeCoupons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeCoupons.slice(0, 3).map((c) => {
                        const isUsed = c.usedBy?.includes(user?.id || user?._id);
                        return (
                          <Badge 
                            key={c.id || c._id} 
                            variant={isUsed ? "outline" : "secondary"} 
                            className={`cursor-pointer transition-colors py-1 px-2 border-dashed border-primary/30 ${isUsed ? 'opacity-50 cursor-not-allowed line-through' : 'hover:bg-primary/10'}`}
                            onClick={() => !isUsed && setCouponCode(c.couponCode)}
                          >
                            {c.couponCode} {isUsed && "(Used)"}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Price Summary */}
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span>₹{basePrice.toLocaleString()}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600 font-medium">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Discount ({appliedCoupon.couponCode})</span>
                      <span>- ₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold">Total Amount</span>
                    <span className="text-2xl font-bold text-primary flex items-center gap-1">
                      <IndianRupee className="h-5 w-5" />
                      {totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-lg font-bold gradient-primary" disabled={bookingMutation.isPending}>
                  {bookingMutation.isPending ? "Processing..." : "Confirm Booking"}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-4">
                  By clicking confirm, you agree to our terms and conditions.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
