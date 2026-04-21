import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Loader2, Settings2 } from "lucide-react";
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

interface ServiceType {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  icon?: string;
  isDefault: boolean;
  merchantId?: string;
  createdAt: string;
}

const ServiceTypesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<{ id: string; name: string; description: string } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: serviceTypes, isLoading } = useQuery<ServiceType[]>({
    queryKey: ["service-types", user?.id],
    queryFn: async () => {
      const response = await api.get("/service-types");
      return response.data;
    },
    enabled: !!user?.id
  });

  const addMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await api.post("/service-types", { 
        ...data, 
        isDefault: false 
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", user?.id] });
      toast.success("Service type created successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create service type");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      const res = await api.patch(`/service-types/${data.id}`, { 
        name: data.name, 
        description: data.description
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", user?.id] });
      toast.success("Service type updated successfully!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update service type");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/service-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-types", user?.id] });
      toast.success("Service type deleted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete service type");
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Service type name is required");
      return;
    }

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, name: form.name, description: form.description });
    } else {
      addMutation.mutate({ name: form.name, description: form.description });
    }
  };

  const resetForm = () => {
    setEditingType(null);
    setForm({ name: "", description: "" });
  };

  const openEdit = (st: ServiceType) => {
    setEditingType({ id: st._id, name: st.name, description: st.description || "" });
    setForm({ name: st.name, description: st.description || "" });
    setIsDialogOpen(true);
  };

  if (isLoading) {
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
            <Settings2 className="h-6 w-6 text-primary" />
            Manage Service Types
          </h1>
          <p className="text-muted-foreground mt-1">Define the types of services available on the platform</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Add Service Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? "Edit Service Type" : "Add New Service Type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Catering, Photography"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Service type description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={addMutation.isPending || updateMutation.isPending}>
                {editingType ? "Update" : "Create"}
              </Button>
            </DialogFooter>
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
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(serviceTypes || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No service types found. Add your first service type to get started!
                  </TableCell>
                </TableRow>
              ) : (serviceTypes || []).map((st) => (
                <TableRow key={st._id || st.id}>
                  <TableCell className="font-medium">{st.name}</TableCell>
                  <TableCell>{st.description || "No description"}</TableCell>
                  <TableCell>
                    {st.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {/* Only allow editing/deleting if it belongs to the current merchant */}
                    {st.merchantId === user?.id && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(st)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this service type?")) {
                              deleteMutation.mutate(st._id || st.id!);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!st.merchantId && !st.isDefault && (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1 bg-muted rounded-full">System</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceTypesPage;
