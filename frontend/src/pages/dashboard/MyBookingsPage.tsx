import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, Loader2, Calendar, Users, DollarSign, FileText, XCircle, CheckCircle, Star, AlertCircle, CreditCard, Sparkles } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { type Booking } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReviewModal from "@/components/ReviewModal";
import PlanReviewModal from "@/components/PlanReviewModal";
import PaymentModal from "@/components/PaymentModal";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TicketData {
  ticketId: string;
  qrCodeUrl: string;
  selectedTickets: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  eventTitle: string;
  eventDate: string;
  customerName: string;
  guests: number;
}

const generateTicketQR = async (booking: any): Promise<string> => {
  try {
    const ticketId = booking.ticketId || `TKT-${booking.id.slice(-8).toUpperCase()}`;
    const payload = `${ticketId}|${booking.id}|${booking.eventTitle}|${booking.eventDate}`;
    return await QRCode.toDataURL(payload, { width: 200, margin: 2 });
  } catch {
    return '';
  }
};

const buildTicketData = (booking: any): TicketData => {
  const ticketId = booking.ticketId || `TKT-${booking.id.slice(-8).toUpperCase()}`;
  const selectedTickets = booking.selectedTickets?.length
    ? booking.selectedTickets
    : [{ name: booking.ticketType || 'General', quantity: booking.guests || 1, price: booking.totalPrice || 0 }];
  const totalAmount = booking.finalAmount ?? (booking.totalPrice + (booking.additionalCost ?? 0));
  return {
    ticketId,
    qrCodeUrl: '',
    selectedTickets,
    totalAmount,
    eventTitle: booking.eventTitle || '',
    eventDate: booking.eventDate || '',
    customerName: booking.customerName || '',
    guests: booking.guests || 1,
  };
};

const MyBookingsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [planReviewDialogOpen, setPlanReviewDialogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
  });

  useEffect(() => {
    if (!bookings) return;
    const bookingIdToRate = searchParams.get('rate');
    if (bookingIdToRate) {
      const booking = bookings.find(b => b.id === bookingIdToRate || (b as any)._id === bookingIdToRate);
      if (booking && !booking.isRated) {
        setSelectedBooking(booking);
        setReviewDialogOpen(true);
      }
    }
    const bookingIdToOpen = searchParams.get('booking');
    if (bookingIdToOpen) {
      const booking = bookings.find(b => b.id === bookingIdToOpen || (b as any)._id === bookingIdToOpen);
      if (booking) {
        setSelectedBooking(booking);
        setDetailOpen(true);
      }
    }
  }, [searchParams, bookings]);

  useEffect(() => {
    if (!ticketDialogOpen || !selectedBooking) return;
    setTicketLoading(true);
    setTicketData(null);
    (async () => {
      try {
        const response = await api.get(`/bookings/${selectedBooking.id}/ticket`);
        setTicketData(response.data);
      } catch {
        const qrUrl = await generateTicketQR(selectedBooking);
        const data = buildTicketData(selectedBooking);
        data.qrCodeUrl = qrUrl;
        setTicketData(data);
      } finally {
        setTicketLoading(false);
      }
    })();
  }, [ticketDialogOpen, selectedBooking]);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<any[]>('/services');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      return await api.patch(`/bookings/${id}`, data);
    },
    onSuccess: (_data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (variables.data.status === 'cancelled') {
        toast.success("Booking cancelled successfully");
      }
      if (variables.data.status === 'paid') {
        toast.success("Payment marked as done! Awaiting confirmation.");
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const refundMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await api.post(`/bookings/request-refund/${id}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("Refund request submitted!");
      setRefundDialogOpen(false);
      setRefundReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit refund request");
    }
  });

  const getServiceName = (id: string) => {
    const service = services.find(s => (s._id || s.id) === id);
    return service ? service.name : 'Not selected';
  };

  const getStatusLabel = (booking: Booking) => {
    const status = booking.status;
    const paymentStatus = booking.paymentStatus;
    const totalAmount = booking.finalAmount || (booking.totalPrice + (booking.additionalCost || 0));
    const paidAmount = (booking as any).advancePaid || 0;
    const remaining = totalAmount - paidAmount;

    if (paymentStatus === 'paid' && remaining <= 0) return 'Fully Paid';
    if (paymentStatus === 'partial' || status === 'advance_paid' || (paidAmount > 0 && remaining > 0)) return 'Partial';
    
    const labels: Record<string, string> = {
      'pending': 'Pending Approval',
      'approved': 'Approved - Awaiting Payment',
      'confirmed': 'Confirmed',
      'rejected': 'Rejected',
      'pending_admin': 'Pending Admin Approval',
      'pending_merchant_approval': 'Pending Merchant Approval',
      'pending_billing': 'Pending Merchant Bill',
      'bill_sent': 'Bill Sent',
      'payment_pending': 'Payment Pending',
      'advance_paid': 'Advance Paid',
      'paid': 'Paid',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  const handleDownloadTicket = () => {
    if (!ticketData || !selectedBooking) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add Border
    doc.setDrawColor(147, 51, 234); // Primary color (purple)
    doc.setLineWidth(1);
    doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(147, 51, 234);
    doc.setFont("helvetica", "bold");
    doc.text("EVENT HUB", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Official Event Ticket", pageWidth / 2, 32, { align: "center" });
    
    // Separator line
    doc.setDrawColor(230);
    doc.line(20, 38, pageWidth - 20, 38);
    
    // Event Details
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(ticketData.eventTitle, 20, 50);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const eventDate = new Date(ticketData.eventDate).toLocaleDateString('en-IN', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });
    doc.text(eventDate, 20, 58);
    
    // Ticket ID and Status
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(147, 51, 234);
    doc.text(`TICKET ID: ${ticketData.ticketId}`, 20, 68);
    
    // Customer Info Grid
    doc.setFillColor(248, 249, 251);
    doc.rect(20, 75, pageWidth - 40, 30, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("CUSTOMER NAME", 25, 85);
    doc.text("GUESTS / QUANTITY", pageWidth / 2, 85);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(ticketData.customerName, 25, 95);
    doc.text(`${ticketData.guests} Person(s)`, pageWidth / 2, 95);
    
    // Ticket Types Table
    if (ticketData.selectedTickets && ticketData.selectedTickets.length > 0) {
      const tableData = ticketData.selectedTickets.map(t => [
        t.name,
        t.quantity.toString(),
        `INR ${t.price.toLocaleString()}`
      ]);
      
      autoTable(doc, {
        startY: 115,
        head: [['Ticket Type', 'Qty', 'Price']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 5 },
        margin: { left: 20, right: 20 }
      });
      
      const finalY = (doc as any).lastAutoTable.finalY || 150;
      
      doc.setFontSize(14);
      doc.setTextColor(147, 51, 234);
      doc.text(`Total Amount: INR ${ticketData.totalAmount.toLocaleString()}`, pageWidth - 20, finalY + 15, { align: "right" });
    }
    
    // QR Code
    if (ticketData.qrCodeUrl) {
      const qrY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 30 : 130;
      doc.addImage(ticketData.qrCodeUrl, 'PNG', (pageWidth / 2) - 25, qrY, 50, 50);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text("Scan this QR code at the entry for validation", pageWidth / 2, qrY + 60, { align: "center" });
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Thank you for choosing Event Hub. Enjoy your event!", pageWidth / 2, pageHeight - 15, { align: "center" });
    
    doc.save(`Ticket-${ticketData.ticketId}.pdf`);
   };

  const filteredBookings = bookings?.filter((b) => b.customerId === user?.id) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'rejected':
      case 'cancelled':
        return 'destructive';
      case 'pending':
      case 'pending_admin':
      case 'pending_merchant_approval':
      case 'pending_billing':
      case 'pending_merchant':
        return 'outline';
      case 'approved':
      case 'bill_sent':
      case 'payment_pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleCancelBooking = () => {
    if (!selectedBooking) return;
    updateMutation.mutate({
      id: selectedBooking.id,
      data: { status: 'cancelled' }
    });
    setCancelDialogOpen(false);
    setDetailOpen(false);
    setCancelReason("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'confirmed':
      case 'completed':
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'used':
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Ticket className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          My Bookings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your event bookings and payments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredBookings.length}</p>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-100">
              <Calendar className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredBookings.filter(b => ['pending_admin', 'pending_merchant_approval', 'pending_billing'].includes(b.status)).length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredBookings.filter(b => b.status === 'paid' || b.status === 'accepted').length}</p>
              <p className="text-sm text-muted-foreground">Confirmed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100">
              <DollarSign className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{filteredBookings.filter(b => b.status === 'bill_sent').length}</p>
              <p className="text-sm text-muted-foreground">Payment Due</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
              <p className="text-muted-foreground">Start exploring events and make your first booking!</p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {booking.service?.name || (booking as any).event?.title || booking.eventTitle || booking.serviceName || "N/A"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Booking ID: #{booking.id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                      <Badge 
                        variant={getStatusColor(booking.status)} 
                        className="flex items-center gap-1 capitalize"
                      >
                        {getStatusIcon(booking.status)}
                        {getStatusLabel(booking)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(booking.eventDate).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.guests} Guests</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>₹{(booking.totalPrice + (booking.additionalCost || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl font-bold h-10"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setDetailOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" /> View Details
                    </Button>

                    {(booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'used' || booking.status === 'completed') && booking.eventType === 'ticketed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10 rounded-xl font-bold h-10"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setTicketDialogOpen(true);
                        }}
                      >
                        <Ticket className="h-4 w-4 mr-2" /> View Ticket
                      </Button>
                    )}

                    {booking.status === "approved" && (
                      <div className="flex items-center gap-4 bg-primary/5 p-2 px-4 rounded-2xl border border-primary/10">
                        <p className="text-xs font-bold text-primary">
                          Booking approved. Please pay advance: <span className="text-sm font-black">₹{booking.advanceAmount?.toLocaleString()}</span>
                        </p>
                        <Button 
                          size="sm" 
                          className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black h-10 shadow-lg shadow-primary/20"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setPaymentOpen(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-2" /> Pay Now
                        </Button>
                      </div>
                    )}

                    {(booking.status === "bill_sent" || booking.status === "payment_pending" || (booking.status === 'completed' && booking.paymentStatus !== 'paid')) && (
                      <Button 
                        size="sm" 
                        className="bg-success text-success-foreground hover:bg-success/90 rounded-xl font-black h-10 shadow-lg shadow-success/20 animate-pulse"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setPaymentOpen(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" /> 
                        {booking.status === 'completed' 
                          ? `Pay Remaining Amount` 
                          : 'Pay Final Bill'}
                      </Button>
                    )}

                    {booking.status === 'pending' && booking.eventType === 'ticketed' && (
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setPaymentOpen(true);
                        }}
                      >
                        Pay Now
                      </Button>
                    )}

                    {(booking.status === 'pending' || booking.status === 'pending_admin' || booking.status === 'pending_merchant_approval' || booking.status === 'pending_billing' || booking.status === 'pending_merchant' || booking.status === 'bill_sent') && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setCancelDialogOpen(true);
                        }}
                      >
                        Cancel
                      </Button>
                    )}

                    {booking.isRated && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 text-yellow-600 border border-yellow-100 text-xs font-bold">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        Rated {booking.rating}/5
                      </div>
                    )}

                    {booking.status === 'completed' && !booking.isRated && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setReviewDialogOpen(true);
                        }}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Write Review
                      </Button>
                    )}

                    {['paid', 'confirmed', 'completed'].includes(booking.status) && (!booking.refundStatus || booking.refundStatus === 'none') && (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setRefundDialogOpen(true);
                        }}
                      >
                        Request Refund
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* Review Modal */}
      <ReviewModal 
        open={reviewDialogOpen} 
        onOpenChange={setReviewDialogOpen}
        booking={selectedBooking}
      />
      
      {/* Ticket Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={(open) => {
        setTicketDialogOpen(open);
        if (!open) setTicketData(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary text-white rounded-t-[2rem]">
            <DialogTitle className="text-center font-black text-2xl tracking-tight">Your Event Ticket</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="flex flex-col items-center space-y-8 p-8">
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black tracking-tight text-foreground">{ticketData?.eventTitle || selectedBooking.eventTitle}</h3>
                <div className="flex items-center justify-center gap-2 text-muted-foreground font-bold">
                  <Calendar className="h-4 w-4 text-primary" />
                  {new Date(ticketData?.eventDate || selectedBooking.eventDate).toLocaleDateString('en-IN', { 
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                  })}
                </div>
                <div className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-black tracking-widest uppercase mt-2">
                  Ticket ID: {ticketData?.ticketId || `TKT-${selectedBooking.id.slice(-8).toUpperCase()}`}
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-primary/5 relative group transition-transform hover:scale-[1.02]">
                {ticketLoading ? (
                  <div className="w-56 h-56 flex items-center justify-center bg-muted rounded-3xl">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : ticketData?.qrCodeUrl ? (
                  <img 
                    src={ticketData.qrCodeUrl} 
                    alt="Ticket QR Code" 
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center bg-muted rounded-3xl">
                    <p className="text-xs text-muted-foreground text-center px-6 font-mono font-bold leading-relaxed">
                      {ticketData?.ticketId || `TKT-${selectedBooking.id.slice(-8).toUpperCase()}`}
                    </p>
                  </div>
                )}
                <div className="absolute -inset-4 bg-primary/5 rounded-[3rem] -z-10 blur-2xl group-hover:bg-primary/10 transition-colors" />
              </div>
              
              <div className="w-full grid grid-cols-2 gap-6">
                <div className="p-5 bg-[#F8F9FB] rounded-3xl border border-muted/20">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Customer Name</p>
                  <p className="text-lg font-black text-foreground">{ticketData?.customerName || selectedBooking.customerName}</p>
                </div>
                <div className="p-5 bg-[#F8F9FB] rounded-3xl border border-muted/20">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Guests</p>
                  <p className="text-lg font-black text-foreground">{ticketData?.guests || selectedBooking.guests} Person(s)</p>
                </div>
              </div>

              {ticketData?.selectedTickets && ticketData.selectedTickets.length > 0 && (
                <div className="w-full space-y-4">
                  <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] px-2">Ticket Breakdown</h4>
                  <div className="bg-[#F8F9FB] rounded-[2rem] p-6 border border-muted/20">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-muted/20">
                          <th className="text-left pb-3 text-[10px] text-muted-foreground font-black uppercase tracking-widest">Type</th>
                          <th className="text-center pb-3 text-[10px] text-muted-foreground font-black uppercase tracking-widest">Qty</th>
                          <th className="text-right pb-3 text-[10px] text-muted-foreground font-black uppercase tracking-widest">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted/10">
                        {ticketData.selectedTickets.map((t, i) => (
                          <tr key={i} className="group">
                            <td className="py-4 font-bold text-foreground group-hover:text-primary transition-colors">{t.name}</td>
                            <td className="py-4 text-center">
                              <span className="px-3 py-1 bg-white rounded-full border border-muted/20 font-black text-sm">{t.quantity}</span>
                            </td>
                            <td className="py-4 text-right font-black text-foreground">
                              ₹{(t.price || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="pt-6">
                            <span className="text-lg font-black text-primary">Grand Total</span>
                          </td>
                          <td className="pt-6 text-right">
                            <span className="text-2xl font-black text-primary">₹{ticketData.totalAmount.toLocaleString()}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="w-full p-6 bg-primary/5 rounded-3xl border-2 border-dashed border-primary/20 text-center space-y-2">
                {selectedBooking.status === 'used' ? (
                  <p className="text-xl font-black text-primary tracking-widest uppercase">TICKET USED</p>
                ) : (
                  <>
                    <p className="text-sm font-black text-primary flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4" /> READY FOR ENTRY
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      Present this QR code at the entry to validate your ticket.
                    </p>
                  </>
                )}
              </div>

              <div className="w-full pt-4">
                <Button 
                  className="w-full h-14 rounded-2xl gradient-primary text-white font-black text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3" 
                  onClick={handleDownloadTicket}
                  disabled={!ticketData?.qrCodeUrl}
                >
                  <Ticket className="h-6 w-6" /> Download Ticket (PDF)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Plan Review Modal */}
      <PlanReviewModal
        open={planReviewDialogOpen}
        onOpenChange={setPlanReviewDialogOpen}
        bookingId={selectedBooking?.id || ''}
        plan={selectedBooking?.eventPlan}
      />
      
      {/* Booking Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
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
                        {selectedBooking.status}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={() => setDetailOpen(false)}
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
                        <Calendar className="h-4 w-4" /> Event Information
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
                    <DollarSign className="h-4 w-4" /> Financial Summary
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
                        ₹{Math.max(0, (selectedBooking.finalAmount || selectedBooking.billingDetails?.finalTotal || (selectedBooking.totalPrice + (selectedBooking.additionalCost || 0))) - ((selectedBooking as any).advancePaid || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Requirements (If Full Service) */}
                {selectedBooking.customerRequirements && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <CheckCircle className="h-4 w-4" /> Specific Requirements
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
                                ₹{(selectedBooking.finalAmount || selectedBooking.billingDetails?.finalTotal || (selectedBooking.totalPrice + (selectedBooking.additionalCost || 0))).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* 5. Payment QR Code (If Available) */}
                {selectedBooking.billQrCode && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <CreditCard className="h-4 w-4" /> Payment QR Code
                    </h3>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-muted/20 flex flex-col items-center">
                      <div className="p-4 bg-white border-2 border-primary/10 rounded-2xl shadow-inner mb-4">
                        <img src={selectedBooking.billQrCode} alt="Payment QR" className="w-48 h-48 object-contain" />
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
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </Button>
                {selectedBooking.status === 'bill_sent' && (
                  <Button 
                    className="bg-success text-success-foreground hover:bg-success/90 rounded-xl font-black px-8 h-12 shadow-lg shadow-success/20"
                    onClick={() => {
                      updateMutation.mutate({
                        id: selectedBooking.id,
                        data: { status: 'completed' }
                      });
                      setDetailOpen(false);
                    }}
                  >
                    I Have Paid - ₹{(selectedBooking.finalAmount || selectedBooking.billingDetails?.finalTotal || (selectedBooking.totalPrice + (selectedBooking.additionalCost || 0))).toLocaleString()}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Cancellation Reason (Optional)</Label>
              <Input 
                id="reason" 
                placeholder="Please let us know why..." 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Go Back
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleCancelBooking}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Booking'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal for Ticketed Events */}
      <PaymentModal 
        booking={selectedBooking} 
        open={paymentOpen} 
      onOpenChange={setPaymentOpen}
      />

      {/* Refund Request Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Refund</DialogTitle>
            <DialogDescription>
              Please provide a reason for your refund request. Our team will review it and get back to you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason for Refund</Label>
              <Textarea 
                id="refund-reason" 
                placeholder="Explain why you are requesting a refund..." 
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="gradient-primary text-primary-foreground"
                onClick={() => refundMutation.mutate({ id: selectedBooking?.id || selectedBooking?._id, reason: refundReason })}
                disabled={refundMutation.isPending || !refundReason}
              >
                {refundMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookingsPage;
