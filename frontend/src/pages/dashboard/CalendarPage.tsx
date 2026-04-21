import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, MapPin, Filter, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import CalendarView from "@/components/CalendarView";

interface Booking {
  id: string;
  eventTitle: string;
  eventDate: string;
  location?: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  eventDate: string;
  location?: string;
  status: string;
}

const CalendarPage = () => {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');

  // Fetch bookings for calendar events
  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn: async () => {
      const param = user?.role === 'organizer' ? `organizerId=${user?.id}` : `customerId=${user?.id}`;
      const response = await api.get(`/bookings?${param}`);
      return response.data;
    },
    enabled: !!user,
  });

  // Fetch all events from database
  const { data: events = [] } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      const response = await api.get<Event[]>(`/events?merchantId=${user?.id}`);
      return response.data;
    },
    enabled: !!user,
  });

  // Transform bookings into calendar events
  const bookingEvents = bookings.map((booking: Booking) => ({
    date: new Date(booking.eventDate),
    title: booking.eventTitle,
    type: 'booking' as const,
    location: booking.location,
    time: new Date(booking.eventDate).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    status: booking.status,
  }));

  // Transform events into calendar events
  const eventEvents = events.map((event: Event) => ({
    date: new Date(event.eventDate),
    title: event.title,
    type: 'event' as const,
    location: event.location,
    time: new Date(event.eventDate).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    status: event.status,
  }));

  // Combine both bookings and events
  const calendarEvents = [...bookingEvents, ...eventEvents];

  // Filter events based on selected filter
  const filteredEvents = calendarEvents.filter((event: any) => {
    const now = new Date();
    const eventDate = event.date;
    
    if (filterType === 'upcoming') {
      return eventDate >= now;
    } else if (filterType === 'past') {
      return eventDate < now;
    }
    return true;
  });

  // Stats
  const stats = {
    total: bookings.length,
    upcoming: bookings.filter((b: any) => new Date(b.eventDate) >= new Date()).length,
    past: bookings.filter((b: any) => new Date(b.eventDate) < new Date()).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-primary" />
          Event Calendar
        </h1>
        <p className="text-muted-foreground mt-1">View and manage your scheduled events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <CalendarIcon className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.upcoming}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CalendarIcon className="h-6 w-6 mx-auto mb-2 text-gray-500" />
            <p className="text-2xl font-bold">{stats.past}</p>
            <p className="text-xs text-muted-foreground">Past Events</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('all')}
        >
          All
        </Button>
        <Button
          variant={filterType === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filterType === 'past' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterType('past')}
        >
          Past
        </Button>
        <Button variant="outline" size="sm" className="ml-auto">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Calendar View */}
      <CalendarView events={filteredEvents} />

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📅 Calendar Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Click on any date to view detailed events for that day</li>
            <li>Blue dots indicate booked events on the calendar</li>
            <li>Use filters to quickly find upcoming or past events</li>
            <li>Export your calendar to sync with other applications</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
