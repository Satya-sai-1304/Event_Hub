import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  notificationCount: number;
  pendingBookingsCount: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  notificationCount: 0,
  pendingBookingsCount: 0,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Fetch unread notifications count
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications-count', user?.id || user?._id],
    queryFn: async () => {
      const response = await api.get(`/notifications?userId=${user?.id || user?._id}`);
      return response.data;
    },
    enabled: !!(user?.id || user?._id),
  });

  const notificationCount = notifications.filter((n: any) => !n.isRead).length;

  // Fetch pending bookings count (for merchants)
  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ['pending-bookings-count', user?.id || user?._id],
    queryFn: async () => {
      const endpoint = user?.role === 'admin' ? '/bookings' : `/bookings?merchantId=${user?.id || user?._id}`;
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: !!(user?.id || user?._id) && (user?.role === 'organizer' || user?.role === 'merchant' || user?.role === 'admin'),
  });

  const pendingBookingsCount = bookings.filter((b: any) => b.status === 'pending').length;

  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:5000', {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Socket connected:', newSocket.id);
        newSocket.emit('join_room', user.id || user._id);
      });

      newSocket.on('receive_notification', (notification) => {
        console.log('New notification received:', notification);
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        refetchNotifications();
        toast.info(notification.title || 'New Notification', {
          description: notification.message,
        });
      });

      newSocket.on('booking_status_updated', (data) => {
        console.log('Booking status updated:', data);
        toast.info(`Booking status updated to ${data.status.replace('_', ' ')}`, {
          description: `Booking ID: ${data.bookingId}`,
        });
        refetchBookings();
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      });

      newSocket.on('booking_updated', (data) => {
        console.log('Booking updated:', data);
        refetchBookings();
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['booking', data.bookingId] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      });

      newSocket.on('eventUpdated', (data) => {
        console.log('Event updated:', data);
        queryClient.invalidateQueries({ queryKey: ['events'] });
        queryClient.invalidateQueries({ queryKey: ['event', data.eventId] });
        queryClient.invalidateQueries({ queryKey: ['event-availability', data.eventId] });
        queryClient.invalidateQueries({ queryKey: ['tickets', data.eventId] });
      });

      newSocket.on('seat_updated', (data) => {
        console.log('Seat updated:', data);
        queryClient.invalidateQueries({ queryKey: ['event', data.eventId] });
      });

      newSocket.on('ticket_updated', (data) => {
        console.log('Ticket updated:', data);
        queryClient.invalidateQueries({ queryKey: ['tickets', data.eventId] });
        queryClient.invalidateQueries({ queryKey: ['event', data.eventId] });
      });

      newSocket.on('couponUsed', (data) => {
        console.log('Coupon used:', data);
        queryClient.invalidateQueries({ queryKey: ['coupons'] });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
      setConnected(false);
    }
  }, [user, refetchNotifications, refetchBookings, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, connected, notificationCount, pendingBookingsCount }}>
      {children}
    </SocketContext.Provider>
  );
};
