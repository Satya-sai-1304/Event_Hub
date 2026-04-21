import { motion } from "framer-motion";
import { Calendar, Ticket, Music } from "lucide-react";

const icons = [
  { icon: <Calendar className="h-8 w-8 text-primary" /> },
  { icon: <Ticket className="h-8 w-8 text-secondary" /> },
  { icon: <Music className="h-8 w-8 text-accent" /> },
];

const Loader = () => {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="flex items-center space-x-4">
        {icons.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            {item.icon}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Loader;
