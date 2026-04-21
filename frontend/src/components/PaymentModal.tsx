import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Booking } from "@/data/mockData";
import { toast } from "sonner";
import { Calendar, MapPin, IndianRupee, Ticket, Tag, CheckCircle, Download, Loader2, Gift, CreditCard, Smartphone, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@radix-ui/react-tabs";

// Payment Method Icons
const UPIIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 16.5L12 12M12 12L16.5 7.5M12 12L7.5 7.5M12 12L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const PhonePeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
    <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="currentColor"/>
  </svg>
);

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentModalProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Available coupons
const COUPONS = [
  { code: "EVENT500", discount: 500, minOrder: 5000, description: "₹500 off on orders above ₹5000" },
  { code: "GRAND10", discountPercent: 10, minOrder: 10000, description: "10% off on orders above ₹10000" },
  { code: "FIRSTBOOK", discount: 1000, minOrder: 3000, description: "₹1000 off on your first booking" },
];

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

const PaymentModal = ({ booking, open, onOpenChange }: PaymentModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("upi");
  const [upiOption, setUpiOption] = useState<string | null>(null);
  const [walletOption, setWalletOption] = useState<string | null>(null);

  const isPaymentMethodSelected = (
    (selectedPaymentMethod === 'upi' && upiOption !== null) ||
    (selectedPaymentMethod === 'card') || // Add validation for card fields
    (selectedPaymentMethod === 'netbanking') || // Add validation for netbanking
    (selectedPaymentMethod === 'wallet' && walletOption !== null)
  );

  const { data: serverCoupons = [] } = useQuery({
    queryKey: ['coupons', booking?.organizerId, booking?.eventId, booking?.eventType],
    queryFn: async () => {
      // Determine applicableType for filtering
      let applicableType = 'ALL';
      let categoryId = undefined;
      let serviceId = undefined;
      
      if (booking?.eventType === 'full-service') {
        applicableType = 'SERVICE';
      } else if (booking?.eventType === 'ticketed') {
        applicableType = 'EVENT';
      }
      
      const response = await api.get<any[]>(`/coupons`, {
        params: {
          merchantId: booking?.organizerId,
          eventId: booking?.eventType === 'ticketed' ? booking?.eventId : undefined,
          categoryId: categoryId,
          serviceId: serviceId,
          applicableType: applicableType
        }
      });
      return response.data;
    },
    enabled: open && !!booking?.organizerId,
  });

  const paymentMutation = useMutation({
    mutationFn: async (paymentDetails: any) => {
      if (!booking) throw new Error("No booking");
      const currentBaseAmount = booking.finalAmount || (booking.totalPrice + (booking.additionalCost || 0));
      let currentDiscountAmount = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
          currentDiscountAmount = Math.round((currentBaseAmount * appliedCoupon.discountValue) / 100);
        } else if (appliedCoupon.discountValue) {
          currentDiscountAmount = appliedCoupon.discountValue;
        }
      }
      const currentFinalAmount = Math.max(0, currentBaseAmount - currentDiscountAmount);
      
      // Determine new status and payment status
      let newStatus = booking.status;
      let newPaymentStatus = "paid";
      let updatedAdvancePaid = (booking as any).advancePaid || 0;
      let totalAmount = booking.finalAmount || (booking.totalPrice + (booking.additionalCost || 0));
      
      // Calculate final amount after potential discount
      currentDiscountAmount = 0;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
          currentDiscountAmount = Math.round((totalAmount * appliedCoupon.discountValue) / 100);
        } else if (appliedCoupon.discountValue) {
          currentDiscountAmount = appliedCoupon.discountValue;
        }
      }
      let updatedFinalAmount = Math.max(0, totalAmount - currentDiscountAmount);

      if (booking.status === 'approved') {
        // This was an advance payment
        newStatus = "confirmed";
        newPaymentStatus = "partial";
        updatedAdvancePaid = booking.advanceAmount || 0;
        // Keep final amount updated with discount if any
      } else if (booking.status === 'completed' && booking.paymentStatus === 'partial') {
        // This was the final payment
        newStatus = "completed";
        newPaymentStatus = "paid";
        updatedAdvancePaid = updatedFinalAmount; // Now fully paid
      } else if (booking.status === 'bill_sent' || booking.status === 'payment_pending') {
        // Final bill payment
        newStatus = "completed";
        newPaymentStatus = "paid";
        updatedAdvancePaid = updatedFinalAmount;
      } else if (booking.eventType === 'ticketed') {
        // Ticketed events are paid in full immediately
        newStatus = "confirmed";
        newPaymentStatus = "paid";
        updatedAdvancePaid = updatedFinalAmount;
      }
      
      const response = await api.patch(`/bookings/${booking.id}`, {
        status: newStatus,
        paymentStatus: newPaymentStatus,
        finalAmount: updatedFinalAmount,
        advancePaid: updatedAdvancePaid,
        couponCode: appliedCoupon?.couponCode,
        couponDiscount: currentDiscountAmount,
        paymentId: paymentDetails.razorpay_payment_id,
        receiptUrl: paymentDetails.receipt_url,
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setPaymentData(data);
      setShowReceipt(true);
      toast.success("Payment successful! Your booking is confirmed.");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Payment failed. Please try again.");
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await api.get<any[]>('/services');
      return response.data;
    },
    enabled: open && booking?.eventType === 'full-service',
  });

  const getServiceName = (id: string) => {
    const service = services.find(s => (s._id || s.id) === id);
    return service ? service.name : 'Not selected';
  };

  const handleQRPaymentDone = () => {
    paymentMutation.mutate({
      razorpay_payment_id: `qr_pay_${Date.now()}`,
      receipt_url: `#qr-receipt-${Date.now()}`,
    });
  };

  // Reset state when modal opens/closes
  useEffect(() => {
   if (!open) {
     setCouponCode("");
     setAppliedCoupon(null);
     setShowReceipt(false);
     setPaymentData(null);
    }
  }, [open]);

  // Early return AFTER all hooks
  if (!booking) return null;

  const isFullService = booking.eventType === 'full-service';
  
  // Logic for dynamic base amount based on status
  let baseAmount = booking.finalAmount || (booking.totalPrice + (booking.additionalCost || 0));
  
  // If it's an advance payment request
  if (booking.status === 'approved' && booking.advanceAmount) {
    baseAmount = booking.advanceAmount;
  } 
  // If it's a final payment request after completion
  else if (booking.status === 'completed' && booking.paymentStatus === 'partial') {
    const total = booking.finalAmount || (booking.totalPrice + (booking.additionalCost || 0));
    const advancePaid = (booking as any).advancePaid || 0;
    baseAmount = Math.max(0, total - advancePaid);
  }
  
  // Calculate discount (Coupons removed from UI, but keeping logic for backward compatibility if needed)
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round((baseAmount * appliedCoupon.discountValue) / 100);
    } else if (appliedCoupon.discountValue) {
      discountAmount = appliedCoupon.discountValue;
    }
  }
  
  const finalAmount = Math.max(0, baseAmount - discountAmount);

  const handleApplyCoupon = async () => {
    if (!couponCode) {
      toast.error("Please enter a coupon code");
      return;
    }
    
    // Determine applicableType based on booking data
    let applicableType = 'ALL';
    let categoryId = undefined;
    let serviceId = undefined;
    let serviceIds = undefined;
    
    if (booking?.eventType === 'full-service') {
      // This is a service-based booking
      applicableType = 'SERVICE';
      // Get service IDs from selectedServices if available
      if (booking.selectedServices) {
        serviceIds = Object.values(booking.selectedServices).filter(Boolean);
      }
    } else {
      // This is an event-based booking
      applicableType = 'EVENT';
      // If there's a category associated with the event, include it
      categoryId = (booking as any)?.categoryId || (booking as any)?.event?.categoryId;
    }
    
    try {
      const response = await api.post('/coupons/validate', {
        code: couponCode.toUpperCase(),
        orderAmount: baseAmount,
        userId: user?.id || user?._id,
        merchantId: booking?.organizerId,
        eventId: booking?.eventType === 'ticketed' ? booking?.eventId : undefined,
        categoryId: categoryId,
        serviceId: serviceId,
        serviceIds: serviceIds,
        applicableType: applicableType
      });
      const coupon = response.data;
      setAppliedCoupon(coupon);
      
      let discountVal = 0;
      if (coupon.discountType === 'percentage') {
        discountVal = Math.round((baseAmount * coupon.discountValue) / 100);
      } else {
        discountVal = coupon.discountValue;
      }
      
      toast.success(`Coupon applied! You save ₹${discountVal.toLocaleString()}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid coupon code");
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error("Please log in to make payment");
      return;
    }

    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_your_key_here";
    
    // For development/testing: if key is placeholder, use mock payment
    if (razorpayKey === "rzp_test_your_key_here") {
      toast.info("Using mock payment for development (No real Razorpay key found)");
      setTimeout(() => {
        paymentMutation.mutate({
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_order_id: `order_mock_${Date.now()}`,
          razorpay_signature: "mock_signature",
          receipt_url: `#receipt-mock-${Date.now()}`,
        });
      }, 1500);
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Razorpay SDK failed to load");
      return;
    }

    // Create order on server (mock - in real app, call your backend)
    const options = {
      key: razorpayKey, 
      amount: finalAmount * 100, // Amount in paise
      currency: "INR",
      name: "EventPro",
      description: `Booking for ${booking.eventTitle}`,
      image: "https://your-logo-url.com/logo.png",
      handler: function (response: any) {
        // Payment successful
        paymentMutation.mutate({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          receipt_url: `#receipt-${Date.now()}`, // Mock receipt URL
        });
      },
      prefill: {
        name: user.name,
        email: user.email,
        contact: "9999999999", // You should collect this from user profile
      },
      notes: {
        booking_id: booking.id,
        event_id: booking.eventId,
      },
      theme: {
        color: "#8b5cf6",
      },
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();

    razorpay.on("payment.failed", function (response: any) {
      toast.error(`Payment failed: ${response.error.description}`);
    });
  };

  const handleDownloadReceipt = () => {
    // Generate receipt content
    const receiptContent = `
EVENTPRO - BOOKING RECEIPT
============================
Receipt No: ${paymentData?.paymentId || 'PENDING'}
Date: ${new Date().toLocaleDateString('en-IN')}

EVENT DETAILS
-------------
Event: ${booking.eventTitle}
Date: ${new Date(booking.eventDate).toLocaleDateString('en-IN')}
Guests: ${booking.guests}

CUSTOMER DETAILS
----------------
Name: ${booking.customerName}
Email: ${booking.customerEmail}

PAYMENT DETAILS
---------------
Base Amount: ₹${booking.totalPrice.toLocaleString()}
${booking.additionalCost ? `Additional Charges: ₹${booking.additionalCost.toLocaleString()}` : ''}
${appliedCoupon ? `Coupon Applied (${appliedCoupon.couponCode}): -₹${discountAmount.toLocaleString()}` : ''}
----------------------------------------
TOTAL PAID: ₹${finalAmount.toLocaleString()}

Status: PAID ✅

Thank you for booking with EventPro!
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${booking.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Receipt downloaded!");
  };

  // Receipt view after payment
  if (showReceipt && paymentData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <DialogTitle className="text-center font-display text-xl">Payment Successful!</DialogTitle>
            <DialogDescription className="text-center">
              Your booking has been confirmed
            </DialogDescription>
          </DialogHeader>
          
          <Card className="mt-4 bg-muted/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Event</span>
                <span className="font-medium text-right">{booking.eventTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-medium">{paymentData.paymentId?.slice(-12) || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-lg">₹{finalAmount.toLocaleString()}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon Savings</span>
                  <span>-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 mt-4">
            <Button onClick={handleDownloadReceipt} className="flex-1" variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download Receipt
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1 gradient-primary">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {isFullService ? 'Final Payment' : 'Complete Your Payment'}
          </DialogTitle>
          <DialogDescription>
          {booking.billQrCode ? 'Review your event bill and pay via QR code.' : 'Securely pay for your event tickets'}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-2">
        {/* Booking Summary */}
        <Card className="bg-muted/50 border-none">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-base">{booking.eventTitle}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" /> {new Date(booking.eventDate).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline">{booking.eventType === 'full-service' ? 'Full Service' : 'Ticket'}</Badge>
            </div>

            {isFullService && booking.selectedServices && (
              <div className="border-t border-dashed pt-2 space-y-1">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Included Services</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><span>Decoration:</span> <span className="font-medium">{getServiceName(booking.selectedServices.decoration)}</span></div>
                  <div className="flex justify-between"><span>Catering:</span> <span className="font-medium">{getServiceName(booking.selectedServices.catering)}</span></div>
                  <div className="flex justify-between"><span>Music:</span> <span className="font-medium">{getServiceName(booking.selectedServices.music)}</span></div>
                  <div className="flex justify-between"><span>Lighting:</span> <span className="font-medium">{getServiceName(booking.selectedServices.lighting)}</span></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {booking.billQrCode ? (
          <div className="flex flex-col items-center gap-4 p-6 border rounded-xl bg-white shadow-sm">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-1">Scan to Pay</p>
                <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <IndianRupee className="h-6 w-6" /> {finalAmount.toLocaleString()}
                </p>
              </div>
              
              <div className="p-2 border-2 border-primary/20 rounded-lg">
                <img src={booking.billQrCode} alt="Payment QR Code" className="w-48 h-48 object-contain" />
              </div>
              
              <div className="w-full space-y-3">
                <p className="text-xs text-center text-muted-foreground">
                  After successful payment, please click the button below to notify the merchant.
                </p>
                <Button 
                  className="w-full gradient-primary text-primary-foreground font-bold"
                  onClick={handleQRPaymentDone}
                  disabled={paymentMutation.isPending}
                >
                  {paymentMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle className="mr-2 h-4 w-4" /> I Have Paid Bill</>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
            {/* Payment Details for Ticketed Events */}
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₹{baseAmount.toLocaleString()}</span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> Coupon: {appliedCoupon.couponCode}</span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>Total Payable</span>
                  <span className="flex items-center gap-1 text-primary">
                    <IndianRupee className="h-5 w-5" />
                    {finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="space-y-4 pt-2">
                <p className="text-sm font-semibold">Select Payment Method</p>
                <Tabs defaultValue="upi">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="upi">UPI</TabsTrigger>
                    <TabsTrigger value="cards">Cards</TabsTrigger>
                    <TabsTrigger value="netbanking">Net Banking</TabsTrigger>
                    <TabsTrigger value="wallets">Wallets</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upi" className="mt-4">
                    <p className="text-xs text-muted-foreground mb-3">Select your preferred UPI app to pay</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant={upiOption === 'googlepay' ? "secondary" : "outline"} 
                        className={`h-12 justify-start gap-2 ${upiOption === 'googlepay' ? 'border-primary ring-1 ring-primary' : ''}`} 
                        onClick={() => {
                          setSelectedPaymentMethod('upi');
                          setUpiOption('googlepay');
                        }}
                      >
                        <img src="https://cdn.iconscout.com/icon/free/png-256/google-pay-2038779-1721670.png" alt="Google Pay" className="h-6 w-6"/>
                        Google Pay
                      </Button>
                      <Button 
                        variant={upiOption === 'phonepe' ? "secondary" : "outline"} 
                        className={`h-12 justify-start gap-2 ${upiOption === 'phonepe' ? 'border-primary ring-1 ring-primary' : ''}`} 
                        onClick={() => {
                          setSelectedPaymentMethod('upi');
                          setUpiOption('phonepe');
                        }}
                      >
                        <img src="https://cdn.iconscout.com/icon/free/png-256/phonepe-2085059-1753791.png" alt="PhonePe" className="h-6 w-6"/>
                        PhonePe
                      </Button>
                      <Button 
                        variant={upiOption === 'paytm' ? "secondary" : "outline"} 
                        className={`h-12 justify-start gap-2 ${upiOption === 'paytm' ? 'border-primary ring-1 ring-primary' : ''}`} 
                        onClick={() => {
                          setSelectedPaymentMethod('upi');
                          setUpiOption('paytm');
                        }}
                      >
                        <img src="https://cdn.iconscout.com/icon/free/png-256/paytm-226444.png" alt="Paytm" className="h-6 w-6"/>
                        Paytm
                      </Button>
                      <Button 
                        variant={upiOption === 'any' ? "secondary" : "outline"} 
                        className={`h-12 justify-start gap-2 ${upiOption === 'any' ? 'border-primary ring-1 ring-primary' : ''}`} 
                        onClick={() => {
                          setSelectedPaymentMethod('upi');
                          setUpiOption('any');
                        }}
                      >
                        <UPIIcon />
                        Any UPI ID
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="cards" className="mt-4">
                    <p className="text-xs text-muted-foreground">Card payments are currently disabled.</p>
                  </TabsContent>
                  <TabsContent value="netbanking" className="mt-4">
                    <p className="text-xs text-muted-foreground">Net banking is currently disabled.</p>
                  </TabsContent>
                  <TabsContent value="wallets" className="mt-4">
                    <p className="text-xs text-muted-foreground">Wallet payments are currently disabled.</p>
                  </TabsContent>
                </Tabs>
              </div>

              <Button 
                className="w-full gradient-primary text-primary-foreground font-bold mt-6 h-12 text-lg shadow-lg shadow-primary/20"
                onClick={handlePayment}
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><IndianRupee className="mr-2 h-4 w-4" /> Pay Now</>
                )}
              </Button>
            </>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-green-500" /> Secure Payment Powered by Razorpay
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;