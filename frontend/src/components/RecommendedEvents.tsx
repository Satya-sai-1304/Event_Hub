import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star, ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { type Event } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

import { useLanguage } from "@/contexts/LanguageContext";

interface RecommendedEventsProps {
  customerId?: string;
  limit?: number;
}

const RecommendedEvents = ({ customerId, limit = 4 }: RecommendedEventsProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const { data: recommendedEvents = [] } = useQuery({
    queryKey: ['recommendations', customerId],
    queryFn: async () => {
      if (!customerId) {
        const response = await api.get<Event[]>('/events');
        return response.data.slice(0, limit);
      }
      const response = await api.get<Event[]>(`/events/recommendations/${customerId}`);
      return response.data;
    },
  });

  if (recommendedEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-lg">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold">{t('recommended_for_you')}</h2>
          <p className="text-xs text-muted-foreground">Curated based on your interests</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {recommendedEvents.map((event) => (
          <Card key={event.id} className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden rounded-xl">
            <CardContent className="p-0">
              <div 
                className="relative aspect-[4/3] overflow-hidden"
                onClick={() => {
                  const id = event.id || (event as any)._id;
                  navigate(`/book/event/${id}`);
                }}
              >
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5">
                    <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                    4.8
                  </Badge>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>

                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 shrink-0" />
                    {new Date(event.eventDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{event.location}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm font-bold text-primary">₹{event.price.toLocaleString()}</div>
                  <Button 
                    size="sm" 
                    className="h-7 text-xs px-2 gradient-primary text-white border-none"
                    onClick={() => {
                      const id = event.id || (event as any)._id;
                      navigate(`/book/event/${id}`);
                    }}
                  >
                    Book
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button 
          size="lg" 
          variant="outline"
          onClick={() => navigate('/dashboard/browse-events')}
        >
          Browse All Events
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RecommendedEvents;
