import { type Event } from "@/data/mockData";
import EventCard from "@/components/EventCard";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const EventsListPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', user?.id, user?.role],
    queryFn: async () => {
      const params = user?.role === 'organizer' ? `?merchantId=${user.id}` : '';
      const response = await api.get<Event[]>(`/events${params}`);
      return response.data;
    },
    enabled: !!user?.id
  });

  const filteredEvents = events || [];

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

  const notifyMutation = useMutation({
    mutationFn: async (event: Event) => {
      await api.post(`/events/${event.id}/notify-attendees`, {
        title: `Update for ${event.title} 🔔`,
        message: `The organizer has sent an update regarding the event "${event.title}". Please check for more details!`
      });
    },
    onSuccess: () => {
      toast.success("Notification sent to all attendees!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send notification");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">
        <CalendarDays className="inline h-6 w-6 mr-2 text-primary" />
        {user?.role === 'admin' ? "Live Events" : "All Events"}
      </h1>
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredEvents?.length === 0 && (
            <p className="text-muted-foreground col-span-3 py-8">No events found.</p>
          )}
          {filteredEvents?.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showActions={user?.role === 'admin' ? "admin" : "organizer"}
              onEdit={() => navigate(`/dashboard/events/edit/${event.id}`)}
              onDelete={() => deleteMutation.mutate(event.id)}
              onNotify={() => notifyMutation.mutate(event)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsListPage;
