import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  X, 
  ZoomIn, 
  CalendarDays, 
  MapPin, 
  Download, 
  Share2,
  Heart,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Mock gallery data - In production, this would come from API
const GALLERY_DATA = [
  {
    id: 1,
    eventId: "1",
    eventTitle: "Grand Summer Wedding Celebration",
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200",
      "https://images.unsplash.com/photo-1511285560982-1356c11d4606?w=1200",
      "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=1200",
      "https://images.unsplash.com/photo-1546193430-c2d207739ed7?w=1200",
    ],
    category: "Wedding",
    date: "2026-04-15",
    location: "Rosewood Gardens, Mumbai",
  },
  {
    id: 2,
    eventId: "3",
    eventTitle: "Bollywood Night Live Concert",
    images: [
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200",
      "https://images.unsplash.com/photo-1459749411177-287ce3276916?w=1200",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200",
    ],
    category: "Concert",
    date: "2026-03-28",
    location: "Phoenix Arena, Delhi",
  },
  {
    id: 3,
    eventId: "4",
    eventTitle: "Kids Birthday Bash — Superhero Theme",
    images: [
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200",
      "https://images.unsplash.com/photo-1502086223501-8351e0943814?w=1200",
      "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=1200",
    ],
    category: "Birthday",
    date: "2026-04-05",
    location: "FunZone Park, Pune",
  },
];

interface EventGalleryProps {
  title?: string;
}

const EventGallery: React.FC<EventGalleryProps> = ({ title = "Event Memories" }) => {
  const [selectedImage, setSelectedImage] = useState<{ imageUrl: string; images: string[]; index: number } | null>(null);
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());

  const handleImageClick = (imageUrl: string, images: string[], index: number) => {
    setSelectedImage({ imageUrl, images, index });
  };

  const handleNext = () => {
    if (!selectedImage) return;
    const nextIndex = (selectedImage.index + 1) % selectedImage.images.length;
    setSelectedImage({
      ...selectedImage,
      index: nextIndex,
      imageUrl: selectedImage.images[nextIndex],
    });
  };

  const handlePrev = () => {
    if (!selectedImage) return;
    const prevIndex = (selectedImage.index - 1 + selectedImage.images.length) % selectedImage.images.length;
    setSelectedImage({
      ...selectedImage,
      index: prevIndex,
      imageUrl: selectedImage.images[prevIndex],
    });
  };

  const toggleLike = (imageId: string) => {
    setLikedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 gradient-primary text-white border-0">📸 Photo Gallery</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Relive the magic moments from our past events
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {GALLERY_DATA.slice(0, 4).map((event, eventIdx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: eventIdx * 0.1 }}
              className="min-w-0"
            >
              <Card className="overflow-hidden hover-lift border-0 shadow-xl group">
                <CardContent className="p-1">
                  {/* Event Info Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <Badge className="bg-white/90 text-gray-800 border-0 backdrop-blur-sm">
                      {event.category}
                    </Badge>
                  </div>

                  {/* Main Image */}
                  <div className="relative h-[200px] md:h-[240px] overflow-hidden cursor-pointer rounded-lg">
                    <img
                      src={event.images[0]}
                      alt={event.eventTitle}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onClick={() => handleImageClick(event.images[0], event.images, 0)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?w=800";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Overlay Actions */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(event.images[0], event.images, 0);
                        }}
                      >
                        <ZoomIn className="w-3 h-3 mr-1" /> View All
                      </Button>
                    </div>

                    {/* Image Count */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-black/50 text-white border-0 backdrop-blur-sm">
                        {event.images.length} photos
                      </Badge>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                      {event.eventTitle}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location.split(",")[0]}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* CTA for Organizers */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600 mb-4">Are you an event organizer?</p>
          <Button className="gradient-primary text-white" onClick={() => window.location.href = "/login"}>
            Upload Your Event Photos
          </Button>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <Dialog open={true} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black/95 border-0">
              <div className="relative w-full h-[80vh] flex items-center justify-center">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Navigation Buttons */}
                <button
                  onClick={handlePrev}
                  className="absolute left-4 z-50 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 z-50 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>

                {/* Image */}
                <motion.img
                  key={selectedImage.imageUrl}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  src={selectedImage.imageUrl}
                  alt="Event"
                  className="max-w-full max-h-full object-contain"
                />

                {/* Bottom Actions */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-0"
                    onClick={() => toggleLike(selectedImage.imageUrl)}
                  >
                    <Heart className={`w-4 h-4 ${likedImages.has(selectedImage.imageUrl) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-0"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Image Counter */}
                <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                  {selectedImage.index + 1} / {selectedImage.images.length}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </section>
  );
};

export default EventGallery;
