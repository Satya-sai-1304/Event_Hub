import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Event } from "@/data/mockData";
import { Calendar, MapPin, Users, IndianRupee, Star, Clock, Tag, CheckCircle2, Play, ExternalLink } from "lucide-react";
import CountdownTimer from "@/components/CountdownTimer";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useMemo } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface EventDetailModalProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: (event: Event) => void;
}

// Category-based sample images for events
const categoryImages: Record<string, string[]> = {
  Wedding: [
    "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    "https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800&q=80",
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
  ],
  Music: [
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80",
  ],
  Corporate: [
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
    "https://images.unsplash.com/photo-1560523159-4a9692d222ef?w=800&q=80",
  ],
  Birthday: [
    "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80",
    "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=800&q=80",
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
  ],
  Cultural: [
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80",
    "https://images.unsplash.com/photo-1578736641330-3155e606cd40?w=800&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  ],
  Sports: [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80",
  ],
};

const defaultImages = [
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
];

const EventDetailModal = ({ event, open, onOpenChange, onBook }: EventDetailModalProps) => {
  const { t } = useLanguage();
  if (!event) return null;

  const galleryImages = (event.images && event.images.length > 0) 
    ? event.images 
    : (categoryImages[event.category] || defaultImages);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Hero Image */}
        <div className="relative h-56 overflow-hidden rounded-t-xl bg-muted">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex gap-2 mb-2">
              <Badge className="bg-primary text-white border-0">{event.category || "General"}</Badge>
              <Badge className="bg-green-600 text-white border-0 capitalize">{event.status || "Upcoming"}</Badge>
            </div>
            <h2 className="text-2xl font-display font-bold text-white">{event.title}</h2>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Live Stream Section */}
          {(event as any).isLiveStream && (event as any).liveStreamUrl && (
            <div className="space-y-4">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Play className="h-5 w-5 text-red-600 fill-red-600" /> Live Stream
              </h3>
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black relative border-4 border-red-600/20">
                {((event as any).liveStreamUrl.includes('youtube.com') || (event as any).liveStreamUrl.includes('youtu.be')) ? (
                  <iframe 
                    src={`https://www.youtube.com/embed/${(event as any).liveStreamUrl.split('v=')[1] || (event as any).liveStreamUrl.split('/').pop()}`}
                    className="w-full h-full"
                    allowFullScreen
                    title="Live Stream"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white p-4 text-center">
                    <Play className="h-12 w-12 mb-4 text-red-600" />
                    <p className="font-semibold mb-2">Live stream is available on an external platform</p>
                    <Button 
                      variant="outline" 
                      className="text-white border-white hover:bg-white hover:text-black"
                      onClick={() => window.open((event as any).liveStreamUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" /> Open Stream
                    </Button>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-red-600 text-white animate-pulse">LIVE</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Key Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 bg-muted rounded-xl text-center">
              <Calendar className="h-5 w-5 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Date</span>
              <span className="text-sm font-semibold">{new Date(event.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-muted rounded-xl text-center">
              <Clock className="h-5 w-5 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Year</span>
              <span className="text-sm font-semibold">{new Date(event.eventDate).getFullYear()}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-muted rounded-xl text-center">
              <Users className="h-5 w-5 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">{event.eventType === 'full-service' ? 'Max Guests' : 'Capacity'}</span>
              <span className="text-sm font-semibold">{event.capacity} {event.eventType === 'full-service' ? 'guests' : 'seats'}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-muted rounded-xl text-center">
              <Star className="h-5 w-5 text-yellow-500 mb-1" />
              <span className="text-xs text-muted-foreground">Rating</span>
              <span className="text-sm font-semibold">4.8 / 5</span>
            </div>
            {event.eventType === 'full-service' && (
            <div className="flex flex-col items-center p-3 bg-muted rounded-xl text-center">
              <Users className="h-5 w-5 text-primary mb-1" />
              <span className="text-xs text-muted-foreground">Daily Capacity</span>
              <span className="text-sm font-semibold">{event.dailyCapacity || 1} bookings</span>
            </div>
            )}
          </div>

          {/* Location */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
            <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{t('event_location')}</p>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-2">{t('about_this_event')}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{event.description}</p>
          </div>

          {/* Photo Gallery */}
          <div>
            <h3 className="font-display font-semibold text-lg mb-3">{t('gallery')}</h3>
            <div className="grid grid-cols-3 gap-2">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="aspect-video overflow-hidden rounded-lg bg-muted">
                  <img
                    src={img}
                    alt={`${event.category} event ${idx + 1}`}
                    className="w-full h-full object-cover object-top hover:scale-105 transition-transform duration-300 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Highlights */}
          {event.eventType !== 'ticketed' && (
          <div>
            <h3 className="font-display font-semibold text-lg mb-3">{t('whats_included')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {["Professional Photography", "Catering & Refreshments", "Live Entertainment", "Decoration & Setup",
                "Sound & Lighting", "Event Coordinator"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Organizer */}
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('organized_by')}</p>
              <p className="text-sm text-muted-foreground">{event.organizerName}</p>
            </div>
          </div>

          {/* Booking Button */}
          <div className="pt-4 flex justify-end gap-3">
            <Button 
              variant="outline" 
              className="h-12 px-8 text-base font-semibold border-border text-foreground hover:bg-muted"
              onClick={() => onOpenChange(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              className="gradient-primary text-primary-foreground h-12 px-8 text-base font-semibold"
              onClick={() => {
                onOpenChange(false);
                onBook(event);
              }}
            >
              {t('book_now')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailModal;
