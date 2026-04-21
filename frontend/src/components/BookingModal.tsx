import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Event} from "@/data/mockData";
import { toast } from "sonner";
import { Calendar, MapPin, IndianRupee, Users, Loader2, Sparkles, Clock, XCircle, Tag, Percent, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Separator } from "@/components/ui/separator";

interface Booking {
  _id?: string
  id?: string
  eventId: string
  eventDate: string
  timeSlot?: string
  status: string
  customerId?: string
  totalAmount?: number
}

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface BookingModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingComplete?: (booking: any) => void;
}

const BookingModal = ({ event, open, onOpenChange, onBookingComplete }: BookingModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // State for ticketed events
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  
  // Initialize selected tickets when event changes or modal opens
  useEffect(() => {
    if (open && event?.eventType === 'ticketed') {
      const initial: Record<string, number> = {};
      if (event.ticketTypes && event.ticketTypes.length > 0) {
        event.ticketTypes.forEach((t: any) => {
          initial[t.name] = 0;
        });
      } else {
        initial["General Admission"] = 0;
      }
      setSelectedTickets(initial);
    }
  }, [open, event]);

  const updateTicketQuantity = (name: string, delta: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) + delta)
    }));
  };

  const totalTickets = Object.values(selectedTickets).reduce((sum, q) => sum + q, 0);
  
  const ticketedTotalPrice = event?.ticketTypes?.length > 0
    ? event.ticketTypes.reduce((sum: number, t: any) => {
        const now = new Date();
        const isEarlyBird = t.earlyBirdPrice && t.earlyBirdEndDate && now < new Date(t.earlyBirdEndDate);
        const currentPrice = isEarlyBird ? t.earlyBirdPrice : t.price;
        return sum + (currentPrice * (selectedTickets[t.name] || 0));
      }, 0)
    : (event?.price || 0) * (totalTickets || 1);

  const isSoldOut = (event as any)?.isSoldOut || (event?.ticketTypes?.length > 0 && event.ticketTypes.every((t: any) => t.remainingQuantity <= 0));

  // State for full-service events
  const [eventDate, setEventDate] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState("1");
  const [timeSlot, setTimeSlot] = useState<"day" | "night">("day");
  const [selectedDecoration, setSelectedDecoration] = useState<string>("");
  const [selectedCatering, setSelectedCatering] = useState<string>("");
  const [selectedMusic, setSelectedMusic] = useState<string>("");
  const [selectedLighting, setSelectedLighting] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  
  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const { data: coupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await api.get<any[]>('/coupons');
      return response.data;
    },
  });

  const activeCoupons = useMemo(() => {
    if (!coupons) return [];
    const now = new Date();
    return coupons.filter(c => new Date(c.expiryDate) >= now);
  }, [coupons]);

  const { data: services = [] } = useQuery({
    queryKey: ['services', event?.organizerId],
    queryFn: async () => {
      const response = await api.get<any[]>('/services', {
        params: { merchantId: event?.organizerId }
      });
      return response.data;
    },
    enabled: !!(open && event?.eventType === 'full-service' && event?.organizerId),
  });

  const getServicePrice = (id: string, type: string) => {
    if (!id) return 0;
    const service = services.find(s => (s._id || s.id) === id);
    if (type.toLowerCase() === 'catering') {
      return service?.perPlatePrice || service?.price || 0;
    }
    return service?.price || 0;
  };

  const isFullService = event?.eventType === 'full-service';
  const guestsCount = parseInt(numberOfGuests) || 1;
  const decorationPrice = getServicePrice(selectedDecoration, 'decoration');
  const cateringPrice = getServicePrice(selectedCatering, 'catering') * guestsCount;
  const musicPrice = getServicePrice(selectedMusic, 'music');
  const lightingPrice = getServicePrice(selectedLighting, 'lighting');

  const basePrice = isFullService 
    ? (event?.price || 0) + decorationPrice + cateringPrice + musicPrice + lightingPrice
    : ticketedTotalPrice;

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'fixed') return appliedCoupon.discountValue;
    return basePrice * (appliedCoupon.discountValue / 100);
  }, [appliedCoupon, basePrice]);

  const totalPrice = basePrice - discountAmount;

  const handleApplyCoupon = () => {
    if (!activeCoupons) return;
    const coupon = activeCoupons.find(c => c.couponCode.toUpperCase() === couponCode.toUpperCase());
    if (coupon) {
      if (basePrice >= coupon.minimumOrderAmount) {
        setAppliedCoupon(coupon);
        toast.success(`Coupon ${coupon.couponCode} applied successfully!`);
      } else {
        toast.error(`Minimum order amount for this coupon is ₹${coupon.minimumOrderAmount.toLocaleString()}`);
      }
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const bookingMutation = useMutation({
    mutationFn: async (paymentDetails?: any) => {
      if (!event || !user) throw new Error("Missing event or user");
      
      const selectedTicketTypes = Object.entries(selectedTickets).filter(([_, q]) => q > 0);
      if (!isFullService && selectedTicketTypes.length === 0) {
        throw new Error("Please select at least one ticket");
      }

      const bookingData: any = {
        eventId: event.id,
        eventTitle: event.title,
        eventType: event.eventType || 'ticketed',
        customerId: user.id,
        customerName: user.name,
        customerEmail: user.email,
        eventDate: isFullService ? (eventDate || new Date().toISOString()) : event.eventDate,
        timeSlot,
        guests: isFullService ? guestsCount : totalTickets,
        totalPrice: totalPrice,
        totalAmount: totalPrice,
        discountAmount: discountAmount,
        appliedCoupon: appliedCoupon?.couponCode,
        status: isFullService ? 'pending' : 'confirmed', 
        paymentStatus: isFullService ? 'unpaid' : 'paid',
        organizerId: event.organizerId,
      };

      if (paymentDetails) {
        bookingData.paymentId = paymentDetails.razorpay_payment_id;
        bookingData.razorpayOrderId = paymentDetails.razorpay_order_id;
      }
      
      if (!isFullService) {
        bookingData.ticketType = selectedTicketTypes.map(([name, q]) => `${name} (${q})`).join(", ");
        bookingData.selectedTickets = selectedTicketTypes.map(([name, q]) => ({ name, quantity: q }));
        bookingData.quantity = totalTickets;
        // Generate QR code for ticketed events
        bookingData.qrCode = `TICKET-${event.id}-${user.id}-${Date.now()}`;
      }

      if (isFullService) {
        bookingData.status = 'pending';
        bookingData.paymentStatus = 'unpaid';
        bookingData.additionalNotes = additionalNotes;
        
        // Include itemized costs
        bookingData.billingDetails = {
          decorationCost: decorationPrice,
          cateringCost: cateringPrice,
          musicCost: musicPrice,
          lightingCost: lightingPrice,
          subtotal: totalPrice,
          finalTotal: totalPrice
        };
        
        // Only include services if they are selected
        const selectedServices: any = {};
        if (selectedDecoration) selectedServices.decoration = selectedDecoration;
        if (selectedCatering) selectedServices.catering = selectedCatering;
        if (selectedMusic) selectedServices.music = selectedMusic;
        if (selectedLighting) selectedServices.lighting = selectedLighting;
        
        if (Object.keys(selectedServices).length > 0) {
          bookingData.selectedServices = selectedServices;
        }
      }

      const response = await api.post('/bookings', bookingData);
      
      // If ticketed, we also create ticket documents for each ticket type
      if (!isFullService && response.data) {
        for (const [name, q] of selectedTicketTypes) {
          const ticketTypeInfo = event.ticketTypes?.find((t: any) => t.name === name);
          await api.post('/tickets', {
            eventId: event.id,
            bookingId: response.data.id || response.data._id,
            ticketId: response.data.ticketId, // Use the same ticketId from the booking
            ticketName: name,
            price: ticketTypeInfo?.price || 0,
            quantity: q,
            userId: user.id
          });
        }
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(isFullService ? "Booking request submitted successfully!" : "Tickets booked successfully!");
      if (onBookingComplete) onBookingComplete(data);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || "Failed to submit booking");
    },
  });

  const { data: availability } = useQuery({
    queryKey: ['availability', event?.id, eventDate],
    queryFn: async () => {
      if (!event?.id || !eventDate) return null;
      const response = await api.get(`/events/${event.id}/availability`, {
        params: { date: eventDate }
      });
      return response.data;
    },
    enabled: !!(open && isFullService && eventDate),
  });

  const isDateFull = isFullService && eventDate && availability && availability[timeSlot === 'day' ? 'Day' : 'Night'] === 'Full';

  const handleBooking = async () => {
    if (!user) {
      toast.error("Please log in to book this event.");
      return;
    }

    if (isFullService && !eventDate) {
      toast.error("Please select a preferred date.");
      return;
    }

    if (isDateFull) {
      toast.error("This slot is fully booked. Please choose another time.");
      return;
    }

    if (!isFullService) {
      const selectedCount = Object.values(selectedTickets).reduce((sum, q) => sum + q, 0);
      if (selectedCount === 0) {
        toast.error("Please select at least one ticket.");
        return;
      }

      // Razorpay Integration
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_your_key_here";
      
      if (razorpayKey === "rzp_test_your_key_here") {
        toast.info("Using mock payment for development");
        setTimeout(() => {
          bookingMutation.mutate({
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_order_id: `order_mock_${Date.now()}`,
          });
        }, 1500);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Razorpay SDK failed to load");
        return;
      }

      const options = {
        key: razorpayKey, 
        amount: totalPrice * 100, 
        currency: "INR",
        name: "EventHub",
        description: `Tickets for ${event.title}`,
        handler: function (response: any) {
          bookingMutation.mutate(response);
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#8b5cf6",
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } else {
      // Full service events don't require immediate payment
      bookingMutation.mutate(undefined);
    }
  };

  if (!event) return null;

  const isEventEnded = event.status === 'completed' || event.status === 'cancelled';

  if (isEventEnded && open) {
    onOpenChange(false);
    toast.error("This event has ended and is no longer accepting bookings.");
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Book {event.title}
          </DialogTitle>
          <DialogDescription>
            {isFullService 
              ? "Tell us your requirements and we'll plan the perfect event for you."
              : "Confirm your tickets and get ready for the event."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Event Info */}
          <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {isFullService ? "Multiple Dates Available" : new Date(event.eventDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Capacity: {event.capacity}</span>
            </div>
          </div>

          {isSoldOut && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center gap-3 text-destructive">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                <XCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold">This event is SOLD OUT</p>
                <p className="text-sm opacity-90">All tickets have been sold. Please check other events.</p>
              </div>
            </div>
          )}

          {isFullService ? (
            /* Full Service Event Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Preferred Date</Label>
                  <Input 
                    id="eventDate" 
                    type="date" 
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={isDateFull ? "border-destructive text-destructive" : ""}
                  />
                  {isDateFull && (
                    <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      This slot is already full.
                    </p>
                  )}
                  {isFullService && eventDate && availability && (
                    <div className="flex gap-2 mt-1">
                      <Badge variant={availability.Day === 'Full' ? 'destructive' : 'outline'} className="text-[10px]">
                        Day: {availability.Day}
                      </Badge>
                      <Badge variant={availability.Night === 'Full' ? 'destructive' : 'outline'} className="text-[10px]">
                        Night: {availability.Night}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guests">Number of Guests</Label>
                  <Input 
                    id="guests" 
                    type="number" 
                    min="1" 
                    value={numberOfGuests}
                    onChange={(e) => setNumberOfGuests(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">Time Slot</Label>
                  <Select value={timeSlot} onValueChange={(v: any) => setTimeSlot(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Day (10 AM - 4 PM)</SelectItem>
                      <SelectItem value="night">Night (6 PM - 11 PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Decoration Theme</Label>
                  <Select value={selectedDecoration} onValueChange={setSelectedDecoration}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose decoration" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.type.toLowerCase() === 'decoration').map(s => (
                        <SelectItem key={s._id || s.id} value={s._id || s.id}>
                          {s.name} (+₹{s.price.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDecoration && (
                    <div className="mt-2 p-2 border rounded-lg bg-muted/30 flex gap-3 animate-in fade-in slide-in-from-top-1">
                      {services.find(s => (s._id || s.id) === selectedDecoration)?.image && (
                        <img 
                          src={services.find(s => (s._id || s.id) === selectedDecoration)?.image} 
                          alt="Decoration" 
                          className="w-16 h-16 rounded-md object-cover shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{services.find(s => (s._id || s.id) === selectedDecoration)?.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {services.find(s => (s._id || s.id) === selectedDecoration)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Catering Option</Label>
                  <Select value={selectedCatering} onValueChange={setSelectedCatering}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose catering" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.type.toLowerCase() === 'catering').map(s => (
                        <SelectItem key={s._id || s.id} value={s._id || s.id}>
                          {s.name} (+₹{(s.perPlatePrice || s.price || 0).toLocaleString()}/guest)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCatering && (
                    <div className="mt-2 p-2 border rounded-lg bg-muted/30 flex gap-3 animate-in fade-in slide-in-from-top-1">
                      {services.find(s => (s._id || s.id) === selectedCatering)?.image && (
                        <img 
                          src={services.find(s => (s._id || s.id) === selectedCatering)?.image} 
                          alt="Catering" 
                          className="w-16 h-16 rounded-md object-cover shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{services.find(s => (s._id || s.id) === selectedCatering)?.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {services.find(s => (s._id || s.id) === selectedCatering)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Music & Entertainment</Label>
                  <Select value={selectedMusic} onValueChange={setSelectedMusic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose music" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.type.toLowerCase() === 'music').map(s => (
                        <SelectItem key={s._id || s.id} value={s._id || s.id}>
                          {s.name} (+₹{s.price.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedMusic && (
                    <div className="mt-2 p-2 border rounded-lg bg-muted/30 flex gap-3 animate-in fade-in slide-in-from-top-1">
                      {services.find(s => (s._id || s.id) === selectedMusic)?.image && (
                        <img 
                          src={services.find(s => (s._id || s.id) === selectedMusic)?.image} 
                          alt="Music" 
                          className="w-16 h-16 rounded-md object-cover shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{services.find(s => (s._id || s.id) === selectedMusic)?.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {services.find(s => (s._id || s.id) === selectedMusic)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Lighting & Ambience</Label>
                  <Select value={selectedLighting} onValueChange={setSelectedLighting}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose lighting" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.filter(s => s.type.toLowerCase() === 'lighting').map(s => (
                        <SelectItem key={s._id || s.id} value={s._id || s.id}>
                          {s.name} (+₹{s.price.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedLighting && (
                    <div className="mt-2 p-2 border rounded-lg bg-muted/30 flex gap-3 animate-in fade-in slide-in-from-top-1">
                      {services.find(s => (s._id || s.id) === selectedLighting)?.image && (
                        <img 
                          src={services.find(s => (s._id || s.id) === selectedLighting)?.image} 
                          alt="Lighting" 
                          className="w-16 h-16 rounded-md object-cover shadow-sm"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{services.find(s => (s._id || s.id) === selectedLighting)?.name}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {services.find(s => (s._id || s.id) === selectedLighting)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="notes">Additional Requirements</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Tell us more about your special requirements..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            /* Ticketed Event Form */
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Select Tickets</Label>
                {event.ticketTypes && event.ticketTypes.length > 0 ? (
                  <div className="space-y-4">
                    {event.ticketTypes.map((ticket: any) => {
                      const now = new Date();
                      const isEarlyBird = ticket.earlyBirdPrice && ticket.earlyBirdEndDate && now < new Date(ticket.earlyBirdEndDate);
                      const currentPrice = isEarlyBird ? ticket.earlyBirdPrice : ticket.price;
                      const isTicketSoldOut = ticket.remainingQuantity <= 0;

                      return (
                        <div key={ticket.name} className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${isTicketSoldOut ? 'opacity-60 bg-muted/10' : 'bg-muted/30 hover:bg-muted/50'}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-lg">{ticket.name}</h4>
                              {isTicketSoldOut && (
                                <Badge variant="destructive" className="text-[10px] h-4">SOLD OUT</Badge>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-semibold">₹{currentPrice.toLocaleString()}</span>
                                {isEarlyBird && (
                                  <>
                                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">Early Bird</span>
                                    <span className="text-xs line-through text-muted-foreground">₹{ticket.price.toLocaleString()}</span>
                                  </>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {ticket.remainingQuantity} tickets left
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-background border rounded-lg p-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => updateTicketQuantity(ticket.name, -1)}
                              disabled={!selectedTickets[ticket.name] || isTicketSoldOut}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-bold">{selectedTickets[ticket.name] || 0}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => updateTicketQuantity(ticket.name, 1)}
                              disabled={isTicketSoldOut || (selectedTickets[ticket.name] || 0) >= ticket.remainingQuantity}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 border-2 border-dashed rounded-xl text-center space-y-4">
                    <div className="flex items-center justify-center gap-4">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setSelectedTickets(prev => ({ ...prev, "General Admission": Math.max(0, (prev["General Admission"] || 0) - 1) }))}
                      >
                        -
                      </Button>
                      <div className="text-center">
                        <span className="text-3xl font-bold">{selectedTickets["General Admission"] || 0}</span>
                        <p className="text-xs text-muted-foreground">Tickets</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setSelectedTickets(prev => ({ ...prev, "General Admission": (prev["General Admission"] || 0) + 1 }))}
                      >
                        +
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Standard admission ticket for the event.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Available Coupons & Coupon Application */}
          <div className="space-y-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
              <Percent className="h-4 w-4" /> Available Offers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeCoupons.map((c) => (
                <div key={c._id || c.id} className="bg-white p-3 rounded-xl border border-primary/10 flex flex-col justify-between group hover:border-primary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-sm tracking-wider text-primary">{c.couponCode}</span>
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/10 px-1.5 py-0 uppercase font-bold">
                      {c.discountType === 'fixed' ? `₹${c.discountValue} off` : `${c.discountValue}% off`}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                    {c.discountType === 'fixed' ? `₹${c.discountValue}` : `${c.discountValue}%`} off on orders above ₹{c.minimumOrderAmount.toLocaleString()}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10 p-0 w-full"
                    onClick={() => {
                      setCouponCode(c.couponCode);
                      toast.success(`Coupon ${c.couponCode} selected!`);
                    }}
                  >
                    Select Coupon
                  </Button>
                </div>
              ))}
              {activeCoupons.length === 0 && (
                <div className="col-span-2 py-4 text-center text-xs text-muted-foreground">
                  No coupons available at the moment.
                </div>
              )}
            </div>

            <Separator className="bg-primary/10" />

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Apply Coupon Code</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Enter code..." 
                    className="pl-9 h-11 rounded-xl" 
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={!!appliedCoupon}
                  />
                </div>
                {appliedCoupon ? (
                  <Button variant="outline" className="h-11 px-4 rounded-xl border-red-200 text-red-500 hover:bg-red-50" onClick={removeCoupon}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button className="h-11 px-6 rounded-xl gradient-primary" onClick={handleApplyCoupon} disabled={!couponCode}>
                    Apply
                  </Button>
                )}
              </div>
              {appliedCoupon && (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" /> Coupon "{appliedCoupon.couponCode}" applied!
                </p>
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="p-4 bg-muted rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Price</span>
              <span className="font-medium">₹{basePrice.toLocaleString()}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-green-600 font-medium">
                <span className="flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Discount ({appliedCoupon.couponCode})
                </span>
                <span>- ₹{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t mt-2">
              <span className="font-bold">Total Amount</span>
              <span className="text-xl font-black text-primary flex items-center gap-1">
                <IndianRupee className="h-5 w-5" />
                {totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="gradient-primary text-primary-foreground min-w-[150px]"
            onClick={handleBooking}
            disabled={bookingMutation.isPending || (!isFullService && (totalPrice === 0 || isSoldOut))}
          >
            {bookingMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : isSoldOut ? (
              "Sold Out"
            ) : isFullService ? (
              "Request Booking"
            ) : (
              "Confirm & Pay"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;