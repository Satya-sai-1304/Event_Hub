import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Loader2, Tags, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  _id: string;
  name: string;
  description?: string;
}

interface ServiceType {
  _id: string;
  name: string;
  categoryId: string | { _id: string; name: string };
}

const CategoriesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  
  // Category Dialog State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });

  // Service Type Dialog State
  const [isServiceTypeDialogOpen, setIsServiceTypeDialogOpen] = useState(false);
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null);
  const [serviceTypeForm, setServiceTypeForm] = useState({ name: "" });

  // Fetch Categories - WITH MERCHANT ISOLATION
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data;
    },
    enabled: !!user?.id
  });

  // Fetch Service Types - WITH MERCHANT ISOLATION
  const { data: serviceTypes, isLoading: isServiceTypesLoading } = useQuery<ServiceType[]>({
    queryKey: ['service-types', user?.id],
    queryFn: async () => {
      const response = await api.get('/service-types');
      return response.data;
    },
    enabled: !!user?.id
  });

  // Category Mutations - WITH MERCHANT ID
  const categoryMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingCategory) {
        return api.put(`/categories/${editingCategory._id}`, data);
      }
      // Backend will use req.user.id from session
      return api.post('/categories', { ...data, isGlobal: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully!`);
      setIsCategoryDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save category");
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast.success("Category deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  });

  // Service Type Mutations - WITH MERCHANT ID
  const serviceTypeMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingServiceType) {
        // Note: Update not implemented in backend yet, so we'll just focus on create for now
        // or we could add it. For now let's just do create.
        return api.post('/service-types', data);
      }
      // Backend will use req.user.id from session, isGlobal=true for service types
      return api.post('/categories', { 
        ...data, 
        isGlobal: true // Service types are stored as categories with isGlobal=true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast.success("Service Type created successfully!");
      setIsServiceTypeDialogOpen(false);
      resetServiceTypeForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save service type");
    }
  });

  const deleteServiceTypeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-types', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
      toast.success("Service Type deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete service type");
    }
  });

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({ name: "", description: "" });
  };

  const resetServiceTypeForm = () => {
    setEditingServiceType(null);
    setServiceTypeForm({ name: "" });
  };

  const handleSubmitCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return toast.error("Name is required");
    categoryMutation.mutate(categoryForm);
  };

  const handleSubmitServiceType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTypeForm.name.trim()) return toast.error("Name is required");
    serviceTypeMutation.mutate(serviceTypeForm);
  };

  if (isCategoriesLoading || isServiceTypesLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Tags className="h-6 w-6 text-primary" />
            Manage Categories & Service Types
          </h1>
          <p className="text-muted-foreground mt-1">Configure categories and their associated service types</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="service-types" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Service Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCategoryDialogOpen} onOpenChange={(open) => {
              setIsCategoryDialogOpen(open);
              if (!open) resetCategoryForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" /> Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitCategory} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-name">Category Name</Label>
                    <Input
                      id="cat-name"
                      placeholder="e.g. Wedding, Birthday"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-desc">Description</Label>
                    <Textarea
                      id="cat-desc"
                      placeholder="Description..."
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={categoryMutation.isPending}>
                      {categoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {editingCategory ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories?.map((cat) => (
                    <TableRow key={cat._id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell>{cat.description || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingCategory(cat);
                          setCategoryForm({ name: cat.name, description: cat.description || "" });
                          setIsCategoryDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                          if (confirm("Are you sure? This will not delete linked service types but they might become orphaned.")) {
                            deleteCategoryMutation.mutate(cat._id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {categories?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="service-types" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isServiceTypeDialogOpen} onOpenChange={(open) => {
              setIsServiceTypeDialogOpen(open);
              if (!open) resetServiceTypeForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" /> Add Service Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service Type</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitServiceType} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="st-name">Service Type Name</Label>
                    <Input
                      id="st-name"
                      placeholder="e.g. Catering, Photography"
                      value={serviceTypeForm.name}
                      onChange={(e) => setServiceTypeForm({ ...serviceTypeForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsServiceTypeDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={serviceTypeMutation.isPending}>
                      {serviceTypeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes?.map((st) => (
                    <TableRow key={st._id}>
                      <TableCell className="font-medium">{st.name}</TableCell>
                      <TableCell>
                        {typeof st.categoryId === 'object' ? st.categoryId.name : 
                          categories?.find(c => c._id === st.categoryId)?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => {
                          if (confirm("Are you sure?")) {
                            deleteServiceTypeMutation.mutate(st._id);
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {serviceTypes?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                        No service types found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CategoriesPage;
