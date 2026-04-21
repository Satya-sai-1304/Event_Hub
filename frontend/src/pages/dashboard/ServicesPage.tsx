import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Sparkles, Plus, Pencil, Trash2, Loader2, Image as ImageIcon, Utensils, Lightbulb, Music, Grid } from "lucide-react";

interface Service {
  categoryId: string;
  _id: string;
  id: string;
  name: string;
  image: string;
  description: string;
  category: string;
  type: string;
  price: number;
  perPlatePrice?: number;
  minGuests?: number;
  foodType?: 'Veg' | 'Non Veg';
  isActive: boolean;
}

const serviceIcons: Record<string, any> = {
  'Wedding Planning': Sparkles,
  'Birthday Party': Sparkles,
  'Corporate Event': Lightbulb,
  'Engagement': Sparkles,
  'Baby Shower': Sparkles,
  'Anniversary': Sparkles,
  'Housewarming': Sparkles,
};

const ServicesPage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams<{ serviceType: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>(serviceType || "all");

  useEffect(() => {
    if (serviceType) {
      setSelectedType(serviceType);
    }
  }, [serviceType]);

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
    enabled: !!user?.id
  });

  const { data: allServiceTypes = [], isLoading: isServiceTypesLoading } = useQuery({
    queryKey: ['service-types', user?.id],
    queryFn: async () => {
      const response = await api.get('/service-types');
      return response.data;
    },
    enabled: !!user?.id
  });

  const [formData, setFormData] = useState<any>({
    name: '',
    category: '',
    categoryId: '',
    type: '',
    price: undefined,
    perPlatePrice: undefined,
    minGuests: undefined,
    foodType: 'Veg',
    description: '',
    image: '',
  });

  const filteredServiceTypes = useMemo(() => {
    return allServiceTypes;
  }, [allServiceTypes]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      categoryId: '',
      type: '',
      price: undefined,
      perPlatePrice: undefined,
      minGuests: undefined,
      image: '',
      foodType: 'Veg',
    });
    setEditingService(null);
  };

  const { data: services, isLoading } = useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const url = user?.role === 'admin' 
        ? `/services` 
        : `/services?merchantId=${user?.id}`;
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/services', { ...data, merchantId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Service created successfully!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create service");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/services/${data._id || data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Service updated successfully!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update service");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Service deleted successfully!");
    }
  });

  const handleEdit = (service: Service) => {
    setFormData({
      _id: service._id,
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category || '',
      categoryId: service.categoryId || '',
      type: service.type,
      price: service.price,
      perPlatePrice: service.perPlatePrice,
      minGuests: service.minGuests,
      image: service.image,
      foodType: service.foodType || 'Veg',
    });
    setEditingService(service);
    setDialogOpen(true);
  };

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s: Service) => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || s.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [services, searchTerm, selectedType]);

  if (isLoading || isCategoriesLoading || isServiceTypesLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">My Services</h1>
          <p className="text-muted-foreground mt-1">Manage your service offerings and pricing</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Add New Service
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              <DialogDescription>Fill in the details for your service offering.</DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const payload = { ...formData };
              // Clean up empty categoryId to avoid ObjectId cast error in backend
              if (!payload.categoryId) delete payload.categoryId;
              if (!payload.category) delete payload.category;
              
              if (editingService) updateMutation.mutate(payload);
              else createMutation.mutate(payload);
            }} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Premium Catering" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price (₹) {!formData.type?.toLowerCase().includes('catering') && <span className="text-destructive">*</span>}</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    placeholder="Enter price" 
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value ? Number(e.target.value) : 0 })}
                    required={!formData.type?.toLowerCase().includes('catering')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Service Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(val: string) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredServiceTypes.length > 0 ? (
                        filteredServiceTypes.map((st: any) => (
                          <SelectItem key={st._id} value={st.name}>{st.name}</SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          No service types available. <br /> Please create one in Manage Categories.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="Describe your service..." 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Service Image URL</Label>
                <Input 
                  id="image" 
                  placeholder="https://example.com/image.jpg" 
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  required 
                />
              </div>

              {formData.type?.toLowerCase().includes('catering') && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-2">
                    <Label htmlFor="perPlatePrice">Per Plate Price (₹) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="perPlatePrice" 
                      type="number" 
                      placeholder="Enter per plate price" 
                      value={formData.perPlatePrice || ''}
                      onChange={(e) => setFormData({ ...formData, perPlatePrice: e.target.value ? Number(e.target.value) : undefined })}
                      required={formData.type?.toLowerCase().includes('catering')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foodType">Food Type</Label>
                    <Select 
                      value={formData.foodType} 
                      onValueChange={(val: any) => setFormData({ ...formData, foodType: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Veg">Veg</SelectItem>
                        <SelectItem value="Non Veg">Non Veg</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || !formData.type}>
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingService ? 'Update Service' : 'Create Service'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Input 
          placeholder="Search services..." 
          className="md:max-w-xs" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="md:max-w-xs">
            <SelectValue placeholder="Filter by Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Service Types</SelectItem>
            {allServiceTypes.map((st: any) => (
              <SelectItem key={st._id || st.id} value={st.name}>{st.name}</SelectItem>
            ))}
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service: Service) => {
          const Icon = serviceIcons[service.category] || Grid;
          return (
            <Card key={service._id || service.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={service.image} 
                  alt={service.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge className="bg-white/90 backdrop-blur-md text-primary border-none shadow-sm">
                    {service.type}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg leading-none">{service.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {service.category || service.type}
                    </p>
                  </div>
                  <div className="text-right">
                    {service.price > 0 && (
                      <p className="font-bold text-primary">₹{service.price.toLocaleString()}</p>
                    )}
                    {service.perPlatePrice > 0 && (
                      <p className="text-[10px] text-muted-foreground">₹{service.perPlatePrice}/plate</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {service.description}
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEdit(service)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => {
                    if (confirm("Are you sure you want to delete this service?")) {
                      deleteMutation.mutate(service._id || service.id);
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filteredServices.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-bold">No services found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new service.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
