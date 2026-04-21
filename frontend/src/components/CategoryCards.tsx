import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Cake, Building, Music, Trophy, PartyPopper, Palette, BookOpen, Loader2, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

const CATEGORY_ICONS: Record<string, any> = {
  "Wedding": Heart,
  "Birthday": Cake,
  "Corporate": Building,
  "Concert": Music,
  "Sports": Trophy,
  "Education": BookOpen,
  "Party": PartyPopper,
  "Cultural": Palette,
  "Workshop": BookOpen,
  "Festival": PartyPopper,
  "All": LayoutGrid,
};

const CATEGORY_COLORS: Record<string, string> = {
  "Wedding": "#ec4899",
  "Birthday": "#f59e0b",
  "Corporate": "#3b82f6",
  "Concert": "#8b5cf6",
  "Sports": "#10b981",
  "Education": "#6366f1",
  "Party": "#f43f5e",
  "Cultural": "#8b5cf6",
  "Workshop": "#10b981",
  "Festival": "#f43f5e",
  "All": "#6b7280",
};

interface CategoryCardsProps {
  onCategorySelect?: (categoryName: string) => void;
}

const CategoryCards = ({ onCategorySelect }: CategoryCardsProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<any[]>('/categories');
      return response.data;
    },
  });

  const mobileCategories = categories ? [
    ...categories.slice(0, 4),
    { id: 'all', name: 'All', isAll: true }
  ] : [];

  const handleCategoryClick = (category: any) => {
    if (category.isAll) {
      navigate('/dashboard/browse-events');
      return;
    }
    
    if (onCategorySelect) {
      onCategorySelect(category.name);
    } else {
      navigate(`/dashboard/browse-events?category=${category.name}`);
    }
  };

  if (isMobile) {
    return (
      <section id="categories" className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-3xl font-display font-bold mb-2">
              Explore <span className="text-gradient">Categories</span>
            </h2>
            <p className="text-sm text-gray-500">
              Find the perfect event for every occasion
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 px-1">
              {mobileCategories.map((category: any, index: number) => {
                const IconComponent = CATEGORY_ICONS[category.name] || LayoutGrid;
                const color = CATEGORY_COLORS[category.name] || "#8b5cf6";
                
                return (
                  <motion.div
                    key={category._id || category.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => handleCategoryClick(category)}
                    className="flex flex-col items-center gap-1.5 cursor-pointer min-w-0"
                  >
                    <div 
                      className="w-full aspect-square rounded-2xl flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                      style={{ 
                        background: `linear-gradient(135deg, ${color}15, ${color}25)`,
                        border: `1px solid ${color}20`
                      }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: color }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 truncate w-full text-center px-0.5">
                      {category.name}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="categories" className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            Explore <span className="text-gradient">Categories</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find the perfect event for every occasion
          </p>
        </motion.div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {(categories || []).map((category, index) => {
              const IconComponent = CATEGORY_ICONS[category.name] || PartyPopper;
              const color = CATEGORY_COLORS[category.name] || "#8b5cf6";
              
              return (
                <motion.div
                  key={category._id || category.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onClick={() => handleCategoryClick(category)}
                  className="cursor-pointer group"
                >
                  <Card className="group relative overflow-hidden rounded-2xl border-2 border-gray-100 hover:border-primary/30 transition-all duration-300 hover-lift h-full">
                    <CardContent className="p-6 md:p-8 flex flex-col items-center justify-center gap-4">
                      {/* Icon with animated background */}
                      <div className="relative">
                        <div 
                          className="absolute inset-0 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300 animate-pulse-slow"
                          style={{ backgroundColor: color }}
                        />
                        <div 
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                          style={{ 
                            background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                          }}
                        >
                          <IconComponent className="w-8 h-8 md:w-10 md:h-10" style={{ color: color }} />
                        </div>
                      </div>

                      {/* Category Name */}
                      <div className="text-center">
                        <h3 className="font-display font-semibold text-lg md:text-xl text-gray-800 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Explore events →
                        </p>
                      </div>

                      {/* Hover gradient overlay */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                        style={{ backgroundColor: color }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
          >
            View All Categories
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default CategoryCards;
