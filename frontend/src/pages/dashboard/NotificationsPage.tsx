import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { 
  Bell, 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Gift,
  AlertCircle,
  Search,
  Filter,
  ExternalLink
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// Notification types
type NotificationType = 'booking' | 'payment' | 'event' | 'reminder' | 'offer';

interface Notification {
  id: string;
  _id?: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  bookingId?: string;
  eventId?: string;
  actionUrl?: string;
}

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | NotificationType>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const queryClient = useQueryClient();

  // Fetch real notifications from API
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const response = await api.get<Notification[]>(`/notifications?userId=${user?.id}`);
      return response.data;
    },
    enabled: !!user?.id,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const handleNotificationClick = async (notification: Notification) => {
    // 1. Mark as read if it's unread
    if (!notification.isRead) {
      await markAsReadMutation.mutateAsync(notification._id || notification.id);
    }

    // 2. Navigate based on notification type
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      const link = getRelatedLink(notification);
      if (link !== '#') {
        navigate(link);
      }
    }
  };

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/notifications/read-all?userId=${user?.id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      toast.success("All notifications marked as read");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to mark all as read");
    },
  });

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification: Notification) => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          notification.message.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || notification.type === filterType;
      const matchesUnread = !showOnlyUnread || !notification.isRead;
      
      return matchesSearch && matchesType && matchesUnread;
    });
  }, [notifications, searchTerm, filterType, showOnlyUnread]);

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    bookings: notifications.filter((n: Notification) => n.type === 'booking').length,
    payments: notifications.filter((n: Notification) => n.type === 'payment').length,
  };

  const getNotificationIcon = (type: NotificationType) => {
    const baseClasses = "h-10 w-10 rounded-full flex items-center justify-center text-lg";
    
    switch (type) {
      case 'booking':
        return <div className={`${baseClasses} bg-blue-100 text-blue-600`}><Calendar className="h-5 w-5" /></div>;
      case 'payment':
        return <div className={`${baseClasses} bg-green-100 text-green-600`}><CreditCard className="h-5 w-5" /></div>;
      case 'reminder':
        return <div className={`${baseClasses} bg-orange-100 text-orange-600`}><Clock className="h-5 w-5" /></div>;
      case 'event':
        return <div className={`${baseClasses} bg-purple-100 text-purple-600`}><AlertCircle className="h-5 w-5" /></div>;
      case 'offer':
        return <div className={`${baseClasses} bg-pink-100 text-pink-600`}><Gift className="h-5 w-5" /></div>;
      default:
        return <div className={`${baseClasses} bg-gray-100`}><Bell className="h-5 w-5" /></div>;
    }
  };

  const getRelatedLink = (notification: Notification) => {
    if (notification.type === 'event' && notification.bookingId && notification.title.includes('Completed')) {
      return `/dashboard/my-bookings?rate=${notification.bookingId}`;
    }
    if (notification.bookingId) {
      return user?.role === 'customer' 
        ? `/dashboard/my-bookings?booking=${notification.bookingId}` 
        : `/dashboard/merchant-bookings`;
    }
    if (notification.eventId) {
      return '/dashboard/browse-events';
    }
    return '#';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Stay updated with your bookings and events</p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Bell className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{stats.unread}</p>
            <p className="text-xs text-muted-foreground">Unread</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{stats.bookings}</p>
            <p className="text-xs text-muted-foreground">Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats.payments}</p>
            <p className="text-xs text-muted-foreground">Payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search notifications..." 
            className="pl-10" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant={filterType === 'all' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterType('all')}
        >
          All
        </Button>
        <Button 
          variant={filterType === 'booking' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterType('booking')}
        >
          Bookings
        </Button>
        <Button 
          variant={filterType === 'payment' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilterType('payment')}
        >
          Payments
        </Button>
        <Button 
          variant={showOnlyUnread ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setShowOnlyUnread(!showOnlyUnread)}
        >
          Unread Only
        </Button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Clock className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {showOnlyUnread || searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your filters' 
                  : "You're all caught up!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification: Notification) => (
            <Card 
              key={notification._id || notification.id} 
              className={`transition-all duration-200 cursor-pointer hover:shadow-md hover:bg-muted/30 ${!notification.isRead ? 'border-l-4 border-l-primary shadow-sm bg-primary/5' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {getNotificationIcon(notification.type)}
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-semibold ${!notification.isRead ? 'text-primary' : ''}`}>
                          {notification.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <Badge variant="default" className="text-[10px] h-5">New</Badge>
                        )}
                        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {notification.createdAt ? (
                          (() => {
                            try {
                              const date = new Date(notification.createdAt);
                              if (isNaN(date.getTime())) return 'Recently';
                              return formatDistanceToNow(date, { addSuffix: true });
                            } catch {
                              return 'Recently';
                            }
                          })()
                        ) : 'Recently'}
                      </span>
                      
                      {!notification.isRead && (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="h-7 text-xs font-semibold"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification._id || notification.id);
                          }}
                        >
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
