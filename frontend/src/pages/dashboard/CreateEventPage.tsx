import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, Loader2, Plus, Trash2, MapPin, Locate, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useLanguage } from "@/contexts/LanguageContext";

// Fix Leaflet icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationSelector({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface TicketType {
  name: string;
  price: string;
  quantity: string;
}

interface Addon {
  serviceId: string;
  name: string;
  price: number;
  category: string;
}

const CreateEventPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    price: "0",
    maxPrice: "0",
    location: "",
    manualLocation: "",
    liveLocation: { lat: 17.385, lng: 78.4867, address: "" },
    eventDate: "",
    capacity: "",
    dailyCapacity: "1",
    image: "",
    galleryImages: "",
    eventType: "full-service",
    isLiveStream: false,
    liveStreamUrl: "",
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    { name: "Regular Ticket", price: "0", quantity: "100" }
  ]);

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

  const updateLiveLocation = async (lat: number, lng: number, address: string) => {
    let finalAddress = address;
    if (!address) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        finalAddress = data.display_name;
      } catch (error) {
        console.error("Error fetching address:", error);
      }
    }
    
    setForm(prev => ({
      ...prev,
      liveLocation: { lat, lng, address: finalAddress },
      location: finalAddress || prev.location,
      manualLocation: finalAddress || prev.manualLocation
    }));
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

  const mutation = useMutation({
    mutationFn: async (newEvent: any) => {
      const response = await api.post('/events', newEvent);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(`Event "${form.title}" created successfully!`);
      console.log('Event created:', data);
      navigate("/dashboard/events");
    },
    onError: (error: any) => {
      console.error('Event creation error:', error);
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.message || "Failed to create event");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate user authentication
    if (!user?.id) {
      toast.error("You must be logged in to create an event.");
      return;
    }
    
    // Validate category selection
    if (!form.categoryId) {
      toast.error("Please select a category.");
      return;
    }
    
    // Validate required fields
    if (!form.title || !form.description || !form.location || (form.eventType === 'ticketed' && !form.eventDate) || !form.capacity) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    // Validate capacity is a positive number
    const capacityNum = Number(form.capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      toast.error("Capacity must be a positive number.");
      return;
    }
    
    // Validate price is non-negative
    const priceNum = Number(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Price must be zero or positive.");
      return;
    }
    
    // Prepare event data with proper types
    const eventData: any = {
      title: form.title.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      price: priceNum,
      maxPrice: Number(form.maxPrice) || 0,
      location: form.location.trim(),
      locationDetails: {
        liveLocation: form.liveLocation,
        manualLocation: form.manualLocation.trim()
      },
      eventDate: form.eventType === 'ticketed' ? new Date(form.eventDate).toISOString() : null,
      capacity: capacityNum,
      dailyCapacity: Number(form.dailyCapacity) || 1,
      organizerId: user.id,
      organizerName: user.name || "Unknown Organizer",
      status: "upcoming" as const,
      image: form.image.trim() || "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
      images: form.galleryImages.split(',').map(img => img.trim()).filter(img => img !== ""),
      eventType: form.eventType,
      isLiveStream: form.isLiveStream,
      liveStreamUrl: form.liveStreamUrl.trim(),
      addons: selectedAddons,
    };

    if (form.eventType === 'ticketed') {
      eventData.ticketTypes = ticketTypes.map(t => ({
        name: t.name,
        price: Number(t.price),
        quantity: Number(t.quantity)
      }));
    }
    
    console.log('Creating event with data:', eventData);
    mutation.mutate(eventData);
  };

  const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-display font-bold mb-6">
        <PlusCircle className="inline h-6 w-6 mr-2 text-primary" />
        {t('create_event')}
      </h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">{t('event_title_label')}</Label>
              <Input id="title" placeholder={t('event_title_placeholder')} value={form.title} onChange={(e) => update("title", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">{t('description_label')}</Label>
              <Textarea id="desc" placeholder={t('description_placeholder')} rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} required />
            </div>
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Live Streaming
                </Label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="isLiveStream" 
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={form.isLiveStream}
                    onChange={(e) => update("isLiveStream", e.target.checked)}
                  />
                  <Label htmlFor="isLiveStream" className="text-sm font-medium">Enable Live Stream</Label>
                </div>
              </div>
              {form.isLiveStream && (
                <div className="space-y-2">
                  <Label htmlFor="liveStreamUrl">Live Stream URL (YouTube Live / external link)</Label>
                  <Input 
                    id="liveStreamUrl" 
                    placeholder="https://www.youtube.com/live/..." 
                    value={form.liveStreamUrl} 
                    onChange={(e) => update("liveStreamUrl", e.target.value)} 
                    required={form.isLiveStream}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('category_label')}</Label>
                <Select 
                  value={form.categoryId} 
                  onValueChange={(value) => update("categoryId", value)}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={categoriesLoading ? t('category_placeholder_loading') : t('category_placeholder_select')} />
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
                <Label htmlFor="eventType">{t('event_type_label')}</Label>
                <Select value={form.eventType} onValueChange={(v) => update("eventType", v)}>
                  <SelectTrigger><SelectValue placeholder={t('event_type_placeholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-service">{t('full_service_type')}</SelectItem>
                    <SelectItem value="ticketed">{t('ticketed_type')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {form.eventType === 'full-service' 
                    ? t('full_service_desc') 
                    : t('ticketed_desc')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Max Guests</Label>
                <Input id="capacity" type="number" min={1} placeholder="100" value={form.capacity} onChange={(e) => update("capacity", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> {t('event_location')}
              </Label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">{t('general_location')}</Label>
                  <Input id="location" placeholder="e.g. Hyderabad, HITEX" value={form.location} onChange={(e) => update("location", e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('live_location')}</Label>
                  <div className="h-[300px] w-full rounded-xl overflow-hidden border">
                    <MapContainer
                      center={[form.liveLocation.lat, form.liveLocation.lng]}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[form.liveLocation.lat, form.liveLocation.lng]} />
                      <LocationSelector 
                        onLocationSelect={(lat, lng) => {
                          updateLiveLocation(lat, lng, "");
                          toast.info(`Location selected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                        }} 
                      />
                    </MapContainer>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((pos) => {
                            updateLiveLocation(pos.coords.latitude, pos.coords.longitude, "");
                          });
                        }
                      }}
                    >
                      <Locate className="h-3 w-3 mr-1" /> {t('use_my_location')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualLocation">{t('manual_address')}</Label>
                  <Textarea 
                    id="manualLocation" 
                    placeholder="Enter full address manually..." 
                    value={form.manualLocation} 
                    onChange={(e) => update("manualLocation", e.target.value)} 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">
                  {form.eventType === 'ticketed' ? 'Base Ticket Price (₹)' : 'Starting Price (₹)'}
                </Label>
                <div className="flex items-center gap-2">
                  <Input id="price" type="number" min={0} placeholder="500" value={form.price} onChange={(e) => update("price", e.target.value)} required />
                  {form.eventType === 'full-service' && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">-</span>
                      <Input id="maxPrice" type="number" min={0} placeholder="Max Price" value={form.maxPrice} onChange={(e) => update("maxPrice", e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
              {form.eventType === 'full-service' && (
                <div className="space-y-2">
                  <Label htmlFor="dailyCapacity">Daily Capacity</Label>
                  <Input id="dailyCapacity" type="number" min={1} placeholder="2" value={form.dailyCapacity} onChange={(e) => update("dailyCapacity", e.target.value)} required />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {form.eventType === 'ticketed' && (
                <div className="space-y-2">
                  <Label htmlFor="date">Event Date</Label>
                  <Input id="date" type="date" value={form.eventDate} onChange={(e) => update("eventDate", e.target.value)} required />
                </div>
              )}
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
                              {isCatering && <p className="text-[9px] text-muted-foreground">per guest</p>}
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
                <Input id="image" placeholder="Main banner image..." value={form.image} onChange={(e) => update("image", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery">Gallery Images (comma separated)</Label>
                <Input id="gallery" placeholder="img1.jpg, img2.jpg..." value={form.galleryImages} onChange={(e) => update("galleryImages", e.target.value)} />
              </div>
            </div>

            {form.eventType === 'ticketed' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ticket Types</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addTicketType}>
                    <Plus className="h-4 w-4 mr-1" /> Add Ticket Type
                  </Button>
                </div>
                
                {ticketTypes.map((ticket, index) => (
                  <div key={index} className="space-y-4 p-4 border rounded-lg bg-muted/30 relative">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-destructive"
                      onClick={() => removeTicketType(index)}
                      disabled={ticketTypes.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('ticket_type_name')}</Label>
                        <Input 
                          placeholder="e.g. VIP" 
                          value={ticket.name} 
                          onChange={(e) => updateTicketType(index, "name", e.target.value)} 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('price')} (₹)</Label>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={ticket.price} 
                          onChange={(e) => updateTicketType(index, "price", e.target.value)} 
                          required 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>{t('ticket_type_quantity')}</Label>
                        <Input 
                          type="number" 
                          placeholder="e.g. 100" 
                          value={ticket.quantity} 
                          onChange={(e) => updateTicketType(index, "quantity", e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateEventPage;