﻿import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, XCircle, Loader2, ArrowLeft, User, Edit2, CreditCard, Smartphone, ShieldCheck, Zap, Ticket, ArrowRight, Tag as TagIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { Separator } from "@/components/ui/separator";

declare global { interface Window { Razorpay: any; } }

const loadRazorpayScript = () => new Promise((resolve) => {
  if (window.Razorpay) { resolve(true); return; }
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const BookTicketedEventPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [liveCoupons, setLiveCoupons] = useState<any[]>([]);
  const [step, setStep] = useState<'selection' | 'payment'>('selection');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');
  const [userDetails, setUserDetails] = useState({ name: user?.name || "", email: user?.email || "", phone: (user as any)?.phone || "9999999999" });

  useEffect(() => { if (user) setUserDetails({ name: user.name || "", email: user.email || "", phone: (user as any).phone || "9999999999" }); }, [user]);

  const { data: event, isLoading: isEventLoading } = useQuery({ queryKey: ['event', id], queryFn: async () => { const res = await api.get(`/events/${id}`); return res.data; } });
  const { data: vendor, isLoading: isVendorLoading } = useQuery({ queryKey: ["vendor", event?.organizerId], enabled: !!event?.organizerId, queryFn: async () => { const res = await api.get(`/merchants/${event.organizerId}`); return res.data; } });
  const { data: coupons } = useQuery({ queryKey: ['coupons', event?.organizerId, id], queryFn: async () => { const r = await api.get<any[]>(`/coupons?merchantId=${event?.organizerId}&eventId=${id}&applicableType=EVENT`); return r.data; }, enabled: !!event?.organizerId && !!id });

  useEffect(() => { if (coupons) setLiveCoupons(coupons); }, [coupons]);

  const totalTickets = Object.values(selectedTickets).reduce((sum, q) => sum + (q || 0), 0);
  const basePrice = useMemo(() => { if (!event) return 0; return event.ticketTypes?.length > 0 ? event.ticketTypes.reduce((sum: number, t: any) => sum + (t.price * (selectedTickets[t.name] || 0)), 0) : (event?.price || 0) * (totalTickets || 0); }, [event, selectedTickets, totalTickets]);
  const discountAmount = useMemo(() => { if (!appliedCoupon) return 0; if (appliedCoupon.discountType === 'fixed') return appliedCoupon.discountValue; return basePrice * (appliedCoupon.discountValue / 100); }, [appliedCoupon, basePrice]);
  const convenienceFee = 49;
  const totalPrice = basePrice + convenienceFee - discountAmount;

  useEffect(() => { if (event?.eventType === 'ticketed') { const init: Record<string,number> = {}; if (event.ticketTypes?.length > 0) event.ticketTypes.forEach((t: any) => { init[t.name] = 0; }); else init["General Admission"] = 0; setSelectedTickets(init); } }, [event]);

  const updateTicketQuantity = (name: string, delta: number) => setSelectedTickets(prev => ({ ...prev, [name]: Math.max(0, (prev[name] || 0) + delta) }));
  const handleApplyCoupon = async () => { if (!couponCode) { toast.error("Enter a coupon code"); return; } try { const r = await api.post('/coupons/validate', { code: couponCode.toUpperCase(), orderAmount: basePrice, userId: (user as any)?.id || (user as any)?._id, merchantId: event?.organizerId, eventId: id, applicableType: 'EVENT' }); if (r.data) { setAppliedCoupon(r.data); toast.success("Coupon applied!"); } } catch (e: any) { toast.error(e.response?.data?.message || "Invalid coupon"); setAppliedCoupon(null); } };
  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); };
  const bookingMutation = useMutation({
    mutationFn: async (paymentDetails: any) => {
      if (!event || !user) throw new Error("Missing event or user");
      const sel = Object.entries(selectedTickets).filter(([_, q]) => q > 0);
      const bookingData: any = { eventId: event.id || event._id, eventTitle: event.title, eventType: 'ticketed', customerId: (user as any).id || (user as any)._id, customerName: userDetails.name, customerEmail: userDetails.email, customerPhone: userDetails.phone, eventDate: event.eventDate, guests: totalTickets, totalPrice, totalAmount: totalPrice, discountAmount, convenienceFee, couponCode: appliedCoupon?.couponCode, organizerId: event.organizerId, ticketType: sel.map(([n,q]) => `${n} (${q})`).join(", "), selectedTickets: sel.map(([n,q]) => ({ name: n, quantity: q, price: event.ticketTypes?.find((t: any) => t.name === n)?.price || 0 })), quantity: totalTickets, qrCode: `TICKET-${event.id||event._id}-${(user as any).id||(user as any)._id}-${Date.now()}` };
      const r = await api.post('/payment/verify-payment', { razorpay_order_id: paymentDetails.razorpay_order_id, razorpay_payment_id: paymentDetails.razorpay_payment_id, razorpay_signature: paymentDetails.razorpay_signature, bookingData });
      return r.data;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['bookings'] }); toast.success("Tickets booked!"); navigate(`/dashboard/my-bookings?booking=${data.bookingId}`); },
    onError: (err: any) => { toast.error(err.response?.data?.message || err.message || "Payment failed"); },
  });

  const handleProceedToPayment = () => { if (!user) { toast.error("Please log in."); navigate("/login", { state: { from: location.pathname } }); return; } if (totalTickets === 0) { toast.error("Select at least one ticket."); return; } setStep('payment'); window.scrollTo(0, 0); };

  const handleSubmitPayment = async () => {
    try {
      const orderRes = await api.post('/payment/create-order', { amount: Number(totalPrice), receipt: `rcpt_${Date.now()}`, eventId: event.id || event._id });
      const order = orderRes.data;
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_your_key_here";
      if (razorpayKey === "rzp_test_your_key_here") { toast.info("Mock payment"); setTimeout(() => { bookingMutation.mutate({ razorpay_payment_id: `pay_mock_${Date.now()}`, razorpay_order_id: order.id, razorpay_signature: "mock_signature" }); }, 1500); return; }
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Razorpay failed to load"); return; }
      new (window as any).Razorpay({ key: razorpayKey, amount: order.amount, currency: order.currency, name: "EventHub", description: `Booking for ${event.title}`, order_id: order.id, handler: (r: any) => { bookingMutation.mutate(r); }, prefill: { name: userDetails.name, email: userDetails.email, contact: userDetails.phone }, theme: { color: "#8b5cf6" } }).open();
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to initiate payment"); }
  };

  if (isEventLoading || isVendorLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!event) return <div className="flex h-screen items-center justify-center">Event not found</div>;

  return (
    <div className="w-full min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {step === 'selection' ? (
          <div className="space-y-4 sm:space-y-8">
            <Button variant="ghost" size="sm" className="mb-3 hover:bg-primary/10 text-muted-foreground hover:text-primary flex items-center gap-2 px-0" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                <Card className="border-none shadow-2xl overflow-hidden rounded-2xl sm:rounded-[2.5rem]">
                  <div className="relative h-48 sm:h-64 lg:h-[400px]">
                    <img src={event.image || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 sm:bottom-8 left-4 sm:left-8 right-4 sm:right-8 text-white">
                      <div className="flex items-center gap-2 mb-2 sm:mb-4 flex-wrap">
                        <Badge className="bg-primary text-white border-none px-3 py-0.5 rounded-full text-[10px] font-black uppercase">Ticketed Event</Badge>
                        <Badge className="bg-white/20 backdrop-blur-md text-white border-none px-3 py-0.5 rounded-full text-[10px] font-black uppercase">{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Badge>
                      </div>
                      <h1 className="text-xl sm:text-3xl lg:text-5xl font-black mb-2 sm:mb-4 tracking-tight leading-tight">{event.title}</h1>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-6 font-bold">
                        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl"><MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" /><span className="line-clamp-1 text-[11px] sm:text-sm">{event.location}</span></div>
                        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl"><User className="w-3 h-3 sm:w-4 sm:h-4 text-primary shrink-0" /><span className="text-[11px] sm:text-sm">{vendor?.name || event.organizerName}</span></div>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-4 sm:p-6 lg:p-8">
                    <h3 className="text-lg sm:text-2xl font-black mb-3">About this Event</h3>
                    <p className="text-muted-foreground leading-relaxed font-medium text-sm sm:text-base">{event.description}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card className="border-none shadow-2xl rounded-2xl sm:rounded-[2.5rem] overflow-hidden sticky top-4 sm:top-8">
                  <CardHeader className="bg-primary p-5 sm:p-8 text-white">
                    <CardTitle className="text-lg sm:text-2xl font-black flex items-center gap-3"><Ticket className="w-5 h-5 sm:w-6 sm:h-6" /> Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                    {/* Ticket Selection Moved Above Order Summary Details */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <TagIcon className="w-4 h-4 text-primary" /> Select Tickets
                      </h4>
                      <div className="space-y-3">
                        {event.ticketTypes?.map((ticket: any) => {
                          const quantity = selectedTickets[ticket.name] || 0;
                          const isSoldOut = ticket.remainingQuantity <= 0;
                          return (
                            <div key={ticket.name} className={`p-4 rounded-2xl border-2 transition-all ${quantity > 0 ? 'border-primary bg-primary/5 shadow-sm' : 'border-border/50 bg-muted/30'}`}>
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm">{ticket.name}</span>
                                  <span className="text-primary font-black text-sm">₹{ticket.price.toLocaleString()}</span>
                                </div>
                                <Badge variant={isSoldOut ? "destructive" : "outline"} className="text-[9px] uppercase font-bold">
                                  {isSoldOut ? "Sold Out" : `${ticket.remainingQuantity} left`}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Quantity</span>
                                <div className="flex items-center gap-3 bg-background/80 p-1 rounded-xl border shadow-sm">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary font-black"
                                    onClick={() => updateTicketQuantity(ticket.name, -1)}
                                    disabled={quantity === 0}
                                  >
                                    -
                                  </Button>
                                  <span className="w-4 text-center font-black text-sm">{quantity}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary font-black"
                                    onClick={() => updateTicketQuantity(ticket.name, 1)}
                                    disabled={isSoldOut || (ticket.remainingQuantity !== undefined && quantity >= ticket.remainingQuantity)}
                                  >
                                    +
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-3">
                      {Object.entries(selectedTickets).filter(([_, q]) => q > 0).map(([name, q]) => (
                        <div key={name} className="flex justify-between items-center">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-primary" /><span className="font-bold text-muted-foreground text-sm">{name} x {q}</span></div>
                          <span className="font-black text-sm">₹{((event.ticketTypes?.find((t: any) => t.name === name)?.price || 0) * (q as number)).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="font-bold text-sm flex items-center gap-2"><Zap className="w-3 h-3 text-primary" /> Convenience Fee</span>
                        <span className="font-black text-sm">₹{convenienceFee.toLocaleString()}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between items-center text-green-600 bg-green-50 p-3 rounded-2xl border border-green-100">
                          <span className="font-bold text-sm flex items-center gap-2"><TagIcon className="w-3 h-3" /> Discount</span>
                          <span className="font-black text-sm">-₹{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-base sm:text-xl font-black">Grand Total</span>
                        <span className="text-xl sm:text-3xl font-black text-primary">₹{totalPrice.toLocaleString()}</span>
                      </div>
                      {!appliedCoupon ? (
                        <div className="flex gap-2">
                          <Input placeholder="PROMO CODE" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="rounded-2xl border-2 border-dashed border-border focus:border-primary font-black tracking-widest uppercase text-sm" />
                          <Button onClick={handleApplyCoupon} className="rounded-2xl px-4 font-black uppercase text-sm">Apply</Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={removeCoupon} className="w-full rounded-2xl border-dashed border-2 hover:bg-destructive/5 hover:text-destructive font-black uppercase gap-2 text-sm">Remove {appliedCoupon.couponCode} <XCircle className="w-4 h-4" /></Button>
                      )}
                      <Button className="w-full h-12 sm:h-16 rounded-[1.5rem] bg-primary hover:bg-primary/90 text-white text-base sm:text-xl font-black shadow-xl shadow-primary/20 transition-all gap-3" disabled={totalTickets === 0} onClick={handleProceedToPayment}>
                        Proceed to Checkout <ArrowRight className="w-5 h-5" />
                      </Button>
                      <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center justify-center gap-2 opacity-60"><ShieldCheck className="w-3 h-3" /> Secure Checkout by Razorpay</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3"><ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary" /> Secure Checkout</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep('selection')} className="hover:bg-primary/5 text-primary font-bold"><ArrowLeft className="h-4 w-4 mr-2" /> Change Selection</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-10">
              <div className="lg:col-span-8 space-y-4 sm:space-y-8">
                <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden rounded-3xl">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Contact Information</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditingUser(!isEditingUser)} className="text-primary hover:bg-primary/10 font-bold flex items-center gap-1 text-xs"><Edit2 className="h-4 w-4" /> {isEditingUser ? "Save" : "Edit"}</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                      {isEditingUser ? (
                        [{ key: 'name', label: 'Full Name', ph: 'Your name' }, { key: 'phone', label: 'Phone', ph: '9999999999' }, { key: 'email', label: 'Email', ph: 'email@example.com' }].map(({ key, label, ph }) => (
                          <div key={key} className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{label}</Label>
                            <Input value={(userDetails as any)[key]} onChange={(e) => setUserDetails(prev => ({ ...prev, [key]: e.target.value }))} className="h-10 sm:h-12 rounded-xl border-2 border-primary/20 focus:border-primary" placeholder={ph} />
                          </div>
                        ))
                      ) : (
                        [{ key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }].map(({ key, label }) => (
                          <div key={key} className="p-3 sm:p-4 rounded-2xl bg-muted/30 border border-border/50">
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">{label}</p>
                            <p className="font-bold truncate text-sm">{(userDetails as any)[key]}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-2xl bg-card overflow-hidden rounded-3xl">
                  <CardHeader className="bg-primary/5 border-b border-primary/10 py-4 sm:py-6">
                    <CardTitle className="text-lg sm:text-xl font-black flex items-center gap-2"><CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Tabs defaultValue="upi" className="w-full" onValueChange={setSelectedPaymentMethod}>
                      <div className="grid grid-cols-1 md:grid-cols-4">
                        <TabsList className="flex flex-row md:flex-col h-auto bg-muted/20 rounded-none border-b md:border-b-0 md:border-r border-border/50 p-0">
                          <TabsTrigger value="upi" className="flex-1 md:flex-none justify-start gap-3 py-4 sm:py-6 px-4 sm:px-6 data-[state=active]:bg-background data-[state=active]:text-primary rounded-none border-r md:border-r-0 md:border-b border-border/30 transition-all"><Smartphone className="h-4 w-4 sm:h-5 sm:w-5" /><span className="font-bold text-sm">UPI</span></TabsTrigger>
                          <TabsTrigger value="card" className="flex-1 md:flex-none justify-start gap-3 py-4 sm:py-6 px-4 sm:px-6 data-[state=active]:bg-background data-[state=active]:text-primary rounded-none transition-all"><CreditCard className="h-4 w-4 sm:h-5 sm:w-5" /><span className="font-bold text-sm">Cards</span></TabsTrigger>
                        </TabsList>
                        <div className="md:col-span-3 p-4 sm:p-8">
                          <TabsContent value="upi" className="m-0 space-y-4">
                            <Label className="text-sm font-black uppercase tracking-widest">Select UPI App</Label>
                            <RadioGroup defaultValue="gpay" className="grid grid-cols-2 gap-3">
                              {[{ id: "gpay", label: "Google Pay" }, { id: "phonepe", label: "PhonePe" }, { id: "paytm", label: "Paytm" }, { id: "other", label: "Other UPI" }].map(({ id: uid, label }) => (
                                <div key={uid} className="flex items-center space-x-3 p-3 sm:p-4 border-2 rounded-2xl cursor-pointer hover:border-primary/50 transition-all"><RadioGroupItem value={uid} id={uid} /><Label htmlFor={uid} className="font-bold cursor-pointer text-sm">{label}</Label></div>
                              ))}
                            </RadioGroup>
                          </TabsContent>
                          <TabsContent value="card" className="m-0 space-y-4">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest">Card Number</Label><Input placeholder="0000 0000 0000 0000" className="h-10 sm:h-12 rounded-xl border-2" /></div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest">Expiry</Label><Input placeholder="MM/YY" className="h-10 sm:h-12 rounded-xl border-2" /></div>
                              <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest">CVV</Label><Input placeholder="***" type="password" className="h-10 sm:h-12 rounded-xl border-2" /></div>
                            </div>
                          </TabsContent>
                        </div>
                      </div>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-4">
                <Card className="border-none shadow-2xl rounded-3xl overflow-hidden sticky top-4 sm:top-8">
                  <div className="bg-primary p-5 sm:p-8 text-white"><p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Final Summary</p><h3 className="text-xl sm:text-2xl font-black">Payable Amount</h3></div>
                  <CardContent className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm"><span className="font-bold text-muted-foreground">Base Amount</span><span className="font-black">₹{basePrice.toLocaleString()}</span></div>
                      <div className="flex justify-between items-center text-sm"><span className="font-bold text-muted-foreground">Convenience Fee</span><span className="font-black">₹{convenienceFee.toLocaleString()}</span></div>
                      {appliedCoupon && <div className="flex justify-between items-center text-sm text-green-600"><span className="font-bold">Discount</span><span className="font-black">-₹{discountAmount.toLocaleString()}</span></div>}
                      <Separator />
                      <div className="flex justify-between items-center"><span className="text-lg sm:text-xl font-black">Total</span><span className="text-2xl sm:text-3xl font-black text-primary">₹{totalPrice.toLocaleString()}</span></div>
                    </div>
                    <Button onClick={handleSubmitPayment} disabled={bookingMutation.isPending} className="w-full h-12 sm:h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white text-base sm:text-xl font-black shadow-xl transition-all gap-3">
                      {bookingMutation.isPending ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</> : <>Pay Now ₹{totalPrice.toLocaleString()} <ArrowRight className="h-5 w-5" /></>}
                    </Button>
                    <div className="pt-2 flex items-center justify-center gap-4 opacity-40">{["VISA","MC","UPI"].map(b => <div key={b} className="h-8 w-12 bg-muted rounded-md flex items-center justify-center font-black text-[8px]">{b}</div>)}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookTicketedEventPage;
