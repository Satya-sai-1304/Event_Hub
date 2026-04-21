import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Calendar, MapPin, IndianRupee, Users, Clock, Loader2, Trash2, ShoppingCart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { type Event } from "@/data/mockData";
import BookingModal from "@/components/BookingModal";
import { toast } from "sonner";

import { useNavigate, useLocation } from "react-router-dom";

interface SavedEvent {
  _id?: string;
  id?: string;
  customerId?: string;
  eventId: string;
  eventTitle: string;
  eventImage?: string;
  image?: string;
  eventPrice?: number;
  price?: number;
  eventDate?: string;
  category?: string;
  savedAt?: string;
  location?: string;
  capacity?: number;
  status?: string;
  organizerId?: string;
  organizerName?: string;
  description?: string;
}

const SavedEventsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Fetch saved events from API
  const { data: savedEvents = [], isLoading, refetch } = useQuery({
    queryKey: ['savedEvents', user?.id],
    queryFn: async () => {
      const response = await api.get(`/saved-events?customerId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const removeMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // Find the saved event ID first
      const response = await api.get(`/saved-events?customerId=${user?.id}`);
      const savedEvent = response.data.find((saved: any) => saved.eventId === eventId);
      if (!savedEvent) throw new Error('Saved event not found');
      
      await api.delete(`/saved-events/${savedEvent.id}`);
      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedEvents'] });
      toast.success("Removed from wishlist");
    },
    onError: () => {
      toast.error("Failed to remove from wishlist");
    }
  });

  const handleBookNow = (e: Event) => {
    const id = e.id || (e as any)._id;
    let targetUrl = "";
    if (e.eventType === 'full-service') {
      targetUrl = `/book-full-service/${id}`;
    } else if (e.eventType === 'ticketed') {
      targetUrl = `/book-ticketed-event/${id}`;
    } else {
      targetUrl = `/book/event/${id}`;
    }

    if (!user) {
      toast.error("Please login to book events");
      navigate("/login", { state: { from: targetUrl } });
      return;
    }

    navigate(targetUrl);
  };

  const handleRemove = (eventId: string) => {
    removeMutation.mutate(eventId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Saved Events
        </h1>
        <p className="text-muted-foreground mt-1">Your wishlist of upcoming events</p>
      </div>

      {/* Stats */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-pink-100">
            <Heart className="h-6 w-6 text-pink-600 fill-pink-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{savedEvents.length}</p>
            <p className="text-sm text-muted-foreground">Saved Events</p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Events Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : savedEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="text-lg font-semibold mb-2">No saved events yet</h3>
            <p className="text-muted-foreground mb-4">Start exploring and save events you're interested in!</p>
            <Button onClick={() => window.location.href = '/dashboard/browse-events'}>
              Browse Events
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedEvents.map((event) => {
            const displayPrice = event.eventPrice || event.price || 0;
            const displayImage = event.eventImage || event.image || '';
            const displayId = event._id || event.id || event.eventId || '';
            const displayTitle = event.eventTitle || event.title || '';
            
            return (
              <Card key={displayId} className="group overflow-hidden hover:shadow-lg transition-all">
                <CardContent className="p-0">
                  <div className="relative aspect-video">
                    <img 
                      src={displayImage} 
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/90">
                        {event.category}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 left-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemove(event.eventId)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-lg line-clamp-1">{displayTitle}</h3>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(event.eventDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="line-clamp-1">{event.location || 'Location TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>Capacity: {event.capacity || 'N/A'} people</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1 text-primary font-bold text-lg">
                        <IndianRupee className="h-4 w-4" />
                        {displayPrice.toLocaleString()}
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleBookNow({ ...event, id: event.eventId, title: displayTitle, image: displayImage, price: displayPrice } as any)}
                      >
                        Book Now
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Saved {new Date(event.savedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Save events you're interested in to compare them later</li>
            <li>Get notified when saved events are selling fast</li>
            <li>Book directly from your wishlist when ready</li>
            <li>Remove events anytime to keep your list organized</li>
          </ul>
        </CardContent>
      </Card>

      <BookingModal 
        event={selectedEvent} 
        open={bookingOpen} 
        onOpenChange={setBookingOpen} 
      />
    </div>
  );
};

export default SavedEventsPage;
