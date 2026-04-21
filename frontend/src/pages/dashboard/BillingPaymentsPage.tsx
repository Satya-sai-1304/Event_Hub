import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Loader2, DollarSign, CheckCircle, Clock, FileDown, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { type Booking } from "@/data/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import generateInvoice from "@/lib/invoiceGenerator";

import ReviewModal from "@/components/ReviewModal";
import PaymentModal from "@/components/PaymentModal";

const BillingPaymentsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Booking> }) => {
      return await api.patch(`/bookings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("Payment confirmed successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Payment confirmation failed");
    }
  });

  const customerBookings = bookings?.filter((b) => b.customerId === user?.id) || [];

  const paymentStats = {
    total: customerBookings.length,
    paid: customerBookings.filter(b => {
      const total = b.finalAmount || (b.totalPrice + (b.additionalCost || 0));
      const paid = (b as any).advancePaid || 0;
      return b.paymentStatus === 'paid' && (total - paid <= 0);
    }).length,
    pending: customerBookings.filter(b => 
      (b.status === 'bill_sent' || b.status === 'payment_pending' || (b.status === 'completed' && b.paymentStatus !== 'paid'))
    ).length,
    upcoming: customerBookings.filter(b => 
      !b.paymentStatus && ['pending_admin', 'pending_merchant', 'pending_billing', 'handed_to_merchant', 'approved'].includes(b.status)
    ).length,
  };

  const totalPaid = customerBookings
    .reduce((sum, b) => sum + ((b as any).advancePaid || 0), 0);

  const totalRemaining = customerBookings
    .filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'paid')
    .reduce((sum, b) => {
      const total = b.finalAmount || (b.totalPrice + (b.additionalCost || 0));
      const paid = (b as any).advancePaid || 0;
      return sum + (total - paid);
    }, 0);

  const totalPending = customerBookings
    .filter(b => (b.status === 'bill_sent' || b.status === 'payment_pending' || (b.status === 'completed' && b.paymentStatus !== 'paid')))
    .reduce((sum, b) => sum + ((b.finalAmount || (b.totalPrice + (b.additionalCost || 0))) - ((b as any).advancePaid || 0)), 0);

  const handlePayment = () => {
    if (!selectedBooking) return;
    updateMutation.mutate({
      id: selectedBooking.id,
      data: { status: 'paid' }
    });
    setPayDialogOpen(false);
  };

  const handleGenerateInvoice = (booking: Booking) => {
    // Generate and download PDF invoice
    try {
      const invoiceData = {
        invoiceNumber: (booking as any).invoiceNumber || `INV-${booking.id.substring(0, 8).toUpperCase()}`,
        eventTitle: booking.eventTitle,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        eventDate: booking.eventDate,
        totalPrice: booking.totalPrice + (booking.additionalCost || 0),
        paidAmount: booking.status === 'paid' || booking.status === 'completed' ? booking.totalPrice + (booking.additionalCost || 0) : 0,
        remainingAmount: booking.status === 'paid' || booking.status === 'completed' ? 0 : booking.totalPrice + (booking.additionalCost || 0),
        status: booking.status,
        bookingDate: booking.createdAt,
      };
      
      generateInvoice(invoiceData);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error('Invoice generation failed:', error);
      toast.error("Failed to generate invoice");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Billing & Payments
        </h1>
        <p className="text-muted-foreground mt-1">View your payment history and manage bills</p>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-blue-700">₹{totalPaid.toLocaleString()}</p>
              <p className="text-sm font-bold text-blue-600/70 uppercase tracking-tighter">Total Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50 border-orange-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-orange-700">₹{totalRemaining.toLocaleString()}</p>
              <p className="text-sm font-bold text-orange-600/70 uppercase tracking-tighter">Remaining Due</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50 border-green-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{paymentStats.paid}</p>
              <p className="text-sm font-bold text-green-600/70 uppercase tracking-tighter">Fully Paid</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-100">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-100">
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{paymentStats.total}</p>
              <p className="text-sm font-bold text-purple-600/70 uppercase tracking-tighter">Total Bookings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Alert */}
      {paymentStats.pending > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">You have {paymentStats.pending} pending payment(s)</p>
                <p className="text-sm text-orange-700">Total due: ₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : customerBookings.length === 0 ? (
            <div className="p-12 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold mb-2">No payment history</h3>
              <p className="text-muted-foreground">Your payment transactions will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Name</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerBookings.map((booking) => {
                  const totalAmount = booking.finalAmount || (booking.totalPrice + (booking.additionalCost || 0));
                  const paidAmount = (booking as any).advancePaid || 0;
                  const isPaid = booking.paymentStatus === 'paid' && (totalAmount - paidAmount <= 0);
                  const isPartial = (booking.paymentStatus === 'partial' || booking.status === 'advance_paid') && (totalAmount - paidAmount > 0);
                  const isPending = (booking.status === 'bill_sent' || booking.status === 'payment_pending' || (booking.status === 'completed' && booking.paymentStatus !== 'paid'));
                  const remainingAmount = Math.max(0, totalAmount - paidAmount);
                  
                  return (
                    <TableRow key={booking.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold max-w-[200px] truncate">
                        {booking.service?.name || booking.event?.title || booking.eventTitle || booking.serviceName || "N/A"}
                        <p className="text-[10px] text-muted-foreground font-medium">#{booking.id.slice(-8).toUpperCase()}</p>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {new Date(booking.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="font-black text-foreground">
                        ₹{totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-blue-600">₹{paidAmount.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black">Advance</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {remainingAmount > 0 ? (
                          <div className="flex flex-col">
                            <span className="font-black text-orange-600">₹{remainingAmount.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-black">Remaining</span>
                          </div>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Fully Paid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            isPaid ? 'default' :
                            isPartial ? 'secondary' :
                            booking.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }
                          className={`capitalize font-bold rounded-lg ${isPaid ? 'bg-green-500' : ''}`}
                        >
                          {isPaid 
                            ? 'Fully Paid' 
                            : isPartial 
                            ? 'Partial' 
                            : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="rounded-xl font-bold h-9"
                            onClick={() => handleGenerateInvoice(booking)}
                          >
                            <FileDown className="h-3.5 w-3.5 mr-1" />
                            Invoice
                          </Button>
                          {isPending && (
                            <Button 
                              size="sm" 
                              className="bg-success text-success-foreground hover:bg-success/90 font-black rounded-xl h-9 shadow-lg shadow-success/20 animate-pulse"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setPaymentModalOpen(true);
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              {booking.status === 'completed' ? `Pay Remaining` : 'Pay Now'}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal 
        open={paymentModalOpen} 
        onOpenChange={setPaymentModalOpen}
        booking={selectedBooking}
      />

      {/* Legacy Payment Dialog (Keeping for compatibility or refactoring later) */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Your Payment</DialogTitle>
            <DialogDescription>
              Scan the QR code to pay for your event booking
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-6 pt-4 flex flex-col items-center">
              <div className="w-full bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Event:</span>
                  <span className="font-medium">{selectedBooking.eventTitle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount Due:</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{(selectedBooking.totalPrice + (selectedBooking.additionalCost || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedBooking.billQrCode ? (
                <div className="border-4 border-primary/20 p-4 rounded-xl bg-white shadow-lg">
                  <img 
                    src={selectedBooking.billQrCode} 
                    alt="Payment QR Code" 
                    className="w-56 h-56 object-cover"
                  />
                </div>
              ) : (
                <div className="w-56 h-56 flex items-center justify-center bg-gray-100 border-2 border-dashed rounded-xl">
                  <div className="text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-2" />
                    <p className="text-sm">Contact merchant for payment details</p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handlePayment} 
                className="w-full bg-success text-success-foreground hover:bg-success/90"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Confirming...' : 'I Have Made The Payment'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Invoice Details
            </DialogTitle>
            <DialogDescription>
              Booking invoice and payment details
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">INVOICE</h2>
                    <p className="text-sm text-muted-foreground">EventPro Platform</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">#{selectedBooking.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedBooking.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Event Name</p>
                  <p className="font-semibold">{selectedBooking.eventTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Event Date</p>
                  <p className="font-semibold">
                    {new Date(selectedBooking.eventDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customer Name</p>
                  <p className="font-semibold">{selectedBooking.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Guests</p>
                  <p className="font-semibold">{selectedBooking.guests} people</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="font-semibold mb-3">Payment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base Price</span>
                    <span>₹{selectedBooking.totalPrice.toLocaleString()}</span>
                  </div>
                  {selectedBooking.additionalCost ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Additional Charges</span>
                      <span>₹{selectedBooking.additionalCost.toLocaleString()}</span>
                    </div>
                  ) : null}
                  <div className="border-t pt-2 flex justify-between font-semibold text-base">
                    <span>Total Amount</span>
                    <span>₹{(selectedBooking.totalPrice + (selectedBooking.additionalCost || 0)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Status</span>
                    <Badge 
                      variant={
                        selectedBooking.status === 'paid' || selectedBooking.status === 'completed' 
                          ? 'default' 
                          : 'secondary'
                      }
                      className="capitalize"
                    >
                      {selectedBooking.status === 'paid' || selectedBooking.status === 'completed' 
                        ? 'Paid' 
                        : 'Unpaid'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    // In real app, this would download PDF
                    toast.info("Invoice download feature coming soon!");
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={() => setInvoiceDialogOpen(false)}>
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

export default BillingPaymentsPage;
