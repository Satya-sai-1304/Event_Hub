import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Music, Camera, Utensils, IndianRupee } from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface PlanReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  plan: any;
}

const PlanReviewModal = ({ open, onOpenChange, bookingId, plan }: PlanReviewModalProps) => {
  const queryClient = useQueryClient();
  const [changeRequest, setChangeRequest] = useState("");

  const updateMutation = useMutation({
    mutationFn: async(data: any) => {
      return await api.patch(`/bookings/${bookingId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      onOpenChange(false);
      setChangeRequest("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update plan");
    },
  });

  const handleAcceptPlan = () => {
    updateMutation.mutate({ status: 'accepted' });
    toast.success("Plan accepted! Merchant will send the final bill.");
  };

  const handleRequestChanges = () => {
   if (!changeRequest.trim()) {
      toast.error("Please provide details about the changes you need");
      return;
    }
    
    updateMutation.mutate({ 
     status: 'customer_update_requested',
      eventPlan: {
        ...plan,
        specialRequests: (plan?.specialRequests || "") + "\n\nCustomer Change Request: " + changeRequest
      }
    });
    toast.success("Change request sent to merchant. They will update the plan.");
  };

 return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">📋 Review Your Event Plan</DialogTitle>
          <DialogDescription>
            Review the plan created by your merchant. You can accept it or request changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme & Decoration */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-sm font-semibold">Event Theme</Label>
                <p className="text-base mt-1">{plan?.theme || "Not specified"}</p>
              </div>
              
              <div>
                <Label className="text-sm font-semibold">Decoration Details</Label>
                <p className="text-base mt-1">{plan?.decoration || "Not specified"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                <Label className="text-sm font-semibold">Menu Items</Label>
              </div>
              
              {plan?.menuItems && plan.menuItems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {plan.menuItems.map((item: string, index: number) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1">
                      {item}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No menu items specified</p>
              )}
            </CardContent>
          </Card>

          {/* Services */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Label className="text-sm font-semibold">Included Services</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${plan?.photography ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <Camera className={`h-5 w-5 ${plan?.photography ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${plan?.photography ? 'text-blue-900' : 'text-gray-600'}`}>Photography</p>
                    <p className="text-xs text-muted-foreground">{plan?.photography ? 'Included' : 'Not included'}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 p-3 rounded-lg ${plan?.musicDJ ? 'bg-purple-50' : 'bg-gray-50'}`}>
                  <Music className={`h-5 w-5 ${plan?.musicDJ ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${plan?.musicDJ ? 'text-purple-900' : 'text-gray-600'}`}>Music/DJ</p>
                    <p className="text-xs text-muted-foreground">{plan?.musicDJ ? 'Included' : 'Not included'}</p>
                  </div>
                </div>
              </div>

              {plan?.entertainment && plan.entertainment.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">Entertainment</Label>
                  <div className="flex flex-wrap gap-2">
                    {plan.entertainment.map((item: string, index: number) => (
                      <Badge key={index} variant="outline" className="px-3 py-1">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estimated Price */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-6 w-6 text-green-600" />
                  <Label className="text-base font-semibold">Estimated Total</Label>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{plan?.estimatedPrice?.toLocaleString() || "0"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Final price may vary based on actual requirements
              </p>
            </CardContent>
          </Card>

          {/* Special Requests */}
          {plan?.specialRequests && (
            <Card>
              <CardContent className="pt-6">
                <Label className="text-sm font-semibold">Special Notes</Label>
                <p className="text-base mt-1 whitespace-pre-wrap">{plan.specialRequests}</p>
              </CardContent>
            </Card>
          )}

          {/* Change Request Input */}
          <div className="space-y-2">
            <Label htmlFor="changeRequest">Request Changes (Optional)</Label>
            <Textarea
              id="changeRequest"
              placeholder="Describe what changes you'd like to see in the plan..."
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleRequestChanges}
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Request Changes
          </Button>
          <Button 
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
            onClick={handleAcceptPlan}
            disabled={updateMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Accept Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlanReviewModal;
