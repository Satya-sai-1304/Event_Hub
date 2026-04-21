import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Event } from "@/data/mockData";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, MapPin, Users, CalendarDays, Loader2, IndianRupee, Eye, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const LiveEventsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (isAdmin) return; // Read-only for admin
      return await api.patch(`/events/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success("Event status updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update event");
    },
  });

  // Filter events based on role
  const roleFilteredEvents = events?.filter((e) => {
    if (isAdmin) return true;
    return e.organizerId === user?.id;
  }) || [];

  // Live events = events happening today or marked as "live"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcomingEvents = roleFilteredEvents.filter((e) => e.status === "upcoming" && e.eventType === "ticketed");
  const liveEvents = roleFilteredEvents.filter((e) => e.status === "live" && e.eventType === "ticketed");
  const otherEvents = roleFilteredEvents.filter((e) => (e.status === "completed" || e.status === "cancelled") && e.eventType === "ticketed");

  const allEvents = roleFilteredEvents.filter((e) => 
    (e.status === "upcoming" || e.status === "live" || e.status === "completed" || e.status === "cancelled") && e.eventType === "ticketed"
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-500 animate-pulse" />
            Live Events {isAdmin && <Badge variant="outline" className="ml-2 font-normal">Read Only</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Monitoring all ongoing events across the platform" : "Monitor your ongoing and today's events in real time"}
          </p>
        </div>
        {isAdmin && (
          <div className="bg-amber-50 border border-amber-200 p-2 rounded-md flex items-center gap-2 text-amber-700 text-xs">
            <ShieldAlert className="h-4 w-4" />
            <span>Admin view is read-only. Only merchants can mark events as live.</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-100 text-red-600">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-red-600">{liveEvents.length}</p>
              <p className="text-sm text-red-500">Live Now</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-orange-600">{upcomingEvents.length}</p>
              <p className="text-sm text-orange-500">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100 text-green-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-green-600">{otherEvents.filter(e => e.status === 'completed').length}</p>
              <p className="text-sm text-green-500">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{allEvents.length}</p>
              <p className="text-sm text-muted-foreground">Total Events</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Events Section */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
          Live Events
        </h2>
        {liveEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Radio className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No events are live right now.</p>
              <p className="text-sm mt-1">Mark an upcoming event as live to see it here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {liveEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden border-red-200 shadow-md">
                <div className="relative h-40 overflow-hidden">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 flex gap-2 items-center">
                    <Badge className="bg-red-600 text-white border-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE EVENT
                    </Badge>
                    <Badge variant="secondary" className="bg-white/80 text-gray-800">{event.category}</Badge>
                  </div>
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-display font-semibold">{event.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location.split(",")[0]}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.capacity} capacity</span>
                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{event.price.toLocaleString()}</span>
                  </div>
                  {!isAdmin && (
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full text-xs mt-2 bg-green-600 hover:bg-green-700"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: event.id, status: "completed" })}
                    >
                      Mark as Completed
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Events Section */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          Upcoming Events ({upcomingEvents.length})
        </h2>
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>No upcoming events scheduled.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-36 overflow-hidden">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 left-2 bg-blue-600 text-white border-0 capitalize">
                    {event.status}
                  </Badge>
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-display font-semibold">{event.title}</h3>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location.split(",")[0]}</span>
                  </div>
                  {!isAdmin && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-red-600 hover:bg-red-700 text-white"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: event.id, status: "live" })}
                      >
                        Mark as Live
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: event.id, status: "cancelled" })}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Other Events Section (Completed/Cancelled) */}
      {otherEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
            <ShieldAlert className="h-5 w-5" />
            Past Events ({otherEvents.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 opacity-70">
            {otherEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <div className="relative h-36 overflow-hidden grayscale">
                  <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                  <Badge className={`absolute top-2 left-2 border-0 capitalize ${event.status === 'completed' ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
                    {event.status}
                  </Badge>
                </div>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-display font-semibold">{event.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveEventsPage;
