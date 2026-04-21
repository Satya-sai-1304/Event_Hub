import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, PlusCircle, Loader2, Eye, CalendarDays } from "lucide-react";
import { type User, type Event } from "@/data/mockData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import EventCard from "@/components/EventCard";

const UsersPage = () => {
  const queryClient = useQueryClient();
  const [newMerchant, setNewMerchant] = useState({ name: "", email: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<{ id: string; name: string } | null>(null);

  const { data: merchantEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['merchant-events', selectedMerchant?.id],
    queryFn: async () => {
      const response = await api.get<Event[]>('/events');
      return response.data.filter(e => e.organizerId === selectedMerchant?.id);
    },
    enabled: !!selectedMerchant?.id,
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get<User[]>('/users');
      return response.data;
    },
  });

  const addMerchantMutation = useMutation({
    mutationFn: async (merchant: { name: string, email: string }) => {
      return await api.post('/users/add-merchant', merchant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Merchant invitation sent successfully");
      setNewMerchant({ name: "", email: "" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add merchant");
    }
  });

  const handleAddMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    addMerchantMutation.mutate(newMerchant);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">
          <Users className="inline h-6 w-6 mr-2 text-primary" />
          User Management
        </h1>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <PlusCircle className="h-4 w-4 mr-2" /> Add Merchant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Merchant</DialogTitle>
              <DialogDescription>
                An invitation link will be sent to the merchant to set up their account.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMerchant} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="m-name">Merchant Name</Label>
                <Input id="m-name" placeholder="Elite Events Co." value={newMerchant.name} onChange={(e) => setNewMerchant({ ...newMerchant, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-email">Registered Email</Label>
                <Input id="m-email" type="email" placeholder="merchant@example.com" value={newMerchant.email} onChange={(e) => setNewMerchant({ ...newMerchant, email: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={addMerchantMutation.isPending}>
                {addMerchantMutation.isPending ? "Sending Invite..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                    <TableCell>
                      {u.role === "organizer" ? (
                        <Badge variant={u.status === 'active' ? "default" : "secondary"}>
                          {u.status === 'active' ? "Active" : "Invited"}
                        </Badge>
                      ) : (
                        <Badge>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role === "organizer" && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedMerchant({ id: u.id, name: u.name })}>
                          <Eye className="w-4 h-4 mr-2" /> View Events
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedMerchant} onOpenChange={(open) => !open && setSelectedMerchant(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CalendarDays className="mr-2 h-5 w-5 text-primary" />
              {selectedMerchant?.name} — Events
            </DialogTitle>
            <DialogDescription>
              Viewing all events created by this merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {eventsLoading ? (
              <div className="col-span-2 flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : merchantEvents && merchantEvents.length === 0 ? (
              <p className="text-muted-foreground text-center col-span-2 py-8">No events found for this merchant.</p>
            ) : (
              merchantEvents?.map(event => (
                <EventCard key={event.id} event={event} showActions="admin" />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
