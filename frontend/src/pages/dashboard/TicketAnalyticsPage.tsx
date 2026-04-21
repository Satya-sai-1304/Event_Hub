import { useAuth } from "@/contexts/AuthContext";
import { type Event, type Booking } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ticket, IndianRupee, TrendingUp, CheckCircle, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { motion } from "framer-motion";
import StatsCard from "@/components/StatsCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TicketAnalyticsPage = () => {
  const { user } = useAuth();

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>('/bookings');
      return response.data;
    },
  });

  const myEvents = events?.filter((e) => e.organizerId === user?.id) || [];
  const myTicketedEvents = myEvents.filter(e => e.eventType === 'ticketed');

  const ticketedBookings = bookings?.filter(b => 
    b.organizerId === user?.id && 
    b.eventType === 'ticketed' && 
    (b.status === 'paid' || b.status === 'confirmed')
  ) || [];
  const totalTicketsSold = ticketedBookings.reduce((sum, b) => {
    if (b.selectedTickets && Array.isArray(b.selectedTickets)) {
      return sum + b.selectedTickets.reduce((tSum: number, t: any) => tSum + (Number(t.quantity) || 0), 0);
    }
    return sum + (Number((b as any).quantity) || Number(b.guests) || 0);
  }, 0);
  const totalTicketRevenue = ticketedBookings.reduce((sum, b) => sum + ((b as any).totalAmount || b.totalPrice || 0), 0);
  
  const remainingTickets = myTicketedEvents.reduce((sum, e) => {
    return sum + (e.ticketTypes?.reduce((tSum: number, t: any) => tSum + (t.remainingQuantity || 0), 0) || 0);
  }, 0);
  
  const soldOutEventsCount = myTicketedEvents.filter(e => 
    (e as any).isSoldOut || (e.ticketTypes?.length > 0 && e.ticketTypes.every((t: any) => t.remainingQuantity <= 0))
  ).length;

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

  const isLoading = eventsLoading || bookingsLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <motion.div 
      className="space-y-8" 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-2">
        <Ticket className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Ticket Analytics</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Tickets Sold" value={totalTicketsSold} icon={Ticket} color="text-primary" delay={0.1} />
        <StatsCard label="Ticket Revenue" value={`₹${totalTicketRevenue.toLocaleString()}`} icon={IndianRupee} color="text-success" delay={0.2} />
        <StatsCard label="Remaining Tickets" value={remainingTickets} icon={TrendingUp} color="text-secondary" delay={0.3} />
        <StatsCard label="Sold Out Events" value={soldOutEventsCount} icon={CheckCircle} color="text-accent" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-0 shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sales by Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketSalesByEvent}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="sold" fill="#9333ea" radius={[4, 4, 0, 0]} name="Tickets Sold" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-0 shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Detailed Sales Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Name</TableHead>
                    <TableHead>Sales Progress</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketSalesByEvent.map((item, index) => {
                    const event = myTicketedEvents.find(e => e.title === item.name);
                    const totalTickets = event?.ticketTypes?.reduce((sum: number, t: any) => sum + t.quantity, 0) || 0;
                    const progress = totalTickets > 0 ? (item.sold / totalTickets) * 100 : 0;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="min-w-[150px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-medium">
                              <span>{Math.round(progress)}%</span>
                              <span>{item.sold}/{totalTickets}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.sold}</TableCell>
                        <TableCell className="text-right">₹{item.revenue.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                  {ticketSalesByEvent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No ticketed events found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default TicketAnalyticsPage;
