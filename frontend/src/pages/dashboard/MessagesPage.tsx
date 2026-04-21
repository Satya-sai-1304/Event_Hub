import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mail, User, Clock, Trash2, CheckCircle2, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const MessagesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', user?.id || user?._id],
    queryFn: async () => {
      const response = await api.get('/messages', {
        params: { userId: user?.id || user?._id }
      });
      return response.data;
    },
    enabled: !!(user?.id || user?._id),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // For now we just mark as read since we don't have a delete route yet
      await api.patch(`/messages/${id}/read`); 
    },
    onSuccess: () => {
      toast.success("Message dismissed");
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            Customer Messages
          </h1>
          <p className="text-muted-foreground">Manage your inquiries and customer communications</p>
        </div>
        <Badge variant="secondary" className="px-4 py-1 text-sm font-semibold">
          {messages?.filter((m: any) => !m.isRead).length || 0} New Messages
        </Badge>
      </div>

      <div className="grid gap-4">
        {messages && messages.length > 0 ? (
          messages.map((message: any) => (
            <Card 
              key={message._id || message.id} 
              className={`overflow-hidden transition-all border-none shadow-sm hover:shadow-md ${!message.isRead ? 'ring-1 ring-primary/20 bg-primary/5' : 'bg-card'}`}
              onClick={() => !message.isRead && markAsReadMutation.mutate(message._id || message.id)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  <div className={`w-1 md:w-2 ${!message.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
                            {message.senderName}
                            {!message.isRead && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {message.eventTitle && (
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                {message.eventTitle}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(message.createdAt), 'MMM d, yyyy • h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {message.type === 'call' && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Call Request</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(message._id || message.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="bg-background/50 rounded-2xl p-4 mb-4 border border-border/50">
                      <p className="text-gray-700 leading-relaxed italic">
                        "{message.message}"
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-dashed">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                          <Mail className="h-4 w-4" />
                          {message.senderEmail || 'No email provided'}
                        </div>
                      </div>
                      <Button 
                        className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (message.senderEmail) window.location.href = `mailto:${message.senderEmail}`;
                        }}
                      >
                        Reply via Email
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <h3 className="text-xl font-display font-bold text-muted-foreground">No Messages Yet</h3>
              <p className="text-muted-foreground max-w-xs mt-2">
                When customers contact you from your profile or the dashboard, their inquiries will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
