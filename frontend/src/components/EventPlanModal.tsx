import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, X, Music, Camera, Utensils } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";

interface EventPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  existingPlan?: any;
}

const EventPlanModal = ({ open, onOpenChange, bookingId, existingPlan }: EventPlanModalProps) => {
  const queryClient = useQueryClient();
  const [theme, setTheme] = useState(existingPlan?.theme || "");
  const [decoration, setDecoration] = useState(existingPlan?.decoration || "");
  const [menuItems, setMenuItems] = useState<string[]>(existingPlan?.menuItems || []);
  const [menuItemInput, setMenuItemInput] = useState("");
  const [photography, setPhotography] = useState(existingPlan?.photography || false);
  const [musicDJ, setMusicDJ] = useState(existingPlan?.musicDJ || false);
  const [entertainment, setEntertainment] = useState<string[]>(existingPlan?.entertainment || []);
  const [entertainmentInput, setEntertainmentInput] = useState("");
  const [specialRequests, setSpecialRequests] = useState(existingPlan?.specialRequests || "");
  const [estimatedPrice, setEstimatedPrice] = useState(existingPlan?.estimatedPrice?.toString() || "");

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.patch(`/bookings/${bookingId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("Event plan saved successfully!");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to save event plan");
    },
  });

  const addMenuItem = () => {
    if (menuItemInput.trim()) {
      setMenuItems([...menuItems, menuItemInput.trim()]);
      setMenuItemInput("");
    }
  };

  const removeMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  const addEntertainment = () => {
    if (entertainmentInput.trim()) {
      setEntertainment([...entertainment, entertainmentInput.trim()]);
      setEntertainmentInput("");
    }
  };

  const removeEntertainment = (index: number) => {
    setEntertainment(entertainment.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const eventPlan = {
      theme,
      decoration,
      menuItems,
      photography,
      musicDJ,
      entertainment,
      specialRequests,
      estimatedPrice: parseFloat(estimatedPrice) || 0,
    };

    updateMutation.mutate({ 
      eventPlan,
     status: 'plan_sent' // Automatically send to customer
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📋 Event Plan Details</DialogTitle>
          <DialogDescription>
            Customize the event plan according to customer requirements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Theme & Decoration */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Theme & Setup</h3>
            
            <div className="space-y-2">
              <Label htmlFor="theme">Event Theme</Label>
              <Input
                id="theme"
                placeholder="e.g., Royal Golden Theme, Beach Vibes, Superhero"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="decoration">Decoration Details</Label>
              <Textarea
                id="decoration"
                placeholder="Describe decoration requirements..."
                value={decoration}
                onChange={(e) => setDecoration(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Menu Items</h3>
            </div>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add menu item (e.g., Paneer Tikka)"
                value={menuItemInput}
                onChange={(e) => setMenuItemInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addMenuItem()}
              />
              <Button type="button" size="sm" onClick={addMenuItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {menuItems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {menuItems.map((item, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {item}
                    <button
                      type="button"
                      className="ml-2 hover:text-destructive"
                      onClick={() => removeMenuItem(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Additional Services</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer" onClick={() => setPhotography(!photography)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Checkbox checked={photography} />
                  <Camera className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Photography</p>
                    <p className="text-xs text-muted-foreground">Professional photos</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer" onClick={() => setMusicDJ(!musicDJ)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Checkbox checked={musicDJ} />
                  <Music className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Music/DJ</p>
                    <p className="text-xs text-muted-foreground">DJ & sound system</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Entertainment */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Entertainment</h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="Add entertainment (e.g., Magician, Dance Troupe)"
                value={entertainmentInput}
                onChange={(e) => setEntertainmentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addEntertainment()}
              />
              <Button type="button" size="sm" onClick={addEntertainment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {entertainment.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {entertainment.map((item, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    {item}
                    <button
                      type="button"
                      className="ml-2 hover:text-destructive"
                      onClick={() => removeEntertainment(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Special Requests */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests/ Notes</Label>
            <Textarea
              id="specialRequests"
              placeholder="Any special requirements or instructions..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              rows={3}
            />
          </div>

          {/* Estimated Price */}
          <div className="space-y-2">
            <Label htmlFor="estimatedPrice">Estimated Total Price (₹)</Label>
            <Input
             id="estimatedPrice"
           type="number"
             min="0"
             placeholder="e.g., 50000"
             value={estimatedPrice}
             onChange={(e) => setEstimatedPrice(e.target.value)}
           />
           <p className="text-xs text-muted-foreground">This is the estimated total cost including all services</p>
         </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Event Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventPlanModal;
