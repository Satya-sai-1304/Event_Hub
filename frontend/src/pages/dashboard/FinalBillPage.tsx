import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Booking } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, IndianRupee } from 'lucide-react';

const FinalBillPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: async () => {
      const response = await api.get<Booking>(`/bookings/${bookingId}`);
      return response.data;
    },
    enabled: !!bookingId,
  });

  if (isLoading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  if (!booking) {
    return <div className="text-center py-20">Booking not found.</div>;
  }

  const { billingDetails } = booking;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <Card className="glass-card shadow-xl">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Final Bill for {booking.eventTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="font-semibold">Booking ID:</span> #{booking.id.slice(-6).toUpperCase()}</div>
            <div><span className="font-semibold">Customer:</span> {booking.customerName}</div>
            <div><span className="font-semibold">Event Date:</span> {new Date(booking.eventDate).toLocaleDateString()}</div>
            <div><span className="font-semibold">Guests:</span> {booking.guests}</div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-semibold text-lg mb-4">Bill Details</h4>
            <div className="space-y-2">
              <div className="flex justify-between"><p>Base Price:</p> <p>₹{booking.totalPrice.toLocaleString()}</p></div>
              {billingDetails?.decorationCost && <div className="flex justify-between"><p>Decoration:</p> <p>₹{billingDetails.decorationCost.toLocaleString()}</p></div>}
              {billingDetails?.cateringCost && <div className="flex justify-between"><p>Catering:</p> <p>₹{billingDetails.cateringCost.toLocaleString()}</p></div>}
              {billingDetails?.musicCost && <div className="flex justify-between"><p>Music:</p> <p>₹{billingDetails.musicCost.toLocaleString()}</p></div>}
              {billingDetails?.lightingCost && <div className="flex justify-between"><p>Lighting:</p> <p>₹{billingDetails.lightingCost.toLocaleString()}</p></div>}
              {billingDetails?.additionalCharges && <div className="flex justify-between"><p>Additional Charges:</p> <p>₹{billingDetails.additionalCharges.toLocaleString()}</p></div>}
              <div className="border-t my-2"></div>
              {billingDetails?.subtotal && <div className="flex justify-between font-medium"><p>Subtotal:</p> <p>₹{billingDetails.subtotal.toLocaleString()}</p></div>}
              {billingDetails?.tax && <div className="flex justify-between"><p>Tax (18% GST):</p> <p>₹{billingDetails.tax.toLocaleString()}</p></div>}
              <div className="border-t my-2"></div>
              {(booking.finalAmount || billingDetails?.finalTotal) && (
                <div className="flex justify-between text-xl font-bold">
                  <p>Total Amount:</p> 
                  <p>₹{(booking.finalAmount || (booking.totalPrice + (billingDetails?.finalTotal || 0))).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {booking.billQrCode && (
            <div className="text-center pt-6">
              <h4 className="font-semibold text-lg mb-4">Scan to Pay</h4>
              <img src={booking.billQrCode} alt="Payment QR Code" className="mx-auto w-48 h-48 object-contain" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button className="gradient-primary text-primary-foreground">Pay Now</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FinalBillPage;
