import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Loader2, Image as ImageIcon, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  onSuccess?: () => void;
}

const ReviewModal = ({ open, onOpenChange, booking, onSuccess }: ReviewModalProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [serviceRating, setServiceRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [isUploading, setIsUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newPhotos = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'event_hub'); // Adjust this as needed

      try {
        // Here we'll use a simple base64 conversion for now as we don't have direct Cloudinary client setup
        // Or better, check if there's an upload endpoint in the backend
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;
        newPhotos.push(base64);
      } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image");
      }
    }

    setPhotos(newPhotos);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const createReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/reviews', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("Review submitted successfully! Thank you for your feedback.");
      onOpenChange(false);
      if (onSuccess) onSuccess();
      // Reset form
      setRating(5);
      setComment("");
      setServiceRating(5);
      setValueRating(5);
      setQualityRating(5);
      setPhotos([]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit review");
    },
  });

  const handleSubmit = () => {
    if (!booking) return;
    
    createReviewMutation.mutate({
      bookingId: booking.id || booking._id,
      eventId: booking.eventId,
      serviceId: booking.serviceId,
      eventTitle: booking.eventTitle,
      serviceName: booking.serviceName,
      customerId: booking.customerId,
      customerName: booking.customerName,
      organizerId: booking.organizerId,
      vendorId: booking.vendorId,
      rating,
      comment,
      ratings: {
        overall: rating,
        service: serviceRating,
        value: valueRating,
        quality: qualityRating,
      },
      photos,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⭐ Write a Review</DialogTitle>
          <DialogDescription>
            Share your experience about "{booking?.eventTitle}" with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Rating */}
          <div className="space-y-3">
            <Label>Overall Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {rating === 5 && "Excellent! ⭐⭐⭐⭐⭐"}
              {rating === 4 && "Very Good ⭐⭐⭐⭐"}
              {rating === 3 && "Good ⭐⭐⭐"}
              {rating === 2 && "Fair ⭐⭐"}
              {rating === 1 && "Poor ⭐"}
            </p>
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm">Service</Label>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setServiceRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= serviceRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm">Value</Label>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setValueRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= valueRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm">Quality</Label>
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setQualityRating(star)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 ${
                          star <= qualityRating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              placeholder="Tell others about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Be specific and honest to help others make informed decisions
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label>Add Photos (Optional)</Label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={photo} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground group-hover:text-primary mb-1" />
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary">Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createReviewMutation.isPending || !comment.trim() || isUploading}
          >
            {createReviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
