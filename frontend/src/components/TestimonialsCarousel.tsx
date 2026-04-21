import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const DEFAULT_TESTIMONIALS = [
  {
    id: 1,
    name: "Priya Sharma",
    role: "Wedding Client",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    rating: 5,
    text: "EventPro made our dream wedding a reality! The platform was so easy to use, and we found the perfect vendor. Everything was seamless from booking to execution.",
  },
  {
    id: 2,
    name: "Rahul Mehta",
    role: "Corporate Event Organizer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    rating: 5,
    text: "We've organized multiple corporate events through EventPro. The booking system is efficient, and the support team is always responsive. Highly recommended!",
  },
  {
    id: 3,
    name: "Ananya Iyer",
    role: "Birthday Party Host",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    rating: 5,
    text: "My daughter's birthday party was absolutely magical thanks to EventPro. The themed decorations and entertainment were top-notch. Will definitely book again!",
  },
  {
    id: 4,
    name: "Vikram Singh",
    role: "Concert Attendee",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    rating: 5,
    text: "Booked tickets for a Bollywood concert through EventPro. The process was smooth, and we got great seats. The event was unforgettable!",
  },
  {
    id: 5,
    name: "Sanya Gupta",
    role: "Engagement Client",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    rating: 5,
    text: "The vendor coordination was excellent. We didn't have to worry about anything on the big day. Highly professional service!",
  },
];

const TestimonialsCarousel = () => {
  const { data: serverReviews, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const response = await api.get<any[]>('/reviews');
      return response.data;
    },
  });

  const testimonials = (serverReviews && serverReviews.length > 0) 
    ? serverReviews.slice(0, 5).map(r => ({
        id: r._id || r.id,
        name: r.customerName,
        role: "Verified Client",
        avatar: r.customerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.customerName}`,
        rating: r.rating,
        text: r.comment || "No comment provided.",
      }))
    : DEFAULT_TESTIMONIALS.slice(0, 5);

  return (
    <section className="py-20 px-6 bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-hidden">
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
            What Our <span className="text-gradient">Customers Say</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our happy customers
          </p>
        </motion.div>

        {/* Testimonials Swiper */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            spaceBetween={24}
            slidesPerView={1.2}
            breakpoints={{
              640: { slidesPerView: 2.2 },
              1024: { slidesPerView: 3.2 },
            }}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="pb-12 !overflow-visible"
          >
            {testimonials.map((testimonial, index) => (
              <SwiperSlide key={testimonial.id}>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card className="h-full glass-card hover-lift border-0 shadow-lg">
                    <CardContent className="p-6 flex flex-col h-full">
                      {/* Rating Stars */}
                      <div className="flex gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>

                      {/* Testimonial Text */}
                      <p className="text-gray-700 italic mb-6 flex-grow leading-relaxed">
                        "{testimonial.text}"
                      </p>

                      {/* Customer Info */}
                      <div className="flex items-center gap-3 mt-auto">
                        <Avatar className="w-12 h-12 border-2 border-primary/20">
                          <AvatarImage 
                            src={testimonial.avatar} 
                            alt={testimonial.name} 
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${testimonial.name}`;
                            }}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
                            {testimonial.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                          <p className="text-xs text-gray-500">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-6 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 font-medium">4.9/5 Average Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 font-medium">10,000+ Happy Customers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600 font-medium">98% Satisfaction Rate</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;
