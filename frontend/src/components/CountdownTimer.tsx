import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: string;
  label?: string;
}

const CountdownTimer = ({ targetDate, label = "Event starts in:" }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetDate) - +new Date();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          isExpired: false,
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <Badge variant="default" className="bg-red-500">
        Event Started!
      </Badge>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="h-4 w-4" />
            {label}
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold text-primary">{timeLeft.days}</div>
              <div className="text-xs text-muted-foreground mt-1">Days</div>
            </div>
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold text-primary">{timeLeft.hours}</div>
              <div className="text-xs text-muted-foreground mt-1">Hours</div>
            </div>
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold text-primary">{timeLeft.minutes}</div>
              <div className="text-xs text-muted-foreground mt-1">Minutes</div>
            </div>
            <div className="bg-background rounded-lg p-3 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold text-primary">{timeLeft.seconds}</div>
              <div className="text-xs text-muted-foreground mt-1">Seconds</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CountdownTimer;
