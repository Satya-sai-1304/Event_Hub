import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Calendar, Heart, Download, Share2, ZoomIn } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface GalleryPhoto {
  _id: string;
  id: string;
  serviceId: string;
  serviceName: string;
  merchantId: string;
  merchantName: string;
  imageUrl: string;
  caption?: string;
  uploadedAt: string;
  category: string;
}

const GALLERY_CATEGORIES = [
  'all',
  'Wedding Decor', 
  'Birthday Decoration', 
  'Mandap Design', 
  'Stage Decoration', 
  'Outdoor Events'
];

const GalleryPage = () => {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Fetch gallery photos from API
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['gallery', categoryFilter],
    queryFn: async () => {
      const url = categoryFilter === 'all' ? '/gallery' : `/gallery?category=${encodeURIComponent(categoryFilter)}`;
      const response = await api.get<GalleryPhoto[]>(url);
      return response.data;
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Event Decoration Gallery
          </h1>
          <p className="text-muted-foreground mt-1">Stunning decorations and event setups from our vendors</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {GALLERY_CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={categoryFilter === cat ? 'default' : 'outline'}
            className="cursor-pointer px-4 py-2 capitalize"
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Photo Grid - Masonry style roughly with grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="text-lg font-semibold mb-2">No photos found</h3>
            <p className="text-muted-foreground">Try a different category or check back later</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {photos.map((photo: GalleryPhoto) => (
            <Card key={photo._id || photo.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-none bg-transparent">
              <CardContent className="p-0">
                <div 
                  className="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl"
                  onClick={() => {
                    setSelectedPhoto(photo);
                    setLightboxOpen(true);
                  }}
                >
                  <img 
                    src={photo.imageUrl} 
                    alt={photo.caption || photo.serviceName}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <p className="font-bold text-lg truncate">{photo.serviceName || "Event Decoration"}</p>
                      <p className="text-sm text-white/80 flex items-center gap-1">
                        by {photo.merchantName || "Premium Vendor"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none text-[10px]">
                          {photo.category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" className="h-8 w-8 p-0 rounded-full bg-white/20 backdrop-blur-md border-none text-white hover:bg-white/40">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
          {selectedPhoto && (
            <div className="relative w-full flex flex-col md:flex-row h-[80vh]">
              {/* Image Side */}
              <div className="flex-1 bg-black flex items-center justify-center p-4">
                <img 
                  src={selectedPhoto.imageUrl} 
                  alt={selectedPhoto.caption || selectedPhoto.serviceName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Info Side */}
              <div className="w-full md:w-80 bg-white p-6 flex flex-col">
                <div className="flex-1">
                  <Badge className="mb-4">{selectedPhoto.category}</Badge>
                  <h2 className="text-2xl font-bold mb-1">{selectedPhoto.serviceName}</h2>
                  <p className="text-primary font-medium mb-4">by {selectedPhoto.merchantName}</p>
                  
                  {selectedPhoto.caption && (
                    <div className="bg-muted/30 p-4 rounded-lg mb-6">
                      <p className="text-sm text-muted-foreground italic">
                        "{selectedPhoto.caption}"
                      </p>
                    </div>
                  )}

                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Uploaded on {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t space-y-3">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => toast.success("Shared!")}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => toast.success("Saved to favorites!")}>
                      <Heart className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                  <Button className="w-full gradient-primary text-white">
                    View Service Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryPage;