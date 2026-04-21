import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit3, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface TicketType {
  name: string;
  price: string;
  quantity: string;
  remainingQuantity?: number;
}

interface Addon {
  serviceId: string;
  name: string;
  price: number;
  category: string;
}

const EditEventPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    price: "0",
    location: "",
    eventDate: "",
    capacity: "",
    dailyCapacity: "1",
    image: "",
    galleryImages: "",
    eventType: "full-service",
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [addonSearchTerm, setAddonSearchTerm] = useState("");

  const { data: merchantServices } = useQuery({
    queryKey: ['merchant-services', user?.id],
    queryFn: async () => {
      const response = await api.get(`/services?merchantId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const filteredAddons = useMemo(() => {
    if (!merchantServices) return [];
    return merchantServices.filter((s: any) => 
      s.name.toLowerCase().includes(addonSearchTerm.toLowerCase()) ||
      (s.category || s.type || "").toLowerCase().includes(addonSearchTerm.toLowerCase())
    );
  }, [merchantServices, addonSearchTerm]);

  const toggleAddon = (service: any) => {
    const exists = selectedAddons.find(a => a.serviceId === (service._id || service.id));
    if (exists) {
      setSelectedAddons(selectedAddons.filter(a => a.serviceId !== (service._id || service.id)));
    } else {
      const isCatering = (service.type || service.category || "").toLowerCase().includes('catering');
      setSelectedAddons([...selectedAddons, {
        serviceId: service._id || service.id,
        name: service.name,
        price: (isCatering ? service.perPlatePrice : service.price) || 0,
        category: service.category || service.type || "Uncategorized"
      }]);
    }
  };

  const selectAllFilteredAddons = () => {
    const newAddons = [...selectedAddons];
    filteredAddons.forEach((service: any) => {
      const serviceId = service._id || service.id;
      if (!newAddons.find(a => a.serviceId === serviceId)) {
        const isCatering = (service.type || service.category || "").toLowerCase().includes('catering');
        newAddons.push({
          serviceId: serviceId,
          name: service.name,
          price: (isCatering ? service.perPlatePrice : service.price) || 0,
          category: service.category || service.type || "Uncategorized"
        });
      }
    });
    setSelectedAddons(newAddons);
    toast.success(`Selected ${filteredAddons.length} services`);
  };

  const deselectAllFilteredAddons = () => {
    const filteredIds = filteredAddons.map((s: any) => s._id || s.id);
    setSelectedAddons(selectedAddons.filter(a => !filteredIds.includes(a.serviceId)));
    toast.info(`Deselected filtered services`);
  };

  const updateAddonPrice = (serviceId: string, newPrice: number) => {
    setSelectedAddons(selectedAddons.map(a => 
      a.serviceId === serviceId ? { ...a, price: newPrice } : a
    ));
  };

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: "", price: "0", quantity: "0" }]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: string) => {
    const newTicketTypes = [...ticketTypes];
    newTicketTypes[index] = { ...newTicketTypes[index], [field]: value };
    setTicketTypes(newTicketTypes);
  };

  const { data: serverCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Fetch event data
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await api.get(`/events/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Populate form when event data loads
  useEffect(() => {
    if (eventData) {
      setForm({
        title: eventData.title || "",
        description: eventData.description || "",
        categoryId: eventData.categoryId || "",
        price: String(eventData.price || 0),
        location: eventData.location || "",
        eventDate: eventData.eventDate ? new Date(eventData.eventDate).toISOString().split('T')[0] : "",
        capacity: String(eventData.capacity || 0),
        dailyCapacity: String(eventData.dailyCapacity || 1),
        image: eventData.image || "",
        galleryImages: (eventData.images || []).join(', '),
        eventType: eventData.eventType || "full-service",
      });

      if (eventData.ticketTypes && eventData.ticketTypes.length > 0) {
        setTicketTypes(eventData.ticketTypes.map((t: any) => ({
          name: t.name,
          price: String(t.price),
          quantity: String(t.quantity),
          remainingQuantity: t.remainingQuantity
        })));
      } else if (eventData.eventType === 'ticketed') {
        setTicketTypes([{ 
          name: "Regular Ticket", 
          price: String(eventData.price || 0), 
          quantity: String(eventData.capacity || 100),
          remainingQuantity: eventData.capacity || 100
        }]);
      }

      if (eventData.addons && eventData.addons.length > 0) {
        setSelectedAddons(eventData.addons.map((a: any) => ({
          serviceId: a.serviceId,
          name: a.name,
          price: a.price,
          category: a.category || "Uncategorized"
        })));
      }
    }
  }, [eventData]);

  const mutation = useMutation({
    mutationFn: async (updatedEvent: any) => {
      const response = await api.patch(`/events/${id}`, updatedEvent);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Event "${form.title}" updated successfully!`);
      navigate("/dashboard/events");
    },
    onError: (error: any) => {
      console.error('Event update error:', error);
      toast.error(error.response?.data?.message || "Failed to update event");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!user?.id) {
        toast.error("You must be logged in to edit an event.");
        return;
      }
      
      if (!form.categoryId) {
        toast.error("Please select a category.");
        return;
      }
      
      // Validate required fields
      if (!form.title || !form.description || !form.location || (form.eventType === 'ticketed' && !form.eventDate) || !form.capacity) {
        toast.error("Please fill in all required fields.");
        return;
      }
      
      const capacityNum = Number(form.capacity);
      const priceNum = Number(form.price);

      const submitData: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        price: priceNum,
        location: form.location.trim(),
        eventDate: form.eventType === 'ticketed' ? new Date(form.eventDate).toISOString() : null,
        capacity: capacityNum,
        dailyCapacity: Number(form.dailyCapacity) || 1,
        image: form.image,
        images: form.galleryImages.split(',').map(img => img.trim()).filter(img => img !== ""),
        eventType: form.eventType,
        addons: selectedAddons,
        status: "upcoming" // Reset status to upcoming when edited (e.g. to reuse past events)
      };

      if (form.eventType === 'ticketed') {
        // Validate ticket quantities and calculate remaining quantity
        submitData.ticketTypes = ticketTypes.map(t => {
          // Find the actual original ticket from the data we loaded from API (eventData variable from useQuery)
          const originalTicket = (eventData as any)?.ticketTypes?.find((ot: any) => ot.name === t.name);
          const soldCount = originalTicket ? (originalTicket.quantity - (originalTicket.remainingQuantity || 0)) : 0;
          
          if (Number(t.quantity) < soldCount) {
            toast.error(`Ticket "${t.name}" cannot have fewer total tickets (${t.quantity}) than already sold (${soldCount}).`);
            throw new Error("Validation failed");
          }

          return {
            name: t.name,
            price: Number(t.price),
            quantity: Number(t.quantity),
            remainingQuantity: Number(t.quantity) - soldCount
          };
        });
      }
      
      mutation.mutate(submitData);
    } catch (err) {
      if (err instanceof Error && err.message !== "Validation failed") {
        console.error(err);
      }
    }
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoadingEvent) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6">
        <Edit3 className="inline h-6 w-6 mr-2 text-primary" />
        Edit Event
      </h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title</Label>
              <Input 
                id="title" 
                placeholder="Grand Summer Gala" 
                value={form.title} 
                onChange={(e) => update("title", e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea 
                id="desc" 
                placeholder="Describe your event..." 
                rows={4} 
                value={form.description} 
                onChange={(e) => update("description", e.target.value)} 
                required 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={form.categoryId} 
                onValueChange={(value) => update("categoryId", value)}
                disabled={categoriesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {(serverCategories || []).map((category: any) => (
                    <SelectItem key={category._id || category.id} value={category._id || category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Select value={form.eventType} onValueChange={(v) => update("eventType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-service">Full Service (Weddings, Birthdays)</SelectItem>
                    <SelectItem value="ticketed">Ticketed (Concerts, Sports)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.eventType === 'full-service' 
                    ? 'Complete event planning & services' 
                    : 'QR code tickets for attendees'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Total Event Capacity</Label>
                <Input 
                  id="capacity" 
                  type="number" 
                  placeholder="e.g. 500" 
                  value={form.capacity} 
                  onChange={(e) => update("capacity", e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyCapacity">Daily Capacity (Full-Service Only)</Label>
                <Input 
                  id="dailyCapacity" 
                  type="number" 
                  placeholder="e.g. 1" 
                  value={form.dailyCapacity} 
                  onChange={(e) => update("dailyCapacity", e.target.value)} 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.eventType === 'ticketed' && (
                <div className="space-y-2">
                  <Label htmlFor="date">Event Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={form.eventDate} 
                    onChange={(e) => update("eventDate", e.target.value)} 
                    required 
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  placeholder="City, Venue" 
                  value={form.location} 
                  onChange={(e) => update("location", e.target.value)} 
                  required 
                />
              </div>
            </div>
            {form.eventType === 'full-service' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Select Add-ons
                  </h3>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Search service type..." 
                      className="h-8 w-full sm:w-48 text-xs"
                      value={addonSearchTerm}
                      onChange={(e) => setAddonSearchTerm(e.target.value)}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] whitespace-nowrap"
                      onClick={selectAllFilteredAddons}
                    >
                      Select All
                    </Button>
                    {selectedAddons.length > 0 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 whitespace-nowrap"
                        onClick={deselectAllFilteredAddons}
                      >
                        Clear Filtered
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {merchantServices?.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-2">No services found.</p>
                      <Button 
                        type="button" 
                        variant="link" 
                        className="text-primary h-auto p-0"
                        onClick={() => navigate("/dashboard/services")}
                      >
                        Create services in master data first
                      </Button>
                    </div>
                  ) : filteredAddons.length === 0 ? (
                    <div className="p-4 text-center border rounded-lg bg-muted/10">
                      <p className="text-xs text-muted-foreground">No services match your search.</p>
                    </div>
                  ) : (
                    filteredAddons.map((service: any) => {
                      const serviceId = service._id || service.id;
                      const selectedAddon = selectedAddons.find(a => a.serviceId === serviceId);
                      const isSelected = !!selectedAddon;
                      const isCatering = (service.type || service.category || "").toLowerCase().includes('catering');
                      
                      return (
                        <div 
                          key={serviceId} 
                          className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => toggleAddon(service)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <div className="cursor-pointer" onClick={() => toggleAddon(service)}>
                              <p className="font-medium text-sm">{service.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[9px] px-1 h-3.5">
                                  {service.category || service.type}
                                </Badge>
                                {isCatering && (
                                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-[9px] px-1 h-3.5">
                                    Catering (Per Plate)
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">{isCatering ? 'Price/Plate' : 'Price'} (₹)</Label>
                              <Input 
                                type="number" 
                                className="h-8 w-24 text-right"
                                value={selectedAddon.price}
                                onChange={(e) => updateAddonPrice(serviceId, Number(e.target.value))}
                              />
                            </div>
                          )}
                          {!isSelected && (
                            <div className="text-right">
                              <p className="text-xs font-semibold">₹{isCatering ? service.perPlatePrice : service.price}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="image">Banner Image URL</Label>
                <Input 
                  id="image" 
                  placeholder="Main banner image..." 
                  value={form.image} 
                  onChange={(e) => update("image", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery">Gallery Images (comma separated)</Label>
                <Input 
                  id="gallery" 
                  placeholder="img1.jpg, img2.jpg..." 
                  value={form.galleryImages} 
                  onChange={(e) => update("galleryImages", e.target.value)} 
                />
              </div>
            </div>

            {form.eventType === 'ticketed' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ticket Types</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addTicketType}>
                    <Plus className="h-4 w-4 mr-2" /> Add Type
                  </Button>
                </div>
                
                {ticketTypes.map((ticket, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4 relative bg-muted/5">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-destructive"
                      onClick={() => removeTicketType(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ticket Name</Label>
                        <Input 
                          placeholder="e.g. VIP, Regular" 
                          value={ticket.name} 
                          onChange={(e) => updateTicketType(index, "name", e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input 
                          type="number" 
                          min={1} 
                          value={ticket.quantity} 
                          onChange={(e) => updateTicketType(index, "quantity", e.target.value)} 
                          required 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price (₹)</Label>
                        <Input 
                          type="number" 
                          min={0} 
                          value={ticket.price} 
                          onChange={(e) => updateTicketType(index, "price", e.target.value)} 
                          required 
                        />
                      </div>
                      {ticket.remainingQuantity !== undefined && (
                        <div className="space-y-2">
                          <Label>Remaining</Label>
                          <Input 
                            value={ticket.remainingQuantity} 
                            disabled
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <Button 
                type="submit" 
                className="flex-1 gradient-primary text-primary-foreground" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Event"
                )}
              </Button>
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard/events")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditEventPage;
