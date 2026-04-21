import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, color, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="h-full"
    >
      <Card className="glass-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group h-full">
        <CardContent className="p-6 relative">
          {/* Background Gradient */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${color}`} />
          
          {/* Animated Border */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          
          <div className="flex items-center gap-4 relative z-10">
            {/* Icon with animation */}
            <motion.div 
              className={`p-4 rounded-2xl bg-muted ${color} shrink-0 group-hover:rotate-6 transition-transform duration-300`}
              whileHover={{ scale: 1.1 }}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
            
            {/* Content */}
            <div className="flex-1">
              <motion.p 
                className="text-3xl font-display font-bold mb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.3 }}
              >
                {value}
              </motion.p>
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
