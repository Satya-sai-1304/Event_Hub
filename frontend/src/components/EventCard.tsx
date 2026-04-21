import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Event } from "@/data/mockData";
import { Calendar, MapPin, Users, IndianRupee, Info, Heart, Ticket, Share2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface EventCardProps {
  event: Event;
  onBook?: (event: Event) => void;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onCancel?: (event: Event) => void;
  onNotify?: (event: Event) => void;
  onViewDetails?: (event: Event) => void;
  showActions?: "customer" | "organizer" | "admin";
}

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase",
  live: "bg-red-600 text-white hover:bg-red-600 border-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase animate-pulse",
  completed: "bg-muted text-muted-foreground hover:bg-muted border-0 rounded-full px-3 py-1 text-[10px] font-medium lowercase",
  cancelled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border-0 rounded-full px-3 py-1 text-[10px] font-medium uppercase",
};

const EventCard = ({ event, onBook, onEdit, onDelete, onCancel, onNotify, onViewDetails, showActions = "customer" }: EventCardProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(false);

  // Check if event is already saved when component mounts
  const checkIfSaved = async () => {
    if (!user || !event.id) return false;
    try {
      const response = await api.get(`/saved-events?customerId=${user.id}`);
      return response.data.some((saved: any) => saved.eventId === event.id);
    } catch {
      return false;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !event) throw new Error("Missing user or event");
      const response = await api.post('/saved-events', {
        customerId: user.id,
        eventId: event.id,
        eventTitle: event.title,
        eventImage: event.image,
        eventPrice: event.price,
        eventDate: event.eventDate,
        category: event.category,
      });
      return response.data;
    },
    onSuccess: () => {
      setIsSaved(true);
      queryClient.invalidateQueries({ queryKey: ['savedEvents'] });
      toast.success("Event saved to wishlist!");
    },
    onError: (err: any) => {
      if (err.response?.status !== 400) {
        toast.error("Failed to save event");
      }
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (savedEventId: string) => {
      await api.delete(`/saved-events/${savedEventId}`);
      return savedEventId;
    },
    onSuccess: () => {
      setIsSaved(false);
      queryClient.invalidateQueries({ queryKey: ['savedEvents'] });
      toast.success("Removed from wishlist");
    },
    onError: () => {
      toast.error("Failed to remove event");
    }
  });

  const toggleSaveEvent = async () => {
    if (!user) {
      toast.error("Please login to save events");
      return;
    }

    if (isSaved) {
      // Find the saved event ID and remove it
      try {
        const response = await api.get(`/saved-events?customerId=${user.id}`);
        const savedEvent = response.data.find((saved: any) => saved.eventId === event.id);
        if (savedEvent) {
          removeMutation.mutate(savedEvent.id);
        }
      } catch {
        toast.error("Failed to remove event");
      }
    } else {
      saveMutation.mutate();
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/events/${event.id || (event as any)._id}`;
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Event link copied to clipboard!");
      });
    }
  };

  const isSoldOut = (event as any).isSoldOut || ((event as any).ticketTypes?.length > 0 && (event as any).ticketTypes.every((t: any) => t.remainingQuantity <= 0));
  const isFullService = (event as any).eventType === 'full-service';

  const handleViewDetails = () => {
    if (user?.id) {
      api.post(`/users/${user.id}/activity`, {
        eventId: event.id || (event as any)._id,
        type: 'click',
        category: event.category
      }).catch(console.error);
    }
    onViewDetails?.(event);
  };

  const handleBookClick = () => {
    if (user?.id) {
      api.post(`/users/${user.id}/activity`, {
        eventId: event.id || (event as any)._id,
        type: 'click',
        category: event.category
      }).catch(console.error);
    }
    onBook?.(event);
  };

  return (
    <Card className="group overflow-hidden rounded-2xl border-0 bg-white shadow-sm hover:shadow-xl transition-all duration-300 active:scale-[0.98] h-full flex flex-col">
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-gray-100 cursor-pointer" onClick={handleViewDetails}>
        <img 
          src={event.image || "/placeholder.svg"} 
          alt={event.title} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          {isSoldOut ? (
            <Badge variant="destructive" className="bg-red-600 text-white border-0 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase shadow-lg">
              SOLD OUT
            </Badge>
          ) : (
            <Badge className={`${statusColors[event.status || 'upcoming'] || statusColors.upcoming} shadow-lg rounded-lg px-2 py-0.5 text-[9px]`}>
              {isFullService && (event.status || 'upcoming') === 'live' ? 'Active' : (event.status || 'upcoming')}
            </Badge>
          )}
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white transition-all"
          onClick={(e) => {
            e.stopPropagation();
            toggleSaveEvent();
          }}
        >
          <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </Button>

        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[8px] text-white/70 font-bold uppercase tracking-wider">
                {(event as any).eventType === 'ticketed' ? 'Tickets From' : 'Starting From'}
              </span>
              <span className="text-white font-black text-sm flex items-center">
                <IndianRupee className="h-3 w-3" />
                {event.price?.toLocaleString()}
              </span>
            </div>
            {(event as any).rating > 0 && (
              <div className="flex items-center gap-1 bg-green-500 text-white px-1.5 py-0.5 rounded-lg text-[10px] font-bold shadow-lg">
                <span>{(event as any).rating}</span>
                <span className="text-[8px]">★</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-3 flex flex-col flex-1 bg-white">
        <div className="mb-2">
          <h3 className="font-display font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-primary transition-colors h-5 mb-0.5" title={event.title}>
            {event.title}
          </h3>
          <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{event.category}</p>
        </div>

        <div className="space-y-1 mb-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] font-medium">
              {new Date(event.eventDate).toLocaleDateString('en-IN', {
                day: 'numeric', 
                month: 'short'
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span className="text-[10px] font-medium line-clamp-1">{event.location}</span>
          </div>
        </div>

        <div className="mt-auto pt-2 border-t border-gray-100 grid grid-cols-2 gap-1.5">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 text-[10px] h-8 font-bold"
            onClick={handleViewDetails}
          >
            {t('details')}
          </Button>
          <Button 
            size="sm"
            className="rounded-xl gradient-primary text-white shadow-md hover:shadow-lg transition-all text-[10px] h-8 font-bold border-none"
            onClick={handleBookClick}
          >
            {t('book_now')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventCard;
