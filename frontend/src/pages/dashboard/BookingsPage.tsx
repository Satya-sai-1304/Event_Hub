import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, Loader2, QrCode, CheckCircle, XCircle, Eye, Sparkles, CreditCard, Scan, Calendar, User, Mail, Users, IndianRupee, FileText, Wallet } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { type Booking, type Event, type BookingStatus } from "@/data/mockData";
import ReviewModal from "@/components/ReviewModal";
import PaymentModal from "@/components/PaymentModal";

const BookingsPage= () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [billDialog, setBillDialog] = useState<{ open: boolean; bookingId: string | null }>({ open: false, bookingId: null });
  const [payDialog, setPayDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [viewDialog, setViewDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [acceptDialog, setAcceptDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [scanDialog, setScanDialog] = useState(false);
  const [scanData, setScanData] = useState({ bookingId: "", ticketId: "" });
  const [finalTotal, setFinalTotal] = useState("");
  const [qrCodeLink, setQrCodeLink] = useState("");
  const [finalizeDialog, setFinalizeDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [finalAdditionalCost, setFinalAdditionalCost] = useState("");
  const [finalQrCode, setFinalQrCode] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
    refetchOnWindowFocus: true,
  });

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

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      return await api.patch(`/bookings/${id}`, data);
    },
    onSuccess: async (_data: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      const status = variables.data.status as string;
      if (status === 'approved') toast.success("Booking approved! Customer notified.");
      if (status === 'rejected') toast.success("Booking rejected.");
      if (status === 'confirmed') toast.success("Payment confirmed! Booking is now active.");
      if (status === 'pending_merchant_approval') toast.success("Approved! Sent to merchant.");
      if (status === 'pending_billing') toast.success("Accepted! Provide the final bill now.");
      if (status === 'bill_sent') toast.success("Bill sent to customer.");
      if (status === 'paid') toast.success("Payment confirmed!");
      
      if (status === 'completed') {
        toast.success("Event marked as completed! Notification sent to customer.");
        // Find the booking to get customerId
        const booking = bookings?.find(b => (b.id === variables.id || b._id === variables.id));
        if (booking) {
          try {
            await api.post('/notifications', {
              userId: booking.customerId,
              type: 'payment',
              title: 'Event Completed - Final Payment Due',
              message: `The event "${booking.eventTitle || booking.serviceName}" has been completed. Please pay the remaining amount.`,
              bookingId: booking.id || booking._id,
              actionUrl: '/dashboard/my-bookings'
            });
          } catch (error) {
            console.error("Failed to send notification:", error);
          }
        }
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Action failed");
    }
  });

  const handleBillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billDialog.bookingId) return;
    
    updateMutation.mutate({
      id: billDialog.bookingId,
      data: {
        status: "payment_pending",
        finalAmount: Number(finalTotal),
        billQrCode: qrCodeLink
      }
    });
    setBillDialog({ open: false, bookingId: null });
    setFinalTotal("");
    setQrCodeLink("");
  };

  const handleConfirmApproval = () => {
    if (!acceptDialog.booking) return;
    
    // Validate advance amount
    const totalAmount = acceptDialog.booking.totalPrice || 0;
    if (advanceAmount > totalAmount) {
      toast.error(`Advance amount cannot exceed total amount of ₹${totalAmount.toLocaleString()}`);
      return;
    }
    
    if (advanceAmount <= 0) {
      toast.error("Advance amount must be greater than 0");
      return;
    }
    
    updateMutation.mutate({
      id: acceptDialog.booking.id || acceptDialog.booking._id!,
      data: {
        status: "approved",
        advanceAmount: Number(advanceAmount),
        paymentStatus: "pending"
      }
    });
    setAcceptDialog({ open: false, booking: null });
    setAdvanceAmount(0);
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

    updateMutation.mutate({
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

  const validateTicketMutation = useMutation({
    mutationFn: async (data: { bookingId: string; ticketId: string }) => {
      const response = await api.post('/bookings/validate-ticket', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success(data.message || "Ticket validated successfully!");
      setScanDialog(false);
      setScanData({ bookingId: "", ticketId: "" });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Validation failed");
    }
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalBookingId = scanData.bookingId.trim();
    let finalTicketId = scanData.ticketId.trim();

    // Check if the input is a JSON string (common from QR scanners)
    try {
      if (finalBookingId.startsWith('{')) {
        const parsed = JSON.parse(finalBookingId);
        if (parsed.bookingId) finalBookingId = parsed.bookingId;
        if (parsed.ticketId) finalTicketId = parsed.ticketId;
      }
    } catch (err) {
      console.error("Failed to parse booking data:", err);
    }

    if (!finalBookingId || !finalTicketId) {
      toast.error("Please enter both Booking ID and Ticket ID");
      return;
    }
    
    validateTicketMutation.mutate({
      bookingId: finalBookingId,
      ticketId: finalTicketId
    });
  };

  const filteredBookings = bookings?.filter((b) => {
    if (user?.role === "customer") return b.customerId === user.id;
    if (user?.role === "organizer") return b.organizerId === user.id;
    return true;
  }) || [];

 return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-display font-bold">
          <Ticket className="inline h-6 w-6 mr-2 text-primary" />
          {user?.role === "customer" ? "My Bookings" : user?.role === "organizer" ? "Assigned Bookings" : "All Bookings"}
        </h1>
        {user?.role === "organizer" && (
          <Button 
            className="gradient-primary text-primary-foreground gap-2"
            onClick={() => setScanDialog(true)}
          >
            <Scan className="h-4 w-4" /> Scan Ticket
          </Button>
        )}
      </div>

      {/* Scan Ticket Dialog */}
      <Dialog open={scanDialog} onOpenChange={setScanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validate Event Ticket</DialogTitle>
            <DialogDescription>Enter the booking and ticket details to validate entry.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScanSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input 
                id="bookingId" 
                placeholder="Full booking ID..." 
                value={scanData.bookingId}
                onChange={(e) => setScanData({ ...scanData, bookingId: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketId">Ticket ID</Label>
              <Input 
                id="ticketId" 
                placeholder="TKT-XXXXX..." 
                value={scanData.ticketId}
                onChange={(e) => setScanData({ ...scanData, ticketId: e.target.value })}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-primary text-white"
              disabled={validateTicketMutation.isPending}
            >
              {validateTicketMutation.isPending ? "Validating..." : "Validate Ticket"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="border-none bg-transparent shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : user?.role === "organizer" ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredBookings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed">
                  <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-bold">No bookings found</p>
                </div>
              ) : (
                filteredBookings.filter(b => b && (b.id || b._id)).map((b) => (
                  <Card key={b.id || b._id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white rounded-[2rem] p-6">
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <div>
                            <h3 className="text-2xl font-black text-foreground tracking-tight">
                              {b.serviceName || b.service?.name || b.event?.title || b.eventTitle || "N/A"}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                              <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                                <Calendar className="h-4 w-4 text-primary" />
                                {new Date(b.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                              </div>
                              <div className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-lg uppercase">
                                  {b.eventType === 'service' ? (b.serviceName || b.service?.name || 'Service') : (b.eventType || 'Event')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Badge variant={
                            b.status === "confirmed" || b.status === "completed" || b.status === "paid" || b.paymentStatus === "paid" ? "default" :
                              b.status === "rejected" || b.status === "cancelled" ? "destructive" :
                                (b.status === "approved" || b.status === "bill_sent" || b.status === "payment_pending" || b.status === "advance_paid" || b.paymentStatus === "partial") ? "secondary" : "outline"
                          } className="rounded-xl px-4 py-1.5 text-xs font-black uppercase tracking-widest">
                            {getStatusLabel(b)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4 border-y border-dashed">
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter flex items-center gap-1">
                              <User className="h-3 w-3" /> Customer
                            </p>
                            <p className="font-bold text-sm text-foreground">{b.customerName}</p>
                            <p className="text-[10px] text-muted-foreground font-medium truncate flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" /> {b.customerEmail}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter flex items-center gap-1">
                              <Users className="h-3 w-3" /> Guests / Tickets
                            </p>
                            <p className="font-bold text-sm text-foreground">{b.guests || b.quantity || 1} {b.eventType === 'ticketed' ? 'Tickets' : 'People'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter flex items-center gap-1">
                              <IndianRupee className="h-3 w-3" /> Total Price
                            </p>
                            <p className="font-black text-lg text-primary">₹{b.totalPrice.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter flex items-center gap-1">
                              <CreditCard className="h-3 w-3" /> Payment Status
                            </p>
                            <Badge variant="outline" className={`text-[10px] font-black uppercase ${b.paymentStatus === 'paid' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                              {b.paymentStatus || 'unpaid'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-3 justify-center items-center lg:items-stretch min-w-[180px]">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl font-bold h-12 flex-1 lg:flex-none bg-[#F8F9FB] hover:bg-[#F0F2F5] text-foreground border-none" 
                          onClick={() => setViewDialog({ open: true, booking: b })}
                        >
                          <Eye className="h-4 w-4 mr-2" /> Details
                        </Button>
                        
                        {b.status === "pending" && b.eventType !== 'ticketed' && (
                          <div className="flex flex-row lg:flex-col gap-3 flex-1 lg:flex-none">
                            <Button 
                              className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-green-200" 
                              onClick={() => setAcceptDialog({ open: true, booking: b })}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" /> Accept
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="rounded-xl font-black h-12 flex-1 shadow-lg shadow-red-200" 
                              onClick={() => updateMutation.mutate({ id: b.id || b._id!, data: { status: "rejected" } })}
                            >
                              <XCircle className="h-4 w-4 mr-2" /> Reject
                            </Button>
                          </div>
                        )}

                        {/* Show "Pending Advance" status when booking is approved but advance not paid yet */}
                        {b.status === "approved" && b.paymentStatus === 'pending' && b.eventType !== 'ticketed' && (
                          <div className="flex-1 lg:flex-none flex items-center justify-center p-3 bg-orange-50 rounded-xl border border-orange-100">
                            <p className="text-xs font-bold text-orange-600 text-center flex items-center gap-1">
                              <Wallet className="h-3 w-3" /> Pending Advance Payment
                            </p>
                          </div>
                        )}

                        {b.status === "confirmed" && b.eventType !== 'ticketed' && (
                          <div className="flex-1 lg:flex-none flex items-center justify-center p-3 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs font-bold text-green-600 text-center flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Booking Confirmed
                            </p>
                          </div>
                        )}
                        
                        {/* Show Complete button only when advance is paid (confirmed status) */}
                        {(b.status === "confirmed" || b.status === "advance_paid") && b.paymentStatus !== 'paid' && b.eventType !== 'ticketed' && (
                          <Button 
                            className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black h-12 flex-1 shadow-lg shadow-primary/20" 
                            onClick={() => setFinalizeDialog({ open: true, booking: b })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Base Total</TableHead>
                  <TableHead>Additional/Final</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow key="empty"><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">No bookings found</TableCell></TableRow>
                ) : filteredBookings.filter(b => b && b.id).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {b.serviceName || b.service?.name || b.event?.title || b.eventTitle || "N/A"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(b.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </TableCell>
                    <TableCell>{b.customerName}</TableCell>
                    <TableCell>₹{b.totalPrice.toLocaleString()}</TableCell>
                    <TableCell>
                      {b.additionalCost ? `₹${(b.totalPrice + b.additionalCost).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        b.status === "confirmed" || b.status === "completed" || b.status === "paid" || b.paymentStatus === "paid" ? "default" :
                          b.status === "rejected" || b.status === "cancelled" ? "destructive" :
                            (b.status === "approved" || b.status === "bill_sent" || b.status === "payment_pending" || b.status === "advance_paid" || b.paymentStatus === "partial") ? "secondary" : "outline"
                      }>{getStatusLabel(b)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {/* MERCHANT: Approve, Reject, Send Bill */}
                      {user?.role === "organizer" && (
                        <div className="flex gap-2 justify-end">
                          {b.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={updateMutation.isPending}
                                onClick={() => updateMutation.mutate({ id: b.id, data: { status: "approved" as BookingStatus } })}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={updateMutation.isPending}
                                onClick={() => updateMutation.mutate({ id: b.id, data: { status: "rejected" as BookingStatus } })}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          
                          {b.status === "approved" && (
                            <Button 
                              size="sm" 
                              className="gradient-primary text-primary-foreground" 
                              onClick={() => setBillDialog({ open: true, bookingId: b.id })} 
                              disabled={updateMutation.isPending}
                            >
                              Send Bill & QR
                            </Button>
                          )}
                          
                          {b.status === "confirmed" && (
                            <span className="text-xs font-semibold text-green-600 px-2 py-1 bg-green-50 rounded">
                              Paid / Completed
                            </span>
                          )}
                          
                          {/* Fallback for old status names if any */}
                          {b.status === ("pending_merchant_approval" as BookingStatus) && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={updateMutation.isPending}
                              onClick={() => updateMutation.mutate({ id: b.id, data: { status: "pending_billing" as BookingStatus } })}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept Booking
                            </Button>
                          )}
                          {(b.status === ("pending_billing" as BookingStatus) || b.status === ("bill_sent" as BookingStatus) || b.status === ("payment_pending" as BookingStatus)) && (
                            <Button 
                              size="sm" 
                              className="gradient-primary text-primary-foreground" 
                              onClick={() => setBillDialog({ open: true, bookingId: b.id })} 
                              disabled={updateMutation.isPending || b.status === 'bill_sent' || b.status === 'payment_pending'}
                            >
                              {(b.status === 'bill_sent' || b.status === 'payment_pending') ? 'Bill Sent' : 'Send Bill'}
                            </Button>
                          )}
                        </div>
                      )}

                      {/* CUSTOMER: Complete Payment */}
                      {user?.role === "customer" && (
                        <div className="flex gap-2 justify-end">
                          {b.status === "approved" && (
                            <span className="text-xs italic text-muted-foreground self-center mr-2">Waiting for bill...</span>
                          )}
                          {(b.status === "bill_sent" || b.status === "payment_pending") && (
                            <Button 
                              size="sm" 
                              className="bg-success text-success-foreground hover:bg-success/90 font-semibold" 
                              onClick={() => setPayDialog({ open: true, booking: b })}
                            >
                              Pay Now
                            </Button>
                          )}
                          {/* Pay Remaining Button - Show when booking is completed with partial payment */}
                          {b.status === "completed" && b.paymentStatus === "partial" && (b.remainingAmount || 0) > 0 && (
                            <Button 
                              size="sm" 
                              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold animate-pulse shadow-lg" 
                              onClick={() => setPayDialog({ open: true, booking: b })}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Remaining ₹{(b.remainingAmount || 0).toLocaleString()}
                            </Button>
                          )}
                          {/* Also show Pay Remaining for advance_paid status with remaining balance */}
                          {b.status === "advance_paid" && b.paymentStatus === "partial" && (b.remainingAmount || 0) > 0 && (
                            <Button 
                              size="sm" 
                              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold animate-pulse shadow-lg" 
                              onClick={() => setPayDialog({ open: true, booking: b })}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" /> Pay Remaining ₹{(b.remainingAmount || 0).toLocaleString()}
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewDialog({ open: true, booking: b })}
                        className="ml-2"
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal 
        open={payDialog.open} 
        onOpenChange={(open) => setPayDialog({ open, booking: payDialog.booking })}
        booking={payDialog.booking}
      />

      {/* Accept Approval Dialog - Merchant Only */}
      <Dialog open={acceptDialog.open} onOpenChange={(open) => !open && setAcceptDialog({ open: false, booking: null })}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black mb-1">Approve Booking</DialogTitle>
              <DialogDescription className="text-white/80 font-medium">
                Review total and set advance payment amount.
              </DialogDescription>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          </div>
          
          <div className="p-6 bg-white space-y-6">
            <div className="p-4 rounded-2xl bg-[#F8F9FB] border-2 border-dashed border-primary/20 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Price</p>
                <p className="text-2xl font-black text-primary">₹{acceptDialog.booking?.totalPrice.toLocaleString()}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl font-bold h-10 border-primary/30 hover:bg-primary/5"
                onClick={() => setAdvanceAmount(Math.round((acceptDialog.booking?.totalPrice || 0) * 0.2))}
              >
                20% Auto
              </Button>
            </div>

            <div className="space-y-3">
              <Label htmlFor="advanceAmount" className="text-sm font-black text-foreground uppercase tracking-widest px-1">
                Advance Amount (₹)
              </Label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors font-bold">₹</div>
                <Input 
                  id="advanceAmount" 
                  type="number" 
                  min="0"
                  max={acceptDialog.booking?.totalPrice}
                  placeholder="Enter advance amount" 
                  value={advanceAmount || ""} 
                  onChange={(e) => setAdvanceAmount(Number(e.target.value))} 
                  className={`h-14 pl-10 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 text-lg font-bold ${
                    advanceAmount > (acceptDialog.booking?.totalPrice || 0)
                      ? 'focus:ring-destructive/50 ring-destructive/20'
                      : 'focus:ring-primary/20'
                  }`}
                  required
                />
              </div>
              {advanceAmount > (acceptDialog.booking?.totalPrice || 0) && (
                <div className="flex items-center gap-2 text-destructive text-xs font-bold bg-destructive/10 p-2 rounded-lg">
                  <XCircle className="h-4 w-4" />
                  <span>Advance amount cannot exceed total of ₹{(acceptDialog.booking?.totalPrice || 0).toLocaleString()}</span>
                </div>
              )}
              {advanceAmount > 0 && advanceAmount <= (acceptDialog.booking?.totalPrice || 0) && (
                <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 p-2 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span>Valid amount • {(acceptDialog.booking?.totalPrice || 0) > 0 ? Math.round((advanceAmount / (acceptDialog.booking!.totalPrice || 0)) * 100) : 0}% of total</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter px-2">
                Customer will be notified to pay this amount to confirm.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button 
                className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20"
                onClick={handleConfirmApproval}
                disabled={updateMutation.isPending || !advanceAmount}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle className="mr-2 h-5 w-5" /> Confirm Approval</>
                )}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full h-12 font-bold text-muted-foreground hover:text-foreground"
                onClick={() => setAcceptDialog({ open: false, booking: null })}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <ReviewModal 
        open={reviewDialog.open} 
        onOpenChange={(open) => !open && setReviewDialog({ open: false, booking: null })}
        booking={reviewDialog.booking}
      />

      {/* View Booking Details Dialog - For All Users */}
      <Dialog open={viewDialog.open} onOpenChange={(open) => !open && setViewDialog({ open: false, booking: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          {viewDialog.booking && (
            <div className="flex flex-col h-full">
              {/* Header with Status Banner */}
              <div className="bg-primary p-6 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70 mb-1">Booking Details</p>
                    <DialogTitle className="text-3xl font-black tracking-tight mb-2">
                      {viewDialog.booking.eventTitle || viewDialog.booking.serviceName || "N/A"}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-3">
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs">
                        ID: {viewDialog.booking.id || viewDialog.booking._id}
                      </Badge>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wider">
                        {getStatusLabel(viewDialog.booking)}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                    onClick={() => setViewDialog({ open: false, booking: null })}
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
                        <User className="h-4 w-4" /> Customer Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Name</span>
                          <span className="font-black text-foreground">{viewDialog.booking.customerName}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Email</span>
                          <span className="font-bold text-foreground text-sm">{viewDialog.booking.customerEmail}</span>
                        </div>
                        {viewDialog.booking.customerPhone && (
                          <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                            <span className="text-xs font-bold text-muted-foreground">Phone</span>
                            <span className="font-bold text-foreground">{viewDialog.booking.customerPhone}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs font-bold text-muted-foreground">Booking Date</span>
                          <span className="font-bold text-foreground">
                            {new Date(viewDialog.booking.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                            {new Date(viewDialog.booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Time Slot</span>
                          <span className="font-black text-foreground capitalize">
                            {viewDialog.booking.timeSlot || viewDialog.booking.customerRequirements?.timeSlot || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed border-muted">
                          <span className="text-xs font-bold text-muted-foreground">Expected Guests</span>
                          <span className="font-black text-foreground">{viewDialog.booking.guests || viewDialog.booking.customerRequirements?.numberOfGuests || 0} People</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs font-bold text-muted-foreground">Event Type</span>
                          <Badge variant="outline" className="font-bold uppercase text-[10px] border-primary/20 text-primary bg-primary/5">
                            {viewDialog.booking.eventType || 'Standard'}
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
                      <p className="text-xl font-black text-foreground">₹{viewDialog.booking.totalPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter mb-1">Additional Charges</p>
                      <p className="text-xl font-black text-foreground">₹{(viewDialog.booking.additionalCost || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-tighter mb-1">Total Paid</p>
                      <p className="text-xl font-black text-green-600">₹{((viewDialog.booking as any).advancePaid || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-primary/5 p-5 rounded-3xl shadow-sm border border-primary/20">
                      <p className="text-[10px] font-black text-primary uppercase tracking-tighter mb-1">Remaining Due</p>
                      <p className="text-xl font-black text-primary">
                        ₹{Math.max(0, (viewDialog.booking.finalAmount || (viewDialog.booking.totalPrice + (viewDialog.booking.additionalCost || 0))) - ((viewDialog.booking as any).advancePaid || 0)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Detailed Requirements (If Full Service) */}
                {viewDialog.booking.customerRequirements && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <Sparkles className="h-4 w-4" /> Specific Requirements
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {viewDialog.booking.customerRequirements.decorationTheme && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Decoration Theme</p>
                          <p className="font-bold text-sm text-foreground">{viewDialog.booking.customerRequirements.decorationTheme}</p>
                        </div>
                      )}
                      {viewDialog.booking.customerRequirements.foodType && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Food Preference</p>
                          <p className="font-bold text-sm text-foreground capitalize">{viewDialog.booking.customerRequirements.foodType}</p>
                        </div>
                      )}
                      {viewDialog.booking.customerRequirements.musicOption && (
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-muted/20">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Music/DJ</p>
                          <p className="font-bold text-sm text-foreground capitalize">{viewDialog.booking.customerRequirements.musicOption}</p>
                        </div>
                      )}
                      {viewDialog.booking.customerRequirements.additionalNotes && (
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-muted/20 col-span-full">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-2">Special Requests & Notes</p>
                          <p className="text-sm text-foreground leading-relaxed italic">"{viewDialog.booking.customerRequirements.additionalNotes}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Billing Details Breakdown */}
                {viewDialog.booking.billingDetails && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <FileText className="h-4 w-4" /> Itemized Bill Breakdown
                    </h3>
                    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                      <CardContent className="p-0">
                        <Table>
                          <TableBody>
                            {viewDialog.booking.billingDetails.decorationCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Decoration</TableCell>
                                <TableCell className="text-right font-black">₹{viewDialog.booking.billingDetails.decorationCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {viewDialog.booking.billingDetails.cateringCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">
                                  Catering 
                                  {viewDialog.booking.billingDetails.costPerPlate && (
                                    <span className="block text-[10px] font-medium text-muted-foreground mt-0.5">
                                      (₹{viewDialog.booking.billingDetails.costPerPlate} × {viewDialog.booking.billingDetails.guestCount || viewDialog.booking.guests} guests)
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-black">₹{viewDialog.booking.billingDetails.cateringCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {viewDialog.booking.billingDetails.musicCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Music & Entertainment</TableCell>
                                <TableCell className="text-right font-black">₹{viewDialog.booking.billingDetails.musicCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {viewDialog.booking.billingDetails.lightingCost > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Lighting & Sound</TableCell>
                                <TableCell className="text-right font-black">₹{viewDialog.booking.billingDetails.lightingCost.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            {viewDialog.booking.billingDetails.additionalCharges > 0 && (
                              <TableRow className="hover:bg-transparent border-muted/10">
                                <TableCell className="text-xs font-bold text-muted-foreground">Other Charges</TableCell>
                                <TableCell className="text-right font-black">₹{viewDialog.booking.billingDetails.additionalCharges.toLocaleString()}</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="hover:bg-transparent border-t-2 border-primary/10">
                              <TableCell className="text-sm font-black text-primary">Grand Total</TableCell>
                              <TableCell className="text-right text-xl font-black text-primary">
                                ₹{(viewDialog.booking.finalAmount || (viewDialog.booking.totalPrice + (viewDialog.booking.additionalCost || 0))).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* 5. Payment QR Code (If Available) */}
                {viewDialog.booking.billQrCode && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest flex items-center gap-2 px-2">
                      <QrCode className="h-4 w-4" /> Payment QR Code
                    </h3>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-muted/20 flex flex-col items-center">
                      <div className="p-4 bg-white border-2 border-primary/10 rounded-2xl shadow-inner mb-4">
                        <img src={viewDialog.booking.billQrCode} alt="Payment QR" className="w-48 h-48 object-contain" />
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
                  onClick={() => setViewDialog({ open: false, booking: null })}
                >
                  Close
                </Button>
                {user?.role === "organizer" && viewDialog.booking.status === "pending" && (
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black px-8 h-12 shadow-lg shadow-primary/20"
                    onClick={() => {
                      setViewDialog({ open: false, booking: null });
                      setAcceptDialog({ open: true, booking: viewDialog.booking });
                    }}
                  >
                    Accept Booking
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merchant Finalize Dialog */}
      <Dialog open={finalizeDialog.open} onOpenChange={(open) => !open && setFinalizeDialog({ open: false, booking: null })}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-6 text-white relative overflow-hidden">
            <div className="relative z-10">
              <DialogTitle className="text-2xl font-black mb-1">Finalize Event</DialogTitle>
              <DialogDescription className="text-white/80 font-medium">
                Add any additional costs and mark the event as completed.
              </DialogDescription>
            </div>
          </div>
          <form onSubmit={handleFinalizeSubmit} className="p-6 bg-white space-y-6">
            <div className="p-4 rounded-2xl bg-[#F8F9FB] border-2 border-dashed border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Base Total</span>
                <span className="font-bold">₹{finalizeDialog.booking?.totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Advance Paid</span>
                <span className="font-bold text-green-600">₹{(finalizeDialog.booking as any)?.advancePaid?.toLocaleString() || 0}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="finalAdditionalCost" className="text-sm font-black text-foreground uppercase tracking-widest px-1">
                Additional Costs (₹)
              </Label>
              <Input 
                id="finalAdditionalCost" 
                type="number" 
                min="0"
                placeholder="Enter any extra charges..." 
                value={finalAdditionalCost} 
                onChange={(e) => setFinalAdditionalCost(e.target.value)} 
                className="h-14 rounded-2xl bg-[#F8F9FB] border-none focus:ring-2 focus:ring-primary/20 text-lg font-bold"
              />
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter px-2">
                This will be added to the final amount due.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button 
                type="submit"
                className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl shadow-primary/20"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle className="mr-2 h-5 w-5" /> Mark Event Completed</>
                )}
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                className="w-full h-12 font-bold text-muted-foreground hover:text-foreground"
                onClick={() => setFinalizeDialog({ open: false, booking: null })}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Merchant Billing Dialog */}
      <Dialog open={billDialog.open} onOpenChange={(open) => !open && setBillDialog({ open: false, bookingId: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Final Bill</DialogTitle>
            <DialogDescription>Enter the final amount and payment QR code for the customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBillSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="finalTotal">Final Amount (₹)</Label>
              <Input 
                id="finalTotal" 
                type="number" 
                min="0" 
                placeholder="e.g., 25000" 
                value={finalTotal} 
                onChange={(e) => setFinalTotal(e.target.value)} 
                required
              />
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
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Sending..." : "Send Bill & QR Code"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default BookingsPage;
