import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./components/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import BookingsPage from "./pages/dashboard/BookingsPage";
import MyBookingsPage from "./pages/dashboard/MyBookingsPage";
import BillingPaymentsPage from "./pages/dashboard/BillingPaymentsPage";
import NotificationsPage from "./pages/dashboard/NotificationsPage";
import GalleryPage from "./pages/dashboard/GalleryPage";
import SavedEventsPage from "./pages/dashboard/SavedEventsPage";
import ProfileSettingsPage from "./pages/dashboard/ProfileSettingsPage";
import MerchantProfile from "./pages/dashboard/MerchantProfile";
import SupportHelpPage from "./pages/dashboard/SupportHelpPage";
import BrowseEventsPage from "./pages/dashboard/BrowseEventsPage";
import EventsListPage from "./pages/dashboard/EventsListPage";
import CreateEventPage from "./pages/dashboard/CreateEventPage";
import EditEventPage from "./pages/dashboard/EditEventPage";
import UsersPage from "./pages/dashboard/UsersPage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import LiveEventsPage from "./pages/dashboard/LiveEventsPage";
import CalendarPage from "./pages/dashboard/CalendarPage";
import ServicesPage from "./pages/dashboard/ServicesPage";
import CategoriesPage from "./pages/dashboard/CategoriesPage";
import ServiceTypesPage from "./pages/dashboard/ServiceTypesPage";
import AdminPaymentAnalyticsPage from "./pages/dashboard/AdminPaymentAnalyticsPage";
import MerchantSetup from "./pages/MerchantSetup";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import FinalBillPage from "./pages/dashboard/FinalBillPage";
import BookServicePage from "@/pages/BookServicePage";
import BookingPage from "@/pages/BookingPage";
import BookFullServicePage from "@/pages/BookFullServicePage";
import BookTicketedEventPage from "@/pages/BookTicketedEventPage";
import TicketAnalyticsPage from "./pages/dashboard/TicketAnalyticsPage";
import VendorProfilePage from "@/pages/VendorProfilePage";

import MainLayout from "./components/MainLayout";
import MessagesPage from "./pages/dashboard/MessagesPage";

import { LanguageProvider } from "@/contexts/LanguageContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          <SocketProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/events" element={<BrowseEventsPage />} />
                  <Route path="/vendors" element={<BrowseEventsPage />} />
                  <Route path="/gallery" element={<GalleryPage />} />
                  <Route path="/packages" element={<BrowseEventsPage />} />
                  <Route path="/blog" element={<Index />} />
                  <Route path="/book/:type/:id" element={<BookingPage />} />
                  <Route path="/book-full-service/:id" element={<BookFullServicePage />} />
                  <Route path="/book-ticketed-event/:id" element={<BookTicketedEventPage />} />
                  <Route path="/book-service/:id" element={<BookServicePage />} />
                  <Route path="/vendor/:id" element={<VendorProfilePage />} />
                </Route>
                
                <Route path="/login" element={<LoginPage />} />
                <Route path="/merchant-setup" element={<MerchantSetup />} />

                {/* Protected Dashboard Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardHome />} />

                    {/* Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                      <Route path="users" element={<UsersPage />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="all-bookings" element={<BookingsPage />} />
                      <Route path="payments" element={<AdminPaymentAnalyticsPage />} />
                    </Route>

                    {/* Shared Merchant & Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['admin', 'organizer', 'merchant']} />}>
                      <Route path="live-events" element={<LiveEventsPage />} />
                    </Route>

                    {/* Merchant & Admin Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['organizer', 'admin', 'merchant']} />}>
                      <Route path="events" element={<EventsListPage />} />
                      <Route path="events/create" element={<CreateEventPage />} />
                      <Route path="events/edit/:id" element={<EditEventPage />} />
                      <Route path="merchant-bookings" element={<BookingsPage />} />
                      <Route path="messages" element={<MessagesPage />} />
                      <Route path="categories" element={<CategoriesPage />} />
                      <Route path="service-types" element={<ServiceTypesPage />} />
                      <Route path="services" element={<ServicesPage />} />
                      <Route path="services/:serviceType" element={<ServicesPage />} />
                      <Route path="gallery" element={<GalleryPage />} />
                      <Route path="ticket-analytics" element={<TicketAnalyticsPage />} />
                    </Route>

                    <Route path="my-bookings" element={<MyBookingsPage />} />
                    <Route path="billing-payments" element={<BillingPaymentsPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="saved-events" element={<SavedEventsPage />} />
                    <Route path="profile-settings" element={<ProfileSettingsPage />} />
                    <Route path="profile" element={<ProfileSettingsPage />} />
                    <Route path="merchant-profile" element={<MerchantProfile />} />
                    <Route path="support-help" element={<SupportHelpPage />} />
                    <Route path="calendar" element={<CalendarPage />} />
                    <Route path="final-bill/:id" element={<FinalBillPage />} />
                    <Route path="browse-events" element={<BrowseEventsPage />} />
                    
                    {/* Customer Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
                      <Route path="customer-gallery" element={<GalleryPage />} />
                      <Route path="help-support" element={<SupportHelpPage />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
