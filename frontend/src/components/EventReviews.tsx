import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ThumbsUp, MessageSquare, Calendar, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface EventReviewsProps {
  eventId: string;
}

interface Review {
  id: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  ratings?: {
    overall: number;
    service: number;
    value: number;
    quality: number;
  };
  helpfulVotes: number;
  createdAt: string;
}

const EventReviews = ({ eventId }: EventReviewsProps) => {
  const queryClient = useQueryClient();
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', eventId],
    queryFn: async () => {
      const response = await api.get<Review[]>(`/reviews/event/${eventId}`);
      return response.data;
    },
  });

  const markHelpfulMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/reviews/${id}/helpful`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', eventId] });
    },
  });

  // Sort reviews
  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'highest') {
      return b.rating - a.rating;
    } else {
      return a.rating - b.rating;
    }
  });

  // Calculate average ratings
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === stars).length / reviews.length) * 100 
      : 0,
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">{avgRating}</div>
              <div className="flex justify-center gap-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(Number(avgRating))
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-gray-200 text-gray-200'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Based on {reviews.length} review{reviews.length !== 1 && 's'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            {ratingDistribution.map(({ stars, count, percentage }) => (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{stars}</span>
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </div>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-8 text-right text-sm text-muted-foreground">
                  {count}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Filter & Sort */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Customer Reviews</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            onClick={() => setSortBy('recent')}
          >
            Most Recent
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'highest' ? 'default' : 'outline'}
            onClick={() => setSortBy('highest')}
          >
            Highest Rated
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'lowest' ? 'default' : 'outline'}
            onClick={() => setSortBy('lowest')}
          >
            Lowest Rated
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedReviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No reviews yet. Be the first to review this event!</p>
            </CardContent>
          </Card>
        ) : (
          sortedReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {review.customerName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{review.customerName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-gray-200 text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {review.comment && (
                  <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
                )}

                {/* Detailed Ratings */}
                {review.ratings && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Service</p>
                      <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= review.ratings!.service
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Value</p>
                      <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= review.ratings!.value
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Quality</p>
                      <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <= review.ratings!.quality
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Helpful Vote */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                    onClick={() => markHelpfulMutation.mutate(review.id)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Helpful ({review.helpfulVotes})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default EventReviews;
