import { useAuth } from "@/contexts/AuthContext";
import { type Event, type Booking, categories } from "@/data/mockData";
import EventCard from "@/components/EventCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { CalendarDays, Ticket, IndianRupee, Clock, PlusCircle, Loader2, QrCode, TrendingUp, Star, FileText, CheckCircle, Tags, Calendar, CreditCard, DollarSign, Users, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import StatsCard from "@/components/StatsCard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import EventPlanModal from "@/components/EventPlanModal";

import { useLanguage } from "@/contexts/LanguageContext";
import RecommendedEvents from "@/components/RecommendedEvents";

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: serviceTypesData } = useQuery({
    queryKey: ['service-types', user?.id],
    queryFn: async () => {
      const response = await api.get('/service-types');
      return response.data;
    },
    enabled: !!user?.id
  });

  const merchantServiceTypes = (serviceTypesData || []).map((st: any) => st.name);
   
  const [viewDetailsDialog, setViewDetailsDialog] = useState<{ open: boolean; booking: any | null }>({ open: false, booking: null });
  const [billDialog, setBillDialog] = useState<{ open: boolean; bookingId: string | null; basePrice: number }>({ open: false, bookingId: null, basePrice: 0 });
  const [planDialog, setPlanDialog] = useState<{ open: boolean; bookingId: string | null; existingPlan: any | null }>({ open: false, bookingId: null, existingPlan: null });
  const [finalizeDialog, setFinalizeDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [finalAdditionalCost, setFinalAdditionalCost] = useState("");
  const [finalQrCode, setFinalQrCode] = useState("");
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    ifscCode: "",
    bankName: "",
    accountHolderName: ""
  });
  const [additionalCost, setAdditionalCost] = useState("");
  const [qrCodeLink, setQrCodeLink] = useState("");
  const [cancelEventDialog, setCancelEventDialog] = useState<{ open: boolean; eventId: string | null; eventTitle: string }>({ open: false, eventId: null, eventTitle: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [notifyAttendeesDialog, setNotifyAttendeesDialog] = useState<{ open: boolean; eventId: string | null; eventTitle: string }>({ open: false, eventId: null, eventTitle: "" });
  const [notifyForm, setNotifyForm] = useState({ title: "", message: "" });
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [couponForm, setCouponForm] = useState<{
    couponCode: string;
    discountType: string;
    discountValue: number;
    minimumOrderAmount: number;
    expiryDate: string;
    isGlobal: boolean;
    applicableType: "ALL" | "EVENT" | "CATEGORY" | "SERVICE";
    eventId: string;
    categoryId: string;
    serviceType: string;
    serviceIds: string[];
    applicableEvents: string[];
    applicableServices: string[];
    applicableCategory: string;
    usageLimit: number | null;
  }>({
    couponCode: "",
    discountType: "percentage",
    discountValue: 0,
    minimumOrderAmount: 0,
    expiryDate: new Date().toISOString().split('T')[0],
    isGlobal: true,
    applicableType: "ALL",
    eventId: "",
    categoryId: "",
    serviceType: "",
    serviceIds: [],
    applicableEvents: [],
    applicableServices: [],
    applicableCategory: "",
    usageLimit: null
  });
  
  // Service search states
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [debouncedServiceSearch, setDebouncedServiceSearch] = useState("");
  const [isSearchingServices, setIsSearchingServices] = useState(false);
  const [searchedServices, setSearchedServices] = useState<any[]>([]);
  const [filteredEventsForCoupon, setFilteredEventsForCoupon] = useState<any[]>([]);
  
  // Event search states for EVENT type coupons
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [debouncedEventSearch, setDebouncedEventSearch] = useState("");
  const [isSearchingEvents, setIsSearchingEvents] = useState(false);
  
  // Debounce service search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedServiceSearch(serviceSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [serviceSearchQuery]);
  
  // Debounce event search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEventSearch(eventSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [eventSearchQuery]);
  
  // Fetch services based on service type search
  const { data: allServices } = useQuery({
    queryKey: ["services", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await api.get(`/services?merchantId=${user.id}`);
      return res.data;
    }
  });
  
  // Fetch all events for EVENT type coupon selection
  const { data: allEvents } = useQuery({
    queryKey: ["events", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await api.get(`/events?merchantId=${user.id}`);
      return res.data;
    }
  });
  
  // Filter services based on search query and service type
  useEffect(() => {
    if (!allServices) return;
    
    setIsSearchingServices(true);
    
    let filtered = allServices;
    
    // Filter by service type if selected
    if (couponForm.serviceType) {
      filtered = filtered.filter((s: any) => 
        s.type?.toLowerCase() === couponForm.serviceType.toLowerCase()
      );
    }
    
    // Filter by search query
    if (debouncedServiceSearch) {
      filtered = filtered.filter((s: any) => 
        s.name?.toLowerCase().includes(debouncedServiceSearch.toLowerCase()) ||
        s.type?.toLowerCase().includes(debouncedServiceSearch.toLowerCase())
      );
    }
    
    setSearchedServices(filtered);
    setIsSearchingServices(false);
  }, [debouncedServiceSearch, couponForm.serviceType, allServices]);
  
  // Filter events based on search query for EVENT type coupons
  useEffect(() => {
    if (!allEvents) return;
    
    setIsSearchingEvents(true);
    
    let filtered = allEvents;
    
    // Filter by search query
    if (debouncedEventSearch) {
      filtered = filtered.filter((e: any) => 
        e.title?.toLowerCase().includes(debouncedEventSearch.toLowerCase()) ||
        e.description?.toLowerCase().includes(debouncedEventSearch.toLowerCase())
      );
    }
    
    // Store filtered events in a state variable we'll create next
    setFilteredEventsForCoupon(filtered);
    setIsSearchingEvents(false);
  }, [debouncedEventSearch, allEvents]);

  const cancelEventMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/events/cancel-event/${id}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event cancelled successfully!");
      setCancelEventDialog({ open: false, eventId: null, eventTitle: "" });
      setCancelReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to cancel event");
    }
  });

  const notifyAttendeesMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.post(`/events/${id}/notify-attendees`, data);
    },
    onSuccess: () => {
      toast.success("Notification sent to all attendees!");
      setNotifyAttendeesDialog({ open: false, eventId: null, eventTitle: "" });
      setNotifyForm({ title: "", message: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to send notification");
    }
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, merchantId: user?.id };
      // Remove empty strings for ObjectId fields
      if (payload.eventId === "") delete payload.eventId;
      if (payload.categoryId === "") delete payload.categoryId;
      if (payload.serviceType === "") delete payload.serviceType;
      if (payload.serviceIds && payload.serviceIds.length === 0) delete payload.serviceIds;
      return await api.post('/coupons', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success("Promo code created successfully!");
      setIsCouponDialogOpen(false);
      setCouponForm({
        couponCode: "",
        discountType: "percentage",
        discountValue: 0,
        minimumOrderAmount: 0,
        expiryDate: new Date().toISOString().split('T')[0],
        isGlobal: true,
        applicableType: "ALL",
        eventId: "",
        categoryId: "",
        serviceType: "",
        serviceIds: [],
        applicableEvents: [],
        applicableServices: [],
        applicableCategory: "",
        usageLimit: null
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create promo code");
    }
  });

  const { data: coupons } = useQuery({
    queryKey: ['coupons', user?.id],
    queryFn: async () => {
      const response = await api.get(`/coupons?merchantId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await api.get(`/merchants/${user.id}/wallet`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const { data: earnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['earnings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await api.get(`/merchants/${user.id}/earnings`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ['payouts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await api.get(`/merchants/payouts/all?merchantId=${user.id}`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; bankDetails: any }) => {
      return await api.post(`/merchants/${user?.id}/payouts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
      toast.success("Withdraw request sent successfully!");
      setWithdrawDialog(false);
      setWithdrawAmount("");
      setBankDetails({
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        accountHolderName: ""
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to send withdraw request");
    }
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      const response = await api.get<Event[]>(`/events?merchantId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: async () => {
      const response = await api.get<Booking[]>(`/bookings?organizerId=${user?.id}`);
      return response.data;
    },
    refetchOnWindowFocus: true,
    enabled: !!user?.id
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const response = await api.get<any[]>(`/services?merchantId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const { data: serverCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
    enabled: !!user?.id
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to delete event");
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      return await api.patch(`/bookings/${id}`, data);
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      const status = variables.data.status as string;
      if (status === 'bill_sent' || status === 'payment_pending') toast.success("Bill sent to customer!");
      if (status === 'paid') toast.success("Booking marked as paid!");
      
      if (status === 'completed') {
        toast.success("Event marked as completed! Notification sent to customer.");
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const getServiceName = (id: string) => {
    const service = services.find(s => (s._id || s.id) === id);
    return service ? service.name : 'Not selected';
  };

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billDialog.bookingId) return;
    
    const finalAmount = billDialog.basePrice + Number(additionalCost);
    
    updateBookingMutation.mutate({
      id: billDialog.bookingId,
      data: { 
        status: "bill_sent", // Correct status for bill sent
        additionalCost: Number(additionalCost),
        finalAmount: finalAmount,
        billQrCode: qrCodeLink,
      }
    });
    setBillDialog({ open: false, bookingId: null, basePrice: 0 });
    setAdditionalCost("");
    setQrCodeLink("");
  };

  const handleMarkAsPaid = (bookingId: string) => {
    const booking = myBookings.find(b => (b.id === bookingId || b._id === bookingId));
    const isAdvance = booking?.status === 'approved' || booking?.status === 'bill_sent' || booking?.status === 'payment_pending';
    const totalAmount = booking?.finalAmount || (booking?.totalPrice || 0) + (booking?.additionalCost || 0);
    
    updateBookingMutation.mutate({
      id: bookingId,
      data: { 
        status: isAdvance ? "advance_paid" : "completed",
        paymentStatus: isAdvance ? "partial" : "paid",
        advancePaid: isAdvance ? (booking?.advanceAmount || 0) : totalAmount
      }
    });
    setViewDetailsDialog({ open: false, booking: null });
  };

  const handleFinalizeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizeDialog.booking) return;

    const booking = finalizeDialog.booking;
    const additionalCharges = Number(finalAdditionalCost) || 0;
    const currentAdditionalCost = booking.additionalCost || 0;
    const newTotalAdditionalCost = currentAdditionalCost + additionalCharges;
    const finalAmount = booking.totalPrice + newTotalAdditionalCost;
    
    // Check if there's a remaining balance
    const advancePaid = (booking as any).advancePaid || 0;
    const remainingBalance = finalAmount - advancePaid;

    updateBookingMutation.mutate({
      id: booking.id || (booking as any)._id,
      data: { 
        status: "completed",
        additionalCost: newTotalAdditionalCost,
        finalAmount: finalAmount,
        paymentStatus: remainingBalance > 0 ? "partial" : "paid",
        advancePaid: advancePaid, // Ensure advancePaid is preserved
        billQrCode: finalQrCode || booking.billQrCode
      }
    });

    setFinalizeDialog({ open: false, booking: null });
    setFinalAdditionalCost("");
    setFinalQrCode("");
  };

  // Only show THIS organizer's events
  const myEvents = events?.filter((e) => e.organizerId === user?.id) || [];
  // Only show bookings for this organizer (organizerId comes from the event at booking time)
  // Include handed_to_merchant and pending_merchant statuses
  // IMPORTANT: Only show full-service events, exclude ticketed events from merchant workflow
  const myBookings = bookings?.filter((b) => {
   const isMyEvent = b.organizerId === user?.id;
   const isNotTicketedPending = !(b.status === 'pending' && b.eventType === 'ticketed');
   const isRelevantStatus = b.status !== 'rejected' && b.status !== 'cancelled';
    return isMyEvent && isNotTicketedPending && isRelevantStatus;
  }) || [];

  const revenue = (myBookings || []).filter((b) => b.status === "paid").reduce((sum, b) => sum + (b.totalPrice || 0) + (b.additionalCost || 0), 0);

  // Ticket Analytics Calculations
  const ticketedBookings = bookings?.filter(b => 
    b.organizerId === user?.id && 
    b.eventType === 'ticketed' && 
    (b.status === 'paid' || b.status === 'confirmed')
  ) || [];
  const totalTicketsSold = ticketedBookings.reduce((sum, b) => {
    // If selectedTickets is available, sum up its quantities
    if (b.selectedTickets && Array.isArray(b.selectedTickets)) {
      return sum + b.selectedTickets.reduce((tSum: number, t: any) => tSum + (Number(t.quantity) || 0), 0);
    }
    // Fallback to quantity or guests
    return sum + (Number((b as any).quantity) || Number(b.guests) || 0);
  }, 0);
  const totalTicketRevenue = ticketedBookings.reduce((sum, b) => sum + ((b as any).totalAmount || b.totalPrice || 0), 0);
  
  const myTicketedEvents = myEvents.filter(e => e.eventType === 'ticketed');
  const remainingTickets = myTicketedEvents.reduce((sum, e) => {
    return sum + (e.ticketTypes?.reduce((tSum: number, t: any) => tSum + (t.remainingQuantity || 0), 0) || 0);
  }, 0);
  
  const soldOutEventsCount = myTicketedEvents.filter(e => 
    (e as any).isSoldOut || (e.ticketTypes?.length > 0 && e.ticketTypes.every((t: any) => t.remainingQuantity <= 0))
  ).length;

  // Ticket Sales by Event Data
  const ticketSalesByEvent = myTicketedEvents.map(e => {
    const currentEventId = e.id || (e as any)._id;
    const eventBookings = ticketedBookings.filter(b => {
      const bookingEventId = (b.eventId as any)?._id || (b.eventId as any)?.id || b.eventId;
      return bookingEventId === currentEventId;
    });
    const sold = eventBookings.reduce((sum, b) => {
      if (b.selectedTickets && Array.isArray(b.selectedTickets)) {
        return sum + b.selectedTickets.reduce((tSum: number, t: any) => tSum + (Number(t.quantity) || 0), 0);
      }
      return sum + (Number((b as any).quantity) || Number(b.guests) || 0);
    }, 0);
    const rev = eventBookings.reduce((sum, b) => sum + ((b as any).totalAmount || b.totalPrice || 0), 0);
    return {
      name: e.title,
      sold,
      revenue: rev
    };
  });

  const isLoading = eventsLoading || bookingsLoading || walletLoading || earningsLoading;

  // Mock chart data - In production, this would come from API with real data
  const bookingTrendData = [
    { name: 'Jan', bookings: 4, revenue: 2400 },
    { name: 'Feb', bookings: 8, revenue: 4800 },
    { name: 'Mar', bookings: 12, revenue: 7200 },
    { name: 'Apr', bookings: 18, revenue: 10800 },
    { name: 'May', bookings: 15, revenue: 9000 },
    { name: 'Jun', bookings: (myBookings || []).length, revenue: revenue },
  ];

  const categoryDistribution = (serverCategories || []).map(cat => ({
    name: cat.name,
    value: (myEvents || []).filter(e => e.category === cat.name).length,
  })).filter(c => c.value > 0);

  const COLORS = ['#9333ea', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <motion.div 
      className="space-y-8" 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-display font-bold">
            {t('organizer')} <span className="text-gradient">{t('dashboard')}</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage your events and bookings</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button className="gradient-primary text-primary-foreground" onClick={() => navigate("/dashboard/events/create")}>
            <PlusCircle className="h-4 w-4 mr-2" /> {t('create_event')}
          </Button>
        </motion.div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-0 shadow-xl bg-gradient-to-br from-primary/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="text-3xl font-bold font-display text-primary">₹{(wallet?.netBalance || 0).toLocaleString()}</p>
              <Button size="sm" className="gradient-primary text-primary-foreground shadow-lg w-full" onClick={() => setWithdrawDialog(true)}>
                Withdraw Request
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-xl bg-gradient-to-br from-secondary/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-display text-secondary">₹{(wallet?.totalEarnings || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Lifetime revenue (after commissions)</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-xl bg-gradient-to-br from-green-500/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Withdrawn</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-display text-green-600">₹{(wallet?.totalWithdrawn || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Amount successfully paid out</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-0 shadow-xl bg-gradient-to-br from-accent/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold font-display text-accent">₹{(wallet?.pendingPayout || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting admin approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="My Events" value={myEvents.length} icon={CalendarDays} color="text-primary" delay={0.1} />
        <StatsCard label="Total Revenue" value={`₹${revenue.toLocaleString()}`} icon={IndianRupee} color="text-secondary" delay={0.2} />
        <StatsCard label="Promo Codes" value={coupons?.length || 0} icon={Tags} color="text-accent" delay={0.3} />
        <StatsCard label="Commission Deducted" value={`₹${(wallet?.commissionDeducted || 0).toLocaleString()}`} icon={TrendingUp} color="text-red-500" delay={0.4} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="glass-card border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Booking Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={bookingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="bookings" stroke="#9333ea" strokeWidth={3} dot={{ fill: '#9333ea', r: 5 }} activeDot={{ r: 7 }} name="Bookings" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="glass-card border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Star className="w-5 h-5 text-secondary" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={bookingTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      background: 'rgba(255,255,255,0.95)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} name="Revenue (₹)" />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>





      {/* Tabs Section */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Active Events</TabsTrigger>
          <TabsTrigger value="past_events">Past Events</TabsTrigger>
          <TabsTrigger value="wallet">Wallet & Payouts</TabsTrigger>
          <TabsTrigger value="attendees">Attendee List</TabsTrigger>
          <TabsTrigger value="coupons">Promo Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Earnings Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-muted-foreground">Total Bookings</span>
                    <span className="font-bold">{earnings?.totalBookings || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-muted-foreground">Gross Revenue</span>
                    <span className="font-bold">₹{(earnings?.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-muted-foreground">Admin Commission (5%)</span>
                    <span className="font-bold text-red-500">- ₹{(earnings?.adminCommission || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                    <span className="text-muted-foreground">Total Withdrawn</span>
                    <span className="font-bold text-green-600">₹{(wallet?.totalWithdrawn || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="font-semibold text-primary">Net Balance (Current)</span>
                    <span className="font-bold text-primary text-lg">₹{(wallet?.netBalance || 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <Clock className="w-5 h-5 text-secondary" />
                  Withdraw History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No payout history yet.</TableCell>
                      </TableRow>
                    ) : payouts.map((p: any) => (
                      <TableRow key={p.id || p._id}>
                        <TableCell>{new Date(p.requestedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold">₹{p.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            p.status === 'paid' ? 'default' : 
                            p.status === 'rejected' ? 'destructive' : 'secondary'
                          } className={p.status === 'paid' ? 'bg-green-500' : ''}>
                            {p.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {myEvents.filter(e => e.status !== 'completed' && e.status !== 'cancelled').length === 0 ? (
              <p className="col-span-3 text-center text-muted-foreground py-10">No active events. Create your first event!</p>
            ) : myEvents.filter(e => e.status !== 'completed' && e.status !== 'cancelled').map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showActions="organizer"
                onEdit={() => navigate(`/dashboard/events/edit/${event.id || (event as any)._id}`)}
                onDelete={() => deleteMutation.mutate(event.id)}
                onCancel={(e) => setCancelEventDialog({ open: true, eventId: e.id || (e as any)._id, eventTitle: e.title })}
                onNotify={(e) => setNotifyAttendeesDialog({ open: true, eventId: e.id || (e as any)._id, eventTitle: e.title })}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="past_events" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {myEvents.filter(e => e.status === 'completed' || e.status === 'cancelled').length === 0 ? (
              <p className="col-span-3 text-center text-muted-foreground py-10">No past events yet.</p>
            ) : myEvents.filter(e => e.status === 'completed' || e.status === 'cancelled').map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showActions="organizer"
                onEdit={() => navigate(`/dashboard/events/edit/${event.id || (event as any)._id}`)}
                onDelete={() => deleteMutation.mutate(event.id)}
                onCancel={(e) => setCancelEventDialog({ open: true, eventId: e.id || (e as any)._id, eventTitle: e.title })}
                onNotify={(e) => setNotifyAttendeesDialog({ open: true, eventId: e.id || (e as any)._id, eventTitle: e.title })}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendees" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="font-display">Attendee Management</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myEvents.map(event => (
                  <div key={event.id} className="border rounded-lg p-4 bg-muted/20">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">{new Date(event.eventDate).toLocaleDateString()}</p>
                      </div>
                      <Button size="sm" onClick={() => {
                        api.get(`/events/${event.id || (event as any)._id}/attendees`).then(res => {
                          // Simple CSV export
                          const data = res.data;
                          if (data.length === 0) return toast.info("No attendees for this event yet.");
                          const csv = "Name,Email,Ticket,Quantity,Status\n" + data.map((a: any) => `${a.customerName},${a.customerEmail},${a.ticketType},${a.quantity},${a.status}`).join("\n");
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${event.title}_attendees.csv`;
                          a.click();
                        });
                      }}>
                        <FileText className="h-4 w-4 mr-2" /> Download Attendee List
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold font-display">My Promo Codes</h2>
            <Button className="gradient-primary" onClick={() => setIsCouponDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" /> Create Promo Code
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!coupons || coupons.length === 0) ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10">No promo codes created yet.</TableCell></TableRow>
                  ) : coupons.map((c: any) => (
                    <TableRow key={c.id || c._id}>
                      <TableCell><Badge variant="outline" className="font-mono">{c.couponCode}</Badge></TableCell>
                      <TableCell className="font-bold">{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</TableCell>
                      <TableCell>₹{c.minimumOrderAmount}</TableCell>
                      <TableCell>
                        {c.usageLimit ? (
                          <Badge variant={c.usageCount >= c.usageLimit ? 'destructive' : 'secondary'}>
                            {c.usageCount}/{c.usageLimit}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{c.usageCount} used</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(c.expiryDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </motion.div>

    {/* View Details Dialog */}
    <Dialog open={viewDetailsDialog.open} onOpenChange={(open) => !open && setViewDetailsDialog({ open: false, booking: null })}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        {viewDetailsDialog.booking && (
          <div className="flex flex-col h-full">
            {/* Header with Status Banner */}
            <div className="bg-primary p-6 text-white relative overflow-hidden">
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-1">Booking Details</p>
                  <DialogTitle className="text-3xl font-black tracking-tight mb-2">
                    {viewDetailsDialog.booking.eventTitle || viewDetailsDialog.booking.serviceName || "N/A"}
                  </DialogTitle>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs">
                      ID: {viewDetailsDialog.booking.id || (viewDetailsDialog.booking as any)._id}
                    </Badge>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
                      {viewDetailsDialog.booking.status}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                  onClick={() => setViewDetailsDialog({ open: false, booking: null })}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            </div>

            <div className="p-8 space-y-8 bg-[#F8F9FB]">
              {/* 1. Primary Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info Card */}
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Users className="h-4 w-4" /> Customer Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                        <span className="text-xs font-bold text-muted-foreground">Name</span>
                        <span className="font-black text-foreground">{viewDetailsDialog.booking.customerName}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                        <span className="text-xs font-bold text-muted-foreground">Email</span>
                        <span className="font-bold text-foreground text-sm">{viewDetailsDialog.booking.customerEmail}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs font-bold text-muted-foreground">Booking Date</span>
                        <span className="font-bold text-foreground">
                          {new Date(viewDetailsDialog.booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Event Info Card */}
                <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Event Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                        <span className="text-xs font-bold text-muted-foreground">Event Date</span>
                        <span className="font-black text-foreground">
                          {new Date(viewDetailsDialog.booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                        <span className="text-xs font-bold text-muted-foreground">Time Slot</span>
                        <span className="font-black text-foreground capitalize">
                          {viewDetailsDialog.booking.timeSlot || viewDetailsDialog.booking.customerRequirements?.timeSlot || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                        <span className="text-xs font-bold text-muted-foreground">Expected Guests</span>
                        <span className="font-black text-foreground">{viewDetailsDialog.booking.guests || viewDetailsDialog.booking.customerRequirements?.numberOfGuests || 0} People</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-xs font-bold text-muted-foreground">Event Type</span>
                        <Badge variant="outline" className="font-bold uppercase text-[10px] border-primary/20 text-primary bg-primary/5">
                          {viewDetailsDialog.booking.eventType === 'service' ? (viewDetailsDialog.booking.serviceName || viewDetailsDialog.booking.service?.name || 'Service') : (viewDetailsDialog.booking.eventType || 'Standard')}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 2. Pricing & Financial Summary - HIGHLIGHTED */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                  <DollarSign className="h-4 w-4" /> Financial Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Base Price</p>
                    <p className="text-xl font-black text-foreground">₹{viewDetailsDialog.booking.totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Additional Charges</p>
                    <p className="text-xl font-black text-foreground">₹{(viewDetailsDialog.booking.additionalCost || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter mb-1">Total Paid</p>
                    <p className="text-xl font-black text-green-600">₹{((viewDetailsDialog.booking as any).advancePaid || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-primary/5 p-5 rounded-3xl shadow-sm border border-primary/20">
                    <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-1">Remaining Due</p>
                    <p className="text-xl font-black text-primary">
                      ₹{Math.max(0, (viewDetailsDialog.booking.finalAmount || (viewDetailsDialog.booking.totalPrice + (viewDetailsDialog.booking.additionalCost || 0))) - ((viewDetailsDialog.booking as any).advancePaid || 0)).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Detailed Requirements (If Full Service) */}
              {viewDetailsDialog.booking.customerRequirements && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                    <CheckCircle className="h-4 w-4" /> Specific Requirements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {viewDetailsDialog.booking.customerRequirements.decorationTheme && (
                      <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Decoration Theme</p>
                        <p className="font-bold text-sm text-foreground">{viewDetailsDialog.booking.customerRequirements.decorationTheme}</p>
                      </div>
                    )}
                    {viewDetailsDialog.booking.customerRequirements.foodType && (
                      <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Food Preference</p>
                        <p className="font-bold text-sm text-foreground capitalize">{viewDetailsDialog.booking.customerRequirements.foodType}</p>
                      </div>
                    )}
                    {viewDetailsDialog.booking.customerRequirements.musicOption && (
                      <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Music/DJ</p>
                        <p className="font-bold text-sm text-foreground capitalize">{viewDetailsDialog.booking.customerRequirements.musicOption}</p>
                      </div>
                    )}
                    {viewDetailsDialog.booking.customerRequirements.additionalNotes && (
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20 col-span-full">
                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Special Requests & Notes</p>
                        <p className="text-sm text-foreground leading-relaxed italic">"{viewDetailsDialog.booking.customerRequirements.additionalNotes}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Billing Details Breakdown */}
              {viewDetailsDialog.booking.billingDetails && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                    <FileText className="h-4 w-4" /> Itemized Bill Breakdown
                  </h3>
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                    <CardContent className="p-0">
                      <Table className="w-full">
                        <TableBody>
                          {viewDetailsDialog.booking.billingDetails.decorationCost > 0 && (
                            <TableRow className="hover:bg-transparent border-muted/10">
                              <TableCell className="text-xs font-bold text-muted-foreground">Decoration</TableCell>
                              <TableCell className="text-right font-black">₹{viewDetailsDialog.booking.billingDetails.decorationCost.toLocaleString()}</TableCell>
                            </TableRow>
                          )}
                          {viewDetailsDialog.booking.billingDetails.cateringCost > 0 && (
                            <TableRow className="hover:bg-transparent border-muted/10">
                              <TableCell className="text-xs font-bold text-muted-foreground">
                                Catering 
                                {viewDetailsDialog.booking.billingDetails.costPerPlate && (
                                  <span className="block text-[10px] font-medium text-muted-foreground mt-0.5">
                                    (₹{viewDetailsDialog.booking.billingDetails.costPerPlate} × {viewDetailsDialog.booking.billingDetails.guestCount || viewDetailsDialog.booking.guests} guests)
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-black">₹{viewDetailsDialog.booking.billingDetails.cateringCost.toLocaleString()}</TableCell>
                            </TableRow>
                          )}
                          {viewDetailsDialog.booking.billingDetails.musicCost > 0 && (
                            <TableRow className="hover:bg-transparent border-muted/10">
                              <TableCell className="text-xs font-bold text-muted-foreground">Music & Entertainment</TableCell>
                              <TableCell className="text-right font-black">₹{viewDetailsDialog.booking.billingDetails.musicCost.toLocaleString()}</TableCell>
                            </TableRow>
                          )}
                          {viewDetailsDialog.booking.billingDetails.lightingCost > 0 && (
                            <TableRow className="hover:bg-transparent border-muted/10">
                              <TableCell className="text-xs font-bold text-muted-foreground">Lighting & Sound</TableCell>
                              <TableCell className="text-right font-black">₹{viewDetailsDialog.booking.billingDetails.lightingCost.toLocaleString()}</TableCell>
                            </TableRow>
                          )}
                          {viewDetailsDialog.booking.billingDetails.additionalCharges > 0 && (
                            <TableRow className="hover:bg-transparent border-muted/10">
                              <TableCell className="text-xs font-bold text-muted-foreground">Other Charges</TableCell>
                              <TableCell className="text-right font-black">₹{viewDetailsDialog.booking.billingDetails.additionalCharges.toLocaleString()}</TableCell>
                            </TableRow>
                          )}
                          <TableRow className="hover:bg-transparent border-t-2 border-primary/10">
                            <TableCell className="text-sm font-black text-primary">Grand Total</TableCell>
                            <TableCell className="text-right text-xl font-black text-primary">
                              ₹{(viewDetailsDialog.booking.finalAmount || (viewDetailsDialog.booking.totalPrice + (viewDetailsDialog.booking.additionalCost || 0))).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 5. Payment QR Code (If Available) */}
              {viewDetailsDialog.booking.billQrCode && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                    <CreditCard className="h-4 w-4" /> Payment QR Code
                  </h3>
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-muted/20 flex flex-col items-center">
                    <div className="p-4 bg-white border-2 border-primary/10 rounded-2xl shadow-inner mb-4">
                      <img src={viewDetailsDialog.booking.billQrCode} alt="Payment QR" className="w-48 h-48 object-contain" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Scan to pay remaining balance</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="p-6 bg-white border-t border-muted/20 flex justify-end gap-3">
              <Button 
                variant="outline" 
                className="rounded-xl font-bold px-8 h-12"
                onClick={() => setViewDetailsDialog({ open: false, booking: null })}
              >
                Close
              </Button>
              {viewDetailsDialog.booking.status !== 'bill_sent' && viewDetailsDialog.booking.status !== 'paid' && viewDetailsDialog.booking.status !== 'completed' && viewDetailsDialog.booking.eventType !== 'ticketed' && (
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black px-8 h-12 shadow-lg shadow-primary/20"
                  onClick={() => {
                    const basePrice = viewDetailsDialog.booking!.totalPrice;
                    setViewDetailsDialog({ open: false, booking: null });
                    setBillDialog({ open: true, bookingId: viewDetailsDialog.booking!.id, basePrice });
                  }}
                >
                  Send Bill
                </Button>
              )}
              {viewDetailsDialog.booking.status === 'bill_sent' && viewDetailsDialog.booking.eventType !== 'ticketed' && (
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-black px-8 h-12 shadow-lg shadow-green-200"
                  onClick={() => handleMarkAsPaid(viewDetailsDialog.booking!.id)}
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Billing Dialog */}
      <Dialog open={billDialog.open} onOpenChange={(open) => !open && setBillDialog({ open: false, bookingId: null, basePrice: 0 })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Final Bill</DialogTitle>
            <DialogDescription>Enter additional costs and payment QR code for the customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBillSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="additionalCost">Additional Cost (₹)</Label>
              <Input 
                id="additionalCost" 
                type="number" 
                min="0" 
                placeholder="e.g., 5000" 
                value={additionalCost} 
                onChange={(e) => setAdditionalCost(e.target.value)} 
                required
              />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-muted-foreground">Base price: ₹{billDialog.basePrice.toLocaleString()}</span>
                <span className="font-bold text-primary">Total: ₹{(billDialog.basePrice + Number(additionalCost)).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="qrCodeLink">Payment QR Code Image URL</Label>
              <Input 
                id="qrCodeLink" 
                type="url" 
                placeholder="https://example.com/qr.png" 
                value={qrCodeLink} 
                onChange={(e) => setQrCodeLink(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={updateBookingMutation.isPending}>
              {updateBookingMutation.isPending ? "Sending..." : "Send Bill & QR Code"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <EventPlanModal
        open={planDialog.open}
        onOpenChange={(open) => setPlanDialog({ ...planDialog, open })}
        bookingId={planDialog.bookingId || ""}
        existingPlan={planDialog.existingPlan}
      />

      {/* Cancel Event Dialog */}
      <Dialog open={cancelEventDialog.open} onOpenChange={(open) => setCancelEventDialog({ ...cancelEventDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Event: {cancelEventDialog.eventTitle}</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this event? This will notify all attendees and initiate refunds where applicable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Cancellation Reason</Label>
              <Textarea 
                placeholder="Why are you cancelling this event?" 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)} 
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCancelEventDialog({ open: false, eventId: null, eventTitle: "" })}>No, Keep Event</Button>
              <Button 
                variant="destructive" 
                onClick={() => cancelEventMutation.mutate({ id: cancelEventDialog.eventId!, reason: cancelReason })}
                disabled={!cancelReason || cancelEventMutation.isPending}
              >
                {cancelEventMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Cancel Event
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notify Attendees Dialog */}
      <Dialog open={notifyAttendeesDialog.open} onOpenChange={(open) => setNotifyAttendeesDialog({ ...notifyAttendeesDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Attendees: {notifyAttendeesDialog.eventTitle}</DialogTitle>
            <DialogDescription>Send a message to everyone who has booked this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input 
                placeholder="e.g., Change in venue, Important update" 
                value={notifyForm.title} 
                onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                placeholder="Your message to attendees..." 
                value={notifyForm.message} 
                onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })} 
              />
            </div>
            <Button 
              className="w-full gradient-primary text-primary-foreground" 
              onClick={() => notifyAttendeesMutation.mutate({ id: notifyAttendeesDialog.eventId!, data: notifyForm })}
              disabled={!notifyForm.title || !notifyForm.message || notifyAttendeesMutation.isPending}
            >
              {notifyAttendeesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Notification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Dialog */}
      <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Promo Code</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input 
                  placeholder="e.g., SUMMER20" 
                  value={couponForm.couponCode} 
                  onChange={(e) => setCouponForm({ ...couponForm, couponCode: e.target.value.toUpperCase() })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Applicable Type</Label>
                <Select 
                  value={couponForm.applicableType} 
                  onValueChange={(v: "ALL" | "EVENT" | "CATEGORY" | "SERVICE") => 
                    setCouponForm({ 
                      ...couponForm, 
                      applicableType: v,
                      isGlobal: v === 'ALL', // Automatically uncheck/check based on type
                      applicableEvents: v === 'EVENT' ? [] : couponForm.applicableEvents,
                      applicableServices: v === 'SERVICE' ? [] : couponForm.applicableServices,
                      applicableCategory: v === 'CATEGORY' ? "" : couponForm.applicableCategory
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All (Events & Services)</SelectItem>
                    <SelectItem value="EVENT">Events Only</SelectItem>
                    <SelectItem value="CATEGORY">Event Category</SelectItem>
                    <SelectItem value="SERVICE">Services Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={couponForm.discountType} onValueChange={(v) => setCouponForm({ ...couponForm, discountType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" value={couponForm.discountValue} onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Minimum Order (₹)</Label>
              <Input type="number" value={couponForm.minimumOrderAmount} onChange={(e) => setCouponForm({ ...couponForm, minimumOrderAmount: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" value={couponForm.expiryDate} onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Usage Limit (Optional)</Label>
              <Input 
                type="number" 
                placeholder="e.g., 100" 
                value={couponForm.usageLimit || ''} 
                onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value ? Number(e.target.value) : null })} 
              />
              <p className="text-[10px] text-muted-foreground">Leave empty for unlimited usage. Coupon will be hidden after reaching the limit.</p>
            </div>

            {/* Applicability Settings */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isGlobal" 
                  className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  checked={couponForm.isGlobal}
                  disabled={couponForm.applicableType !== 'ALL'}
                  onChange={(e) => setCouponForm({ 
                    ...couponForm, 
                    isGlobal: e.target.checked, 
                    categoryId: e.target.checked ? "" : couponForm.categoryId, 
                    serviceIds: e.target.checked ? [] : couponForm.serviceIds,
                    applicableEvents: e.target.checked ? [] : couponForm.applicableEvents,
                    applicableServices: e.target.checked ? [] : couponForm.applicableServices
                  })}
                />
                <Label htmlFor="isGlobal" className={couponForm.applicableType !== 'ALL' ? "text-muted-foreground cursor-not-allowed" : "cursor-pointer"}>
                  Apply to all my services and categories (Global)
                </Label>
              </div>

              {!couponForm.isGlobal && (
                <div className="space-y-4">
                  {/* Show Event Selection for EVENT type */}
                  {couponForm.applicableType === 'EVENT' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select Events</Label>
                        <div className="text-xs text-muted-foreground mb-2">
                          Choose events where this coupon can be applied
                        </div>
                        <Input
                          placeholder="Search events by name..."
                          value={eventSearchQuery}
                          onChange={(e) => setEventSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex justify-between items-center">
                          <span>Events List</span>
                          {couponForm.applicableEvents.length > 0 && (
                            <button 
                              className="text-[10px] text-primary hover:underline"
                              onClick={() => setCouponForm({ ...couponForm, applicableEvents: [] })}
                            >
                              Clear All
                            </button>
                          )}
                        </Label>
                        <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2 bg-muted/30">
                          {isSearchingEvents ? (
                            <div className="text-center py-4 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                              Searching...
                            </div>
                          ) : filteredEventsForCoupon.length === 0 ? (
                            <p className="text-xs text-center py-4 text-muted-foreground">
                              No events found
                            </p>
                          ) : (
                            filteredEventsForCoupon.map((event: any) => (
                              <div key={event.id || event._id} className="flex items-center space-x-2">
                                <input 
                                  type="checkbox" 
                                  id={`event-${event.id || event._id}`}
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                  checked={couponForm.applicableEvents.includes(event.id || event._id)}
                                  onChange={(e) => {
                                    const id = event.id || event._id;
                                    const newEvents = e.target.checked 
                                      ? [...couponForm.applicableEvents, id]
                                      : couponForm.applicableEvents.filter(eid => eid !== id);
                                    setCouponForm({ 
                                      ...couponForm, 
                                      applicableEvents: newEvents
                                    });
                                  }}
                                />
                                <Label htmlFor={`event-${event.id || event._id}`} className="text-sm cursor-pointer flex-1">
                                  <div className="font-medium">{event.title}</div>
                                  <div className="text-xs text-muted-foreground">₹{(event.price || 0).toLocaleString()}</div>
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show Category Selection for CATEGORY type */}
                  {couponForm.applicableType === 'CATEGORY' && (
                    <div className="space-y-2">
                      <Label>Select Event Category</Label>
                      <Select value={couponForm.applicableCategory} onValueChange={(v) => setCouponForm({ ...couponForm, applicableCategory: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(serverCategories || []).map((cat: any) => (
                            <SelectItem key={cat.id || cat._id} value={cat.id || cat._id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        This coupon will apply to all events in the selected category
                      </p>
                    </div>
                  )}

                  {/* Show Service Selection for SERVICE or ALL type */}
                  {(couponForm.applicableType === 'SERVICE' || couponForm.applicableType === 'ALL') && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Service Type</Label>
                          <Select 
                            value={couponForm.serviceType} 
                            onValueChange={(v) => {
                              setCouponForm({ 
                                ...couponForm, 
                                serviceType: v,
                                applicableServices: [] // Reset selected services when type changes
                              });
                              setServiceSearchQuery(""); // Clear search
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                            <SelectContent>
                            {merchantServiceTypes.length > 0 ? (
                              merchantServiceTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-xs text-muted-foreground text-center">No services found</div>
                            )}
                          </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Search Services</Label>
                          <Input
                            placeholder="Search by name..."
                            value={serviceSearchQuery}
                            onChange={(e) => setServiceSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex justify-between items-center">
                          <span>Select Services</span>
                          {couponForm.applicableServices.length > 0 && (
                            <button 
                              className="text-[10px] text-primary hover:underline"
                              onClick={() => setCouponForm({ ...couponForm, applicableServices: [] })}
                            >
                              Clear All
                            </button>
                          )}
                        </Label>
                        <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2 bg-muted/30">
                          {isSearchingServices ? (
                            <div className="text-center py-4 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                              Searching...
                            </div>
                          ) : searchedServices.length === 0 ? (
                            <p className="text-xs text-center py-4 text-muted-foreground">
                              {couponForm.serviceType ? `No ${couponForm.serviceType} services found` : 'No services found'}
                            </p>
                          ) : (
                            searchedServices.map((service: any) => (
                              <div key={service.id || service._id} className="flex items-center space-x-2">
                                <input 
                                  type="checkbox" 
                                  id={`service-${service.id || service._id}`}
                                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                                  checked={couponForm.applicableServices.includes(service.id || service._id)}
                                  onChange={(e) => {
                                    const id = service.id || service._id;
                                    const newServices = e.target.checked 
                                      ? [...couponForm.applicableServices, id]
                                      : couponForm.applicableServices.filter(sid => sid !== id);
                                    setCouponForm({ 
                                      ...couponForm, 
                                      applicableServices: newServices,
                                      serviceIds: newServices // Keep legacy field in sync
                                    });
                                  }}
                                />
                                <Label htmlFor={`service-${service.id || service._id}`} className="text-sm cursor-pointer flex-1">
                                  <div className="font-medium">{service.name}</div>
                                  <div className="text-xs text-muted-foreground">{service.type} - ₹{(service.price || 0).toLocaleString()}</div>
                                </Label>
                              </div>
                            ))
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Select services where this coupon can be applied
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Legacy Category Selection (for backward compatibility) */}
                  {couponForm.applicableType === 'ALL' && (
                    <div className="space-y-2">
                      <Label>Event Category (Legacy - Optional)</Label>
                      <Select value={couponForm.categoryId} onValueChange={(v) => setCouponForm({ ...couponForm, categoryId: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {(serverCategories || []).map((cat: any) => (
                            <SelectItem key={cat.id || cat._id} value={cat.id || cat._id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        This is for backward compatibility. New coupons should use Service selection above.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              className="w-full gradient-primary text-primary-foreground" 
              onClick={() => {
                if (!couponForm.isGlobal && couponForm.applicableType === 'SERVICE' && couponForm.applicableServices.length === 0) {
                  return toast.error("Please select at least one service");
                }
                if (!couponForm.isGlobal && couponForm.applicableType === 'EVENT' && couponForm.applicableEvents.length === 0) {
                  return toast.error("Please select at least one event");
                }
                if (!couponForm.isGlobal && couponForm.applicableType === 'CATEGORY' && !couponForm.applicableCategory) {
                  return toast.error("Please select a category");
                }
                createCouponMutation.mutate(couponForm);
              }}
              disabled={!couponForm.couponCode || createCouponMutation.isPending}
            >
              {createCouponMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Promo Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Enter the amount and bank details for withdrawal. Max balance: ₹{(wallet?.netBalance || 0).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawAmount">Amount (₹)</Label>
              <Input 
                id="withdrawAmount" 
                type="number" 
                max={wallet?.netBalance || 0}
                placeholder="e.g., 10000" 
                value={withdrawAmount} 
                onChange={(e) => setWithdrawAmount(e.target.value)} 
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Bank Account Details</h4>
              <div className="space-y-2">
                <Label htmlFor="accName">Account Holder Name</Label>
                <Input 
                  id="accName" 
                  placeholder="Enter account holder name" 
                  value={bankDetails.accountHolderName} 
                  onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accNumber">Account Number</Label>
                <Input 
                  id="accNumber" 
                  placeholder="Enter account number" 
                  value={bankDetails.accountNumber} 
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input 
                    id="bankName" 
                    placeholder="e.g., SBI, HDFC" 
                    value={bankDetails.bankName} 
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifsc">IFSC Code</Label>
                  <Input 
                    id="ifsc" 
                    placeholder="SBIN0001234" 
                    value={bankDetails.ifscCode} 
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })} 
                  />
                </div>
              </div>
            </div>

            <Button 
              className="w-full gradient-primary text-primary-foreground" 
              onClick={() => {
                if (!withdrawAmount || Number(withdrawAmount) <= 0) return toast.error("Please enter a valid amount");
                if (!bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName || !bankDetails.accountHolderName) {
                  return toast.error("Please fill all bank details");
                }
                withdrawMutation.mutate({ amount: Number(withdrawAmount), bankDetails });
              }}
              disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || Number(withdrawAmount) > (wallet?.netBalance || 0) || withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? "Sending Request..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Finalize & Mark Complete Dialog */}
      <Dialog open={finalizeDialog.open} onOpenChange={(open) => !open && setFinalizeDialog({ open: false, booking: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Finalize & Mark Complete
            </DialogTitle>
            <DialogDescription>
              Mark the event as finished. You can add any last-minute extra costs below.
            </DialogDescription>
          </DialogHeader>
          {finalizeDialog.booking && (
            <form onSubmit={handleFinalizeSubmit} className="space-y-4 pt-4">
              <div className="bg-muted/50 p-4 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Price:</span>
                  <span className="font-medium">₹{finalizeDialog.booking.totalPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Previous Additional Costs:</span>
                  <span className="font-medium">₹{(finalizeDialog.booking.additionalCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-dashed pt-2 font-bold">
                  <span>Current Total:</span>
                  <span>₹{(finalizeDialog.booking.totalPrice + (finalizeDialog.booking.additionalCost || 0)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Advance Paid:</span>
                  <span>-₹{((finalizeDialog.booking as any).advancePaid || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finalExtraCost">New Additional Costs (₹)</Label>
                <Input 
                  id="finalExtraCost" 
                  type="number" 
                  min="0" 
                  placeholder="e.g., 2000 for extra hours" 
                  value={finalAdditionalCost} 
                  onChange={(e) => setFinalAdditionalCost(e.target.value)} 
                />
                <p className="text-[10px] text-muted-foreground">Enter only the NEW additional charges incurred during the event.</p>
              </div>

              <div className="pt-2 border-t flex justify-between items-center mb-4">
                <span className="font-bold">Final Balance Due:</span>
                <span className="text-xl font-black text-primary">
                  ₹{(
                    (finalizeDialog.booking.totalPrice + (finalizeDialog.booking.additionalCost || 0) + Number(finalAdditionalCost)) - 
                    ((finalizeDialog.booking as any).advancePaid || 0)
                  ).toLocaleString()}
                </span>
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12" disabled={updateBookingMutation.isPending}>
                {updateBookingMutation.isPending ? "Processing..." : "Finish Event & Notify Customer"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrganizerDashboard;
