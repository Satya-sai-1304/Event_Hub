import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Calendar, Phone, User, MessageSquare, Navigation, Locate, Tag, Percent, XCircle, CheckCircle2, Sparkles, IndianRupee, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/AuthContext";
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

const BookServicePage = () => {
  const { id: serviceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [vendorLocation, setVendorLocation] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<[number, number][]>([]);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [position, setPosition] = useState<[number, number]>([17.385, 78.4867]); // Hyderabad

  // Catering specific state
  const [numberOfGuests, setNumberOfGuests] = useState<number>(1);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const { data: service, isLoading: isServiceLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: async () => {
      const res = await api.get(`/services/${serviceId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (service?.type === 'Catering' && service?.minGuests) {
      setNumberOfGuests(service.minGuests);
    }
  }, [service]);

  const basePrice = useMemo(() => {
    if (service?.type === 'Catering') {
      const platePrice = service.perPlatePrice || service.price || 0;
      return (platePrice * (numberOfGuests || 1));
    }
    return service?.price || 0;
  }, [service, numberOfGuests]);

  const { data: coupons } = useQuery({
    queryKey: ['coupons', service?.merchantId, service?.type, serviceId],
    queryFn: async () => {
      const response = await api.get<any[]>(`/coupons?merchantId=${service?.merchantId}&serviceType=${service?.type}&serviceId=${serviceId}&applicableType=SERVICE`);
      return response.data;
    },
    enabled: !!service?.merchantId
  });

  const activeCoupons = useMemo(() => {
    if (!coupons || !service) return [];
    const now = new Date();
    const currentAmount = basePrice || 0;

    return coupons.filter(c => {
      const isNotExpired = new Date(c.expiryDate) >= now;
      const isMerchantMatch = String(c.merchantId) === 'admin' || String(c.merchantId) === String(service.merchantId);
      const isGlobalOrServiceMatch = c.isGlobal || 
        (c.serviceType && String(c.serviceType) === String(service.type)) ||
        (c.serviceIds && c.serviceIds.some((id: string) => String(id) === String(serviceId)));
      
      const isAmountReached = currentAmount >= (c.minimumOrderAmount || 0);
      const isUsageLimitNotReached = !c.usageLimit || (c.usageCount || 0) < c.usageLimit;

      return isNotExpired && isMerchantMatch && isGlobalOrServiceMatch && isAmountReached && isUsageLimitNotReached;
    });
  }, [coupons, service, basePrice, serviceId]);

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
        merchantId: service?.merchantId,
        serviceType: service?.type,
        serviceId: serviceId,
        categoryId: service?.categoryId || service?.category_id,
        applicableType: 'SERVICE'
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
    queryKey: ["vendor", service?.merchantId],
    enabled: !!service?.merchantId,
    queryFn: async () => {
      const res = await api.get(`/merchants/${service.merchantId}`);
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

  const calculateRoute = async (start: { lat: number; lng: number } | null, end: [number, number] | null) => {
    if (
      !start ||
      !start.lat ||
      !start.lng ||
      !end ||
      !end[0] ||
      !end[1]
    ) return;

    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data?.routes?.length) {
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
    if (location && vendorLocation) {
      calculateRoute(location, vendorLocation);
    }
  }, [location, vendorLocation]);

  function LocationSelector() {
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
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (!lat || !lng) return;
          setLocation({ lat, lng });
          setPosition([lat, lng]);
          getAddressFromCoordinates(lat, lng);
        },
        () => {
          toast.error("Location access denied");
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
      navigate("/login");
      return;
    }

    if (!location?.lat || !location?.lng) {
      toast.error("Please select location on map");
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
      serviceId,
      merchantId: service.merchantId,
      name: formData.get("name"),
      phone: formData.get("phone"),
      eventDate: eventDate,
      location: manualAddress,
      lat: location.lat,
      lng: location.lng,
      requirements: formData.get("message"),
      status: "pending",
      paymentStatus: "unpaid",
      // Catering details
      guests: service?.type === 'Catering' ? numberOfGuests : undefined,
      numberOfGuests: service?.type === 'Catering' ? numberOfGuests : undefined,
      perPlatePrice: service?.type === 'Catering' ? service.perPlatePrice : undefined,
      // Keep these for backend compatibility if needed
      totalPrice: totalPrice,
      totalAmount: totalPrice,
      discountAmount: discountAmount,
      couponDiscount: discountAmount,
      couponCode: appliedCoupon?.couponCode,
      categoryId: service?.categoryId || service?.category_id,
      serviceType: service?.type,
      customerName: user.name,
      customerEmail: user.email,
      serviceName: service.name,
      eventType: 'service'
    };

    bookingMutation.mutate(bookingData);
  };

  if (isServiceLoading || isVendorLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  const defaultPosition: [number, number] = [17.385, 78.4867];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)} 
          className="text-muted-foreground hover:text-primary p-0 h-auto font-bold flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Service Info */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-t-lg">
              <Carousel className="w-full" opts={{ loop: true }}>
                <CarouselContent>
                  {(service?.images?.length > 0 ? service.images : [service?.image || "/placeholder.svg"]).map((img: string, index: number) => (
                    <CarouselItem key={index}>
                      <div className="w-full h-[350px] flex items-center justify-center bg-gray-50">
                        <img 
                          src={img} 
                          alt={service?.name} 
                          loading="lazy"
                          className="max-w-full max-h-full object-contain" 
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
                  <h1 className="text-3xl font-bold">{service?.name}</h1>
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
              <p className="text-lg mb-6">{service?.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" key="category">{service?.category}</Badge>
                <Badge variant="outline" key="type">{service?.type}</Badge>
                {service?.type === 'Catering' && service?.perPlatePrice ? (
                  <Badge className="bg-primary text-primary-foreground" key="price">₹{service.perPlatePrice} / plate</Badge>
                ) : (
                  <Badge className="bg-primary text-primary-foreground" key="price">₹{service?.price}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Map Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 mr-2 text-primary" /> 📍 Select Event Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full rounded-lg overflow-hidden relative mb-4">
                <MapContainer
                  center={position || defaultPosition}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {vendorLocation && vendorLocation[0] && vendorLocation[1] && (
                    <Marker position={vendorLocation}>
                      <Popup>Vendor: {vendor?.name}</Popup>
                    </Marker>
                  )}
                  {location?.lat && location?.lng && (
                    <Marker position={[location.lat, location.lng]}>
                      <Popup>Your Event Location</Popup>
                    </Marker>
                  )}
                  {route && route.length > 0 && (
                    <Polyline positions={route} color="blue" />
                  )}
                  <LocationSelector />
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
        </div>

        {/* Right Side: Booking Form */}
        <div>
          <Card className="sticky top-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">🎫 Book this Service</CardTitle>
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

                {service?.type === 'Catering' && (
                  <div className="space-y-2">
                    <Label htmlFor="numberOfGuests">Number of Guests</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="numberOfGuests" 
                        name="numberOfGuests" 
                        type="number" 
                        className="pl-10" 
                        min={service?.minGuests || 1}
                        value={numberOfGuests}
                        onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 0)}
                        required 
                      />
                    </div>
                    {service?.perPlatePrice && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" /> {service.perPlatePrice} per plate • Min. {service.minGuests || 1} guests
                      </p>
                    )}
                  </div>
                )}

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
                          placeholder="Enter coupon code 🏷️" 
                          className="pl-9"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={handleApplyCoupon}>
                        Apply ✨
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-primary">{appliedCoupon.couponCode}</p>
                          <p className="text-sm text-muted-foreground">
                            {appliedCoupon.discountType === 'fixed' ? `₹${appliedCoupon.discountValue}` : `${appliedCoupon.discountValue}%`} discount applied
                          </p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                        <XCircle className="h-6 w-6" />
                      </Button>
                    </div>
                  )}

                  {/* Coupon Recommendations */}
                  {!appliedCoupon && activeCoupons.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {activeCoupons.slice(0, 3).map((c) => (
                        <Badge 
                          key={c._id || c.id} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary/10 transition-colors py-1 px-2 border-dashed border-primary/30"
                          onClick={() => setCouponCode(c.couponCode)}
                        >
                          {c.couponCode}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Price Summary */}
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {service?.type === 'Catering' ? (
                        <>Base Price (₹{service.perPlatePrice || service.price || 0} × {numberOfGuests})</>
                      ) : (
                        <>Base Price</>
                      )}
                    </span>
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

export default BookServicePage;
