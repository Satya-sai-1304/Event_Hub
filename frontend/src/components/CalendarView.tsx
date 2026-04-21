import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

interface CalendarEvent {
  date: Date;
  title: string;
  type: 'booking' | 'event' | 'reminder';
  location?: string;
  time?: string;
}

interface CalendarViewProps {
  events?: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
}

const CalendarView = ({ events = [], onDateSelect }: CalendarViewProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleDateChange = (date: Date | Date[]) => {
    const newDate = Array.isArray(date) ? date[0] : date;
    setSelectedDate(newDate);
    onDateSelect?.(newDate);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter(event => 
      event.date.toDateString() === date.toDateString()
    );
  };

  // Tile content renderer
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayEvents = getEventsForDate(date);
      if (dayEvents.length === 0) return null;

      return (
        <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
          {dayEvents.slice(0, 3).map((event, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${
                event.type === 'booking' ? 'bg-blue-500' :
                event.type === 'event' ? 'bg-green-500' :
                'bg-orange-500'
              }`}
            />
          ))}
          {dayEvents.length > 3 && (
            <span className="text-xs text-muted-foreground">+{dayEvents.length - 3}</span>
          )}
        </div>
      );
    }
    return null;
  };

  // Tile class name renderer
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayEvents = getEventsForDate(date);
      if (dayEvents.length > 0) {
        return 'has-events';
      }
    }
    return undefined;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            className="w-full border-none"
          />
        </CardContent>
      </Card>

      {/* Selected Date Events */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Events on {selectedDate.toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric' 
            })}
          </h3>
          
          {getEventsForDate(selectedDate).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No events scheduled for this date
            </p>
          ) : (
            <div className="space-y-3">
              {getEventsForDate(selectedDate).map((event, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-muted rounded-lg border-l-4 border-l-primary"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                        )}
                        {event.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {event.time}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={
                      event.type === 'booking' ? 'default' :
                      event.type === 'event' ? 'secondary' :
                      'outline'
                    }>
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarView;
