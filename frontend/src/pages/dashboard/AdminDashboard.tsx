import { categories, type User, type Event, type Booking } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import EventCard from "@/components/EventCard";
import { toast } from "sonner";

import {
  CalendarDays, Users, Ticket, IndianRupee, BarChart3,
  ShieldCheck, TrendingUp, Star, Activity, Plus, Edit, Trash2, FileText, Loader2,
  XCircle
} from "lucide-react";
import Loader from "@/components/Loader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import StatsCard from "@/components/StatsCard";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SERVICE_TYPES = [
  'Makeup Artist', 'Hairstylist', 'Photographer', 'Videographer', 
  'Decoration', 'Catering', 'DJ', 'Lighting', 'Mehendi Artist', 'Stage Decoration',
  'Venue', 'Entertainment', 'Security', 'Other'
];

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [eventFilter, setEventFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [viewBookingDialog, setViewBookingDialog] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    couponCode: "",
    discountType: "percentage",
    discountValue: 0,
    minimumOrderAmount: 0,
    expiryDate: new Date().toISOString().split('T')[0],
    isGlobal: true,
    applicableType: "ALL" as 'ALL' | 'EVENT' | 'CATEGORY' | 'SERVICE',
    eventId: "",
    categoryId: "",
    serviceType: "",
    merchantId: "admin",
    serviceIds: [] as string[],
    applicableEvents: [] as string[],
    applicableServices: [] as string[],
    applicableCategory: "",
    usageLimit: null as number | null
  });
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    target: "all",
    type: "info",
    title: "",
    message: "",
    actionUrl: ""
  });
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  const [bannerForm, setBannerForm] = useState({
    title: "",
    image: "",
    link: "",
    order: 0,
    isActive: true
  });
  const [settingsForm, setSettingsForm] = useState<any>(null);

  const { data: refunds, isLoading: refundsLoading } = useQuery({
    queryKey: ['refunds'],
    queryFn: async () => {
      const response = await api.get<any[]>('/bookings');
      return response.data.filter(b => b.refundStatus && b.refundStatus !== 'none');
    },
  });

  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const response = await api.get<any[]>('/banners?all=true');
      return response.data;
    },
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api.get<any[]>('/audit-logs');
      return response.data;
    },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get<any>('/settings');
      setSettingsForm(response.data);
      return response.data;
    },
  });

  const approveRefundMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.patch(`/bookings/approve-refund/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      toast.success("Refund approved successfully!");
    }
  });

  const rejectRefundMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await api.patch(`/bookings/reject-refund/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      toast.success("Refund rejected!");
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/notifications/broadcast', data);
    },
    onSuccess: () => {
      toast.success("Notification broadcasted successfully!");
      setIsBroadcastDialogOpen(false);
      setBroadcastForm({ target: "all", type: "info", title: "", message: "", actionUrl: "" });
    },
    onError: (err: any) => {
      console.error("Broadcast error:", err);
      toast.error(err.response?.data?.message || "Failed to send broadcast notification");
    }
  });

  const createBannerMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/banners', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success("Banner created successfully!");
      setIsBannerDialogOpen(false);
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success("Settings updated successfully!");
    }
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const response = await api.get<any[]>('/coupons');
      return response.data;
    },
  });

  const { data: merchantCategories } = useQuery({
    queryKey: ['categories', couponForm.merchantId],
    queryFn: async () => {
      if (!couponForm.merchantId || couponForm.merchantId === 'admin') return serverCategories || [];
      const response = await api.get(`/categories?merchantId=${couponForm.merchantId}`);
      return response.data;
    },
    enabled: !!couponForm.merchantId,
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data };
      // Remove empty strings for ObjectId fields to avoid casting errors
      if (payload.eventId === "") delete payload.eventId;
      if (payload.categoryId === "") delete payload.categoryId;
      if (payload.serviceType === "") delete payload.serviceType;
      if (payload.serviceIds && payload.serviceIds.length === 0) delete payload.serviceIds;
      if (payload.applicableCategory === "") delete payload.applicableCategory;
      if (payload.applicableEvents && payload.applicableEvents.length === 0) delete payload.applicableEvents;
      if (payload.applicableServices && payload.applicableServices.length === 0) delete payload.applicableServices;
      return await api.post('/coupons', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success("Coupon created successfully!");
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
        merchantId: "admin",
        serviceIds: [],
        applicableEvents: [],
        applicableServices: [],
        applicableCategory: "",
        usageLimit: null
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to create coupon");
    }
  });

  const deleteCouponMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.delete(`/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast.success("Coupon deleted successfully!");
    }
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/users');
      return response.data;
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
  });

  const { data: serverCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<any[]>('/services');
      return response.data;
    },
  });

  const { data: complaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const response = await api.get('/complaints');
      return response.data;
    },
  });

  const updateComplaintMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<any> }) => {
      return await api.patch(`/complaints/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success("Complaint status updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const filteredEvents = (events || []).filter(event => {
    if (eventFilter === 'all') return true;
    return event.status === eventFilter;
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Event> }) => {
      return await api.patch(`/events/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      return await api.patch(`/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("User status updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete event");
    },
  });

  const { data: payouts, isLoading: payoutsLoading } = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const response = await api.get<any[]>('/merchants/payouts/all');
      return response.data;
    },
  });

  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.patch(`/merchants/payouts/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Payout status updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const isLoading = eventsLoading || usersLoading || categoriesLoading || payoutsLoading;

  const totalEvents = events?.length || 0;
  const revenueBookings = (bookings || []).filter((b) => ['paid', 'completed', 'confirmed', 'used', 'accepted'].includes(b.status));
  const totalRevenue = revenueBookings.reduce((s, b) => s + (b.totalPrice || 0) + (b.additionalCost || 0), 0);

  const currentCategories = serverCategories || categories;

  const categoryData = currentCategories.map((c: any) => ({
    name: c.name,
    events: (events || []).filter((e) => e.category === (c._id || c.id)).length,
  })).filter((c: any) => c.events > 0);

  const statusData = [
    { name: "Upcoming", value: (events || []).filter((e) => e.status === "upcoming").length, color: "hsl(152, 69%, 40%)" },
    { name: "Completed", value: (events || []).filter((e) => e.status === "completed").length, color: "hsl(220, 10%, 46%)" },
    { name: "Cancelled", value: (events || []).filter((e) => e.status === "cancelled").length, color: "hsl(0, 84%, 60%)" },
  ].filter(s => s.value > 0);

  // Calculate Merchant Revenue Report
  const merchantRevenueData = (users || []).filter(u => u.role === 'organizer' || u.role === 'merchant').map(merchant => {
    const merchantBookings = (bookings || []).filter(b => 
      b.organizerId === merchant.id && 
      ['paid', 'completed', 'confirmed', 'used', 'accepted'].includes(b.status)
    );
    const totalSales = merchantBookings.reduce((sum, b) => sum + (b.totalPrice || 0) + (b.additionalCost || 0), 0);
    const commission = totalSales * 0.05; // 5% Commission
    const netEarnings = totalSales - commission;
    const totalBookings = merchantBookings.length;
    
    return {
      id: merchant.id,
      name: merchant.name,
      totalSales,
      commission,
      netEarnings,
      totalBookings
    };
  }).filter(m => m.totalSales > 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold">
          Admin <span className="text-gradient">Dashboard</span>
        </h1>
        <p className="text-muted-foreground mt-1">Complete overview of your platform</p>
      </div>

      {/* Stats */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {[
          { label: "Total Events", value: totalEvents, icon: CalendarDays, color: "text-primary" },
          { label: "Total Users", value: users?.length || 0, icon: Users, color: "text-secondary" },
          { label: "Total Bookings", value: bookings?.length || 0, icon: FileText, color: "text-accent" },
          { label: "Revenue", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-success" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="payouts">Payout Requests</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Report</TabsTrigger>
              <TabsTrigger value="complaints">Complaints</TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
              <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
              <TabsTrigger value="banners">Banners</TabsTrigger>
              <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="coupons">Coupons</TabsTrigger>
            </TabsList>


            <TabsContent value="payouts" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">Merchant Payout Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No payout requests yet.
                          </TableCell>
                        </TableRow>
                      ) : (payouts || []).map((p: any) => {
                        const merchant = users?.find(u => u.id === p.merchantId);
                        return (
                          <TableRow key={p.id || p._id}>
                            <TableCell>
                              <div className="font-medium">{merchant?.name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{merchant?.email || p.merchantId}</div>
                              {p.bankDetails && (
                                <div className="mt-2 p-2 bg-muted/50 rounded-lg text-[10px] space-y-1">
                                  <p className="font-bold uppercase text-primary">Bank Details</p>
                                  <p><span className="text-muted-foreground">Acc:</span> {p.bankDetails.accountNumber}</p>
                                  <p><span className="text-muted-foreground">IFSC:</span> {p.bankDetails.ifscCode}</p>
                                  <p><span className="text-muted-foreground">Bank:</span> {p.bankDetails.bankName}</p>
                                  <p><span className="text-muted-foreground">Name:</span> {p.bankDetails.accountHolderName}</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-primary">₹{p.amount.toLocaleString()}</TableCell>
                            <TableCell>{new Date(p.requestedAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant={
                                p.status === 'paid' ? 'default' : 
                                p.status === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {p.status === 'pending' && (
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => updatePayoutMutation.mutate({ id: p.id || p._id, status: 'approved' })}
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => updatePayoutMutation.mutate({ id: p.id || p._id, status: 'rejected' })}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {p.status === 'approved' && (
                                <Button 
                                  size="sm" 
                                  className="gradient-primary text-primary-foreground"
                                  onClick={() => updatePayoutMutation.mutate({ id: p.id || p._id, status: 'paid' })}
                                >
                                  Mark as Paid
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="font-display">All Users</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users || []).map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={u.status === 'blocked' ? "destructive" : "default"}>
                              {u.status === 'blocked' ? "Blocked" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.role !== 'admin' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className={u.status === 'blocked' ? "text-green-600 border-green-600 hover:bg-green-50" : "text-destructive border-destructive hover:bg-destructive/10"}
                                onClick={() => updateUserMutation.mutate({ 
                                  id: u.id, 
                                  data: { status: u.status === 'blocked' ? 'active' : 'blocked' } 
                                })}
                              >
                                {u.status === 'blocked' ? "Unblock" : "Block"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold font-display">Manage Events</h2>
                <div className="flex gap-2">
                  <Select defaultValue="all" onValueChange={(val) => setEventFilter(val)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      <SelectItem value="active">Active Events</SelectItem>
                      <SelectItem value="completed">Completed Events</SelectItem>
                      <SelectItem value="cancelled">Cancelled Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvents.length === 0 ? (
                  <p className="col-span-3 text-center text-muted-foreground py-10">No events found for this filter.</p>
                ) : filteredEvents.map((event) => (
                  <div key={event.id} className="relative group">
                    <EventCard
                      event={event}
                      showActions="admin"
                      onDelete={() => deleteMutation.mutate(event.id)}
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant={event.featured ? "default" : "secondary"}
                        className="h-8 w-8 rounded-full shadow-lg"
                        onClick={() => updateEventMutation.mutate({ id: event.id, data: { featured: !event.featured } })}
                        title={event.featured ? "Unfeature Event" : "Feature Event"}
                      >
                        <Star className={`h-4 w-4 ${event.featured ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      </Button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {event.status !== 'suspended' && event.status !== 'completed' && event.status !== 'cancelled' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                          onClick={() => updateEventMutation.mutate({ id: event.id, data: { status: 'suspended' } })}
                        >
                          Suspend
                        </Button>
                      )}
                      {event.status === 'suspended' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => updateEventMutation.mutate({ id: event.id, data: { status: 'active' } })}
                        >
                          Reactivate
                        </Button>
                      )}
                      {event.status !== 'cancelled' && event.status !== 'completed' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 text-destructive border-destructive/20 hover:bg-destructive/5"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to cancel this event?")) {
                              updateEventMutation.mutate({ id: event.id, data: { status: 'cancelled' } });
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bookings" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="font-display">All Bookings</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(bookings || []).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.customerName}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{b.eventTitle || b.serviceName || "N/A"}</TableCell>
                          <TableCell>{b.guests}</TableCell>
                          <TableCell>₹{b.totalPrice.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === "paid" || b.status === "completed" ? "default" : b.status === "rejected" ? "destructive" : "secondary"}>
                              {b.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(b);
                                setViewBookingDialog(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Merchant Revenue Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Merchant Name</TableHead>
                        <TableHead>Total Bookings</TableHead>
                        <TableHead>Total Sales</TableHead>
                        <TableHead>Commission (5%)</TableHead>
                        <TableHead className="text-right">Net Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {merchantRevenueData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            No revenue data available for merchants yet.
                          </TableCell>
                        </TableRow>
                      ) : merchantRevenueData.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell>{m.totalBookings}</TableCell>
                          <TableCell>₹{m.totalSales.toLocaleString()}</TableCell>
                          <TableCell className="text-orange-600">₹{m.commission.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            ₹{m.netEarnings.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="complaints" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="font-display">Customer Complaints</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complaintsLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4"><Loader /></TableCell></TableRow>
                      ) : (complaints || []).length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4">No complaints yet.</TableCell></TableRow>
                      ) : complaints.map((c: any) => (
                        <TableRow key={c.id || c._id}>
                          <TableCell>
                            <div className="font-medium">{c.userName}</div>
                            <div className="text-xs text-muted-foreground">{c.userEmail}</div>
                          </TableCell>
                          <TableCell className="font-medium">{c.subject}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={c.message}>{c.message}</TableCell>
                          <TableCell>
                            <Badge variant={c.status === 'resolved' ? 'default' : c.status === 'ignored' ? 'secondary' : 'outline'}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {c.status === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-green-600 border-green-200"
                                  onClick={() => updateComplaintMutation.mutate({ id: c.id || c._id, data: { status: 'resolved' } })}
                                >
                                  Resolve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="text-muted-foreground"
                                  onClick={() => updateComplaintMutation.mutate({ id: c.id || c._id, data: { status: 'ignored' } })}
                                >
                                  Ignore
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refunds" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="font-display">Refund Management</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refundsLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4"><Loader /></TableCell></TableRow>
                      ) : (refunds || []).length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4">No refund requests.</TableCell></TableRow>
                      ) : refunds.map((r: any) => (
                        <TableRow key={r.id || r._id}>
                          <TableCell className="font-mono text-xs">{r.id || r._id}</TableCell>
                          <TableCell>{r.customerName}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{r.refundReason}</TableCell>
                          <TableCell>
                            <Badge variant={r.refundStatus === 'approved' ? 'default' : r.refundStatus === 'rejected' ? 'destructive' : 'outline'}>
                              {r.refundStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {r.refundStatus === 'pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => approveRefundMutation.mutate({ 
                                    id: r.id || r._id, 
                                    data: { refundAmount: r.totalPrice, transactionId: `REF-${Math.random().toString(36).substr(2, 9).toUpperCase()}` } 
                                  })}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => rejectRefundMutation.mutate({ id: r.id || r._id, data: { reason: "Policy violation" } })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="broadcast" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-display">Notification Broadcasting</CardTitle>
                    <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gradient-primary"><Plus className="h-4 w-4 mr-2" /> New Broadcast</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Create Broadcast Notification</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <Select value={broadcastForm.target} onValueChange={(v) => setBroadcastForm({...broadcastForm, target: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="customers">Customers Only</SelectItem>
                                <SelectItem value="merchants">Merchants Only</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={broadcastForm.type} onValueChange={(v) => setBroadcastForm({...broadcastForm, type: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="info">Information</SelectItem>
                                <SelectItem value="alert">Alert</SelectItem>
                                <SelectItem value="promo">Promotion</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={broadcastForm.title} onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea value={broadcastForm.message} onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => broadcastMutation.mutate(broadcastForm)} disabled={broadcastMutation.isPending}>
                            {broadcastMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Broadcast
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Send real-time notifications to all users on the platform.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="banners" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="font-display">Banner Management</CardTitle>
                    <Dialog open={isBannerDialogOpen} onOpenChange={setIsBannerDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gradient-primary"><Plus className="h-4 w-4 mr-2" /> Add Banner</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Homepage Banner</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={bannerForm.title} onChange={(e) => setBannerForm({...bannerForm, title: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input value={bannerForm.image} onChange={(e) => setBannerForm({...bannerForm, image: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Link (Optional)</Label>
                            <Input value={bannerForm.link} onChange={(e) => setBannerForm({...bannerForm, link: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Order</Label>
                            <Input type="number" value={bannerForm.order} onChange={(e) => setBannerForm({...bannerForm, order: Number(e.target.value)})} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={() => createBannerMutation.mutate(bannerForm)}>Add Banner</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bannersLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader /></TableCell></TableRow>
                      ) : (banners || []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4">No banners found.</TableCell></TableRow>
                      ) : banners.map((b: any) => (
                        <TableRow key={b.id || b._id}>
                          <TableCell><img src={b.image} alt={b.title} className="w-16 h-10 object-cover rounded" /></TableCell>
                          <TableCell className="font-medium">{b.title}</TableCell>
                          <TableCell><Badge variant={b.isActive ? 'default' : 'secondary'}>{b.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => api.delete(`/banners/${b.id || b._id}`).then(() => queryClient.invalidateQueries({queryKey:['banners']}))}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit-logs" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="font-display">Audit Logs</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Module</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader /></TableCell></TableRow>
                      ) : (auditLogs || []).length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4">No audit logs found.</TableCell></TableRow>
                      ) : auditLogs.map((l: any) => (
                        <TableRow key={l.id || l._id}>
                          <TableCell className="font-medium">{l.action}</TableCell>
                          <TableCell>{l.userName || l.userId}</TableCell>
                          <TableCell><Badge variant="outline">{l.module}</Badge></TableCell>
                          <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader><CardTitle className="font-display">Platform Settings</CardTitle></CardHeader>
                <CardContent>
                  {settingsLoading ? <Loader /> : settingsForm && (
                    <div className="max-w-xl space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Platform Name</Label>
                          <Input value={settingsForm.platformName} onChange={(e) => setSettingsForm({...settingsForm, platformName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Commission Rate (%)</Label>
                          <Input type="number" value={settingsForm.commissionRate} onChange={(e) => setSettingsForm({...settingsForm, commissionRate: Number(e.target.value)})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Email</Label>
                        <Input value={settingsForm.contactEmail} onChange={(e) => setSettingsForm({...settingsForm, contactEmail: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <Input value={settingsForm.contactPhone} onChange={(e) => setSettingsForm({...settingsForm, contactPhone: e.target.value})} />
                      </div>
                      <div className="flex items-center space-x-2 pt-4">
                        <Button onClick={() => updateSettingsMutation.mutate(settingsForm)} disabled={updateSettingsMutation.isPending}>
                          Save Settings
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold font-display">Category Management</h2>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Merchant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoriesLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4"><Loader /></TableCell></TableRow>
                      ) : (currentCategories || []).map((c: any) => {
                        const merchant = users?.find(u => u.id === c.merchantId);
                        return (
                          <TableRow key={c._id || c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.description || "No description"}</TableCell>
                            <TableCell><Badge variant={c.isGlobal ? 'default' : 'secondary'}>{c.isGlobal ? 'Global' : 'Merchant'}</Badge></TableCell>
                            <TableCell className="text-sm">{merchant?.name || c.merchantId === 'admin' ? 'Admin' : 'Unknown'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="coupons" className="mt-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold font-display">Coupon Management</h2>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Min. Order</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Scope</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {couponsLoading ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-4"><Loader /></TableCell></TableRow>
                      ) : (coupons || []).length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-4">No coupons found.</TableCell></TableRow>
                      ) : coupons.map((c: any) => (
                        <TableRow key={c._id || c.id}>
                          <TableCell className="font-bold">{c.couponCode}</TableCell>
                          <TableCell>{c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}</TableCell>
                          <TableCell>₹{c.minimumOrderAmount}</TableCell>
                          <TableCell>{new Date(c.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {c.usageLimit ? (
                              <Badge variant={c.usageCount >= c.usageLimit ? 'destructive' : 'secondary'}>
                                {c.usageCount}/{c.usageLimit}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{c.usageCount} used</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={c.isGlobal ? 'default' : 'secondary'}>
                              {c.isGlobal ? 'Global' : 'Specific'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

      {/* Booking Detail Dialog */}
      <Dialog open={viewBookingDialog} onOpenChange={setViewBookingDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          {selectedBooking && (
            <div className="flex flex-col h-full">
              {/* Header with Status Banner */}
              <div className="bg-primary p-6 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-1">Booking Details</p>
                    <DialogTitle className="text-3xl font-black tracking-tight mb-2">
                      {selectedBooking.eventTitle || selectedBooking.serviceName || "N/A"}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-3">
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs">
                        ID: {selectedBooking.id || (selectedBooking as any)._id}
                      </Badge>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
                        {selectedBooking.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={() => setViewBookingDialog(false)}
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
                          <span className="font-black text-foreground">{selectedBooking.customerName}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Email</span>
                          <span className="font-bold text-foreground text-sm">{selectedBooking.customerEmail}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs font-bold text-muted-foreground">Booking Date</span>
                          <span className="font-bold text-foreground">
                            {new Date(selectedBooking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Event Info Card */}
                  <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" /> Event Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Event Date</span>
                          <span className="font-black text-foreground">
                            {new Date(selectedBooking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Time Slot</span>
                          <span className="font-black text-foreground capitalize">
                            {selectedBooking.timeSlot || selectedBooking.customerRequirements?.timeSlot || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Expected Guests</span>
                          <span className="font-black text-foreground">{selectedBooking.guests || selectedBooking.customerRequirements?.numberOfGuests || 0} People</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs font-bold text-muted-foreground">Event Type</span>
                          <Badge variant="outline" className="font-bold uppercase text-[10px] border-primary/20 text-primary bg-primary/5">
                            {selectedBooking.eventType === 'service' ? (selectedBooking.serviceName || selectedBooking.service?.name || 'Service') : (selectedBooking.eventType || 'Standard')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 2. Pricing & Financial Summary - HIGHLIGHTED */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                    <IndianRupee className="h-4 w-4" /> Financial Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Base Price</p>
                      <p className="text-xl font-black text-foreground">₹{selectedBooking.totalPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Additional Charges</p>
                      <p className="text-xl font-black text-foreground">₹{(selectedBooking.additionalCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter mb-1">Total Paid</p>
                      <p className="text-xl font-black text-green-600">₹{((selectedBooking as any).advancePaid || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-primary/5 p-5 rounded-3xl shadow-sm border border-primary/20">
                      <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-1">Remaining Due</p>
                      <p className="text-xl font-black text-primary">
                        ₹{Math.max(0, (selectedBooking.finalAmount || (selectedBooking.totalPrice + (selectedBooking.additionalCost || 0))) - ((selectedBooking as any).advancePaid || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Requirements (If Full Service) */}
                {selectedBooking.customerRequirements && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <ShieldCheck className="h-4 w-4" /> Specific Requirements
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {selectedBooking.customerRequirements.decorationTheme && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Decoration Theme</p>
                          <p className="font-bold text-sm text-foreground">{selectedBooking.customerRequirements.decorationTheme}</p>
                        </div>
                      )}
                      {selectedBooking.customerRequirements.foodType && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Food Preference</p>
                          <p className="font-bold text-sm text-foreground capitalize">{selectedBooking.customerRequirements.foodType}</p>
                        </div>
                      )}
                      {selectedBooking.customerRequirements.musicOption && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Music/DJ</p>
                          <p className="font-bold text-sm text-foreground capitalize">{selectedBooking.customerRequirements.musicOption}</p>
                        </div>
                      )}
                      {selectedBooking.customerRequirements.additionalNotes && (
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20 col-span-full">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Special Requests & Notes</p>
                          <p className="text-sm text-foreground leading-relaxed italic">"{selectedBooking.customerRequirements.additionalNotes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Billing Details Breakdown */}
                {selectedBooking.billingDetails && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <FileText className="h-4 w-4" /> Itemized Bill Breakdown
                    </h3>
                    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-0">
                        <Table className="w-full">
                          <TableBody>
                            {selectedBooking.billingDetails.decorationCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Decoration</TableCell>
                                <TableCell className="text-right font-black">₹{selectedBooking.billingDetails.decorationCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {selectedBooking.billingDetails.cateringCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">
                                  Catering 
                                  {selectedBooking.billingDetails.costPerPlate && (
                                    <span className="block text-[10px] font-medium text-muted-foreground mt-0.5">
                                      (₹{selectedBooking.billingDetails.costPerPlate} × {selectedBooking.billingDetails.guestCount || selectedBooking.guests} guests)
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-black">₹{selectedBooking.billingDetails.cateringCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {selectedBooking.billingDetails.musicCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Music & Entertainment</TableCell>
                                <TableCell className="text-right font-black">₹{selectedBooking.billingDetails.musicCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {selectedBooking.billingDetails.lightingCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Lighting & Sound</TableCell>
                                <TableCell className="text-right font-black">₹{selectedBooking.billingDetails.lightingCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {selectedBooking.billingDetails.additionalCharges > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Other Charges</TableCell>
                                <TableCell className="text-right font-black">₹{selectedBooking.billingDetails.additionalCharges.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="hover:bg-transparent border-t-2 border-primary/10">
                              <TableCell className="text-sm font-black text-primary">Grand Total</TableCell>
                              <TableCell className="text-right text-xl font-black text-primary">
                                ₹{(selectedBooking.finalAmount || (selectedBooking.totalPrice + (selectedBooking.additionalCost || 0))).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-6 bg-white border-t border-muted/20 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  className="rounded-xl font-bold px-8 h-12"
                  onClick={() => setViewBookingDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
