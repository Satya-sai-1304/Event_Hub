// Mock data and types for the Event Management System

import { ReactNode } from "react";

export type UserRole = "admin" | "organizer" | "customer" | "merchant";

export interface User {
  _id: string;
  location: { lat: number; lng: number; };
  images: any[];
  services: any[];
  bio: any;
  description: any;
  address: string;
  phone: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  profileImage?: string;
  isApproved?: boolean;
  status?: 'active' | 'invited' | 'blocked';
  createdAt: string;
}

export interface EventCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type EventStatus = "upcoming" | "live" | "completed" | "cancelled" | "suspended" | "active";

export interface Event {
  _id: string;
  type: string;
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId?: any;
  price: number;
  location: string;
  eventDate: string;
  image: string;
  status: EventStatus;
  organizerId: string;
  organizerName: string;
  capacity: number;
  dailyCapacity?: number;
  createdAt: string;
  featured?: boolean;
  isSoldOut?: boolean;
  
  // Event type: determines the booking flow
  eventType?: 'full-service' | 'ticketed' | 'service';
  
  // For ticketed events (concerts, sports)
  ticketInfo?: {
    qrCodeEnabled?: boolean;
    ticketUrl?: string;
    seatingChart?: string;
  };

  // Ticket types for ticketed events
  ticketTypes?: {
    name: string;
    price: number;
    quantity: number;
    remainingQuantity: number;
    earlyBirdPrice?: number;
    earlyBirdEndDate?: string;
    soldCount?: number;
  }[];
  
  // Services included in the event package
  services?: {
    food?: boolean;
    snacks?: boolean;
    decoration?: boolean;
    photography?: boolean;
    music?: boolean;
    entertainment?: boolean;
  };
  
  // Additional event details
  highlights?: string[];
  images?: string[];
  
  // Decoration themes available for this event
  decorationThemes?: DecorationTheme[];
}

export interface DecorationTheme {
  name: string;
  image: string;
  description: string;
}

export type BookingStatus = "pending" | "approved" | "pending_admin" | "pending_merchant_approval" | "pending_billing" | "handed_to_merchant" | "pending_merchant" | "merchant_planning" | "assigned" | "accepted" | "rejected" | "plan_sent" | "customer_update_requested" | "completed" | "bill_sent" | "billed" | "payment_pending" | "advance_paid" | "paid" | "confirmed" | "used" | "cancelled";

export interface Booking {
  selectedServices: any;
  paymentStage: string;
  remainingAmount: number;
  paidAmount: number;
  paymentStatus: string;
  advanceAmount: number;
  advancePaid?: number;
  merchantMessage: string;
  customerPhone: string;
  couponCode: any;
  location: string;
  rating: ReactNode;
  id: string;
  _id?: string;
  eventId: string;
  serviceId?: string;
  eventTitle: string;
  serviceName?: string;
  event?: any;
  service?: any;
  eventType?: 'full-service' | 'ticketed' | 'service';
  customerId: string;
  customerName: string;
  customerEmail: string;
  eventDate: string;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  organizerId?: string;
  timeSlot?: 'day' | 'night';
  additionalCost?: number;
  finalAmount?: number;
  billQrCode?: string;
  qrCode?: string;
  ticketId?: string;
  quantity?: number;
  totalAmount?: number;
  ticketType?: string;
  selectedTickets?: { name: string; quantity: number }[];
  createdAt: string;
  isRated?: boolean;
  
  // Refund details
  refundStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  refundReason?: string;
  refundAmount?: number;
  refundedAt?: string;
  refundTransactionId?: string;
  
  // Selected add-ons for full-service events (new architecture)
  selectedAddons?: string[];
  
  // Customer requirements for full-service events
  customerRequirements?: {
    eventDate?: string;
    timeSlot?: 'day' | 'night';
    numberOfGuests?: number;
    decorationTheme?: string;
    decorationThemeImage?: string;
    foodType?: string;
    musicOption?: string;
    additionalNotes?: string;
  };
  
  // Billing details for itemized costs
  billingDetails?: {
    addons?: {
      name: string;
      price: number;
      category: string;
    }[];
    decorationCost?: number;
    cateringCost?: number;
    musicCost?: number;
    lightingCost?: number;
    additionalCharges?: number;
    subtotal?: number;
    tax?: number;
    finalTotal?: number;
    costPerPlate?: number;
    guestCount?: number;
  };
  
  // Event plan (for full-service events)
  eventPlan?: {
    theme?: string;
    decoration?: string;
    menuItems?: string[];
    photography?: boolean;
    musicDJ?: boolean;
    entertainment?: string[];
    specialRequests?: string;
    estimatedPrice?: number;
  };
}

export const categories: EventCategory[] = [
  { id: "1", name: "Wedding", icon: "💒", color: "hsl(340, 82%, 52%)" },
  { id: "2", name: "Birthday", icon: "🎂", color: "hsl(38, 92%, 50%)" },
  { id: "3", name: "Corporate", icon: "🏢", color: "hsl(210, 100%, 52%)" },
  { id: "4", name: "Cultural", icon: "🎭", color: "hsl(262, 83%, 58%)" },
  { id: "5", name: "Concert", icon: "🎵", color: "hsl(152, 69%, 40%)" },
  { id: "6", name: "Sports", icon: "⚽", color: "hsl(15, 85%, 55%)" },
  { id: "7", name: "Workshop", icon: "📚", color: "hsl(190, 75%, 45%)" },
  { id: "8", name: "Festival", icon: "🎪", color: "hsl(290, 70%, 55%)" },
];

export const mockEvents: Event[] = [
  {
    _id: "1",
    id: "1",
    type: "event",
    eventType: "full-service",
    title: "Grand Summer Wedding Celebration",
    description: "An elegant outdoor wedding with beautiful decorations, live music, and gourmet catering. Perfect for creating unforgettable memories.",
    category: "Wedding",
    price: 5000,
    location: "Rosewood Gardens, Mumbai",
    eventDate: "2026-04-15",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    status: "upcoming",
    organizerId: "org1",
    organizerName: "Elite Events Co.",
    capacity: 300,
    dailyCapacity: 2,
    createdAt: "2026-01-10",
  },
  {
    _id: "2",
    id: "2",
    type: "event",
    eventType: "ticketed",
    title: "Tech Innovation Summit 2026",
    description: "Join industry leaders for a day of inspiring talks, workshops, and networking. Explore the future of AI, blockchain, and more.",
    category: "Corporate",
    price: 200,
    location: "Convention Center, Bangalore",
    eventDate: "2026-05-20",
    image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    status: "upcoming",
    organizerId: "org2",
    organizerName: "TechMeet India",
    capacity: 500,
    createdAt: "2026-02-01",
  },
  {
    _id: "3",
    id: "3",
    type: "event",
    eventType: "ticketed",
    title: "Bollywood Night Live Concert",
    description: "Experience the magic of Bollywood with live performances from top artists. Dance, music, and an unforgettable night awaits!",
    category: "Concert",
    price: 150,
    location: "Phoenix Arena, Delhi",
    eventDate: "2026-03-28",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    status: "upcoming",
    organizerId: "org1",
    organizerName: "Elite Events Co.",
    capacity: 1000,
    createdAt: "2026-01-20",
  },
  {
    _id: "4",
    id: "4",
    type: "event",
    eventType: "full-service",
    title: "Kids Birthday Bash — Superhero Theme",
    description: "A fun-filled superhero-themed birthday party with games, magic shows, face painting, and delicious treats for the little ones.",
    category: "Birthday",
    price: 800,
    location: "FunZone Park, Pune",
    eventDate: "2026-04-05",
    image: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80",
    status: "upcoming",
    organizerId: "org3",
    organizerName: "Party Planners Plus",
    capacity: 50,
    createdAt: "2026-02-15",
  },
  {
    _id: "5",
    id: "5",
    type: "event",
    eventType: "ticketed",
    title: "Diwali Cultural Festival",
    description: "Celebrate the festival of lights with traditional dance performances, rangoli competitions, lantern making, and authentic cuisine.",
    category: "Cultural",
    price: 50,
    location: "Heritage Grounds, Jaipur",
    eventDate: "2026-10-20",
    image: "https://images.unsplash.com/photo-1574974500056-e5bd90b8d855?w=800&q=80",
    status: "upcoming",
    organizerId: "org2",
    organizerName: "TechMeet India",
    capacity: 2000,
    createdAt: "2026-03-01",
  },
  {
    _id: "6",
    id: "6",
    type: "event",
    eventType: "ticketed",
    title: "Marathon for a Cause",
    description: "Join thousands of runners in this charity marathon. Multiple categories available — 5K, 10K, half marathon, and full marathon.",
    category: "Sports",
    price: 30,
    location: "Marine Drive, Mumbai",
    eventDate: "2026-06-12",
    image: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=800&q=80",
    status: "upcoming",
    organizerId: "org3",
    organizerName: "Party Planners Plus",
    capacity: 5000,
    createdAt: "2026-02-20",
  },
];

export const mockBookings: Booking[] = [
  {
      id: "b1",
      eventId: "1",
      eventTitle: "Grand Summer Wedding Celebration",
      customerId: "c1",
      customerName: "Rahul Sharma",
      customerEmail: "rahul@example.com",
      eventDate: "2026-04-15",
      guests: 150,
      totalPrice: 5000,
      status: "accepted",
      organizerId: "org1",
      createdAt: "2026-02-10",
      rating: undefined,
      paymentStatus: "",
      advanceAmount: 0,
      merchantMessage: "",
      customerPhone: "",
      couponCode: undefined,
      location: "",
      paymentStage: "",
      remainingAmount: 0,
      paidAmount: 0
  },
  {
      id: "b2",
      eventId: "2",
      eventTitle: "Tech Innovation Summit 2026",
      customerId: "c2",
      customerName: "Priya Patel",
      customerEmail: "priya@example.com",
      eventDate: "2026-05-20",
      guests: 3,
      totalPrice: 600,
      status: "pending",
      organizerId: "org2",
      createdAt: "2026-02-28",
      rating: undefined,
      paymentStatus: "",
      advanceAmount: 0,
      merchantMessage: "",
      customerPhone: "",
      couponCode: undefined,
      location: "",
      paymentStage: "",
      remainingAmount: 0,
      paidAmount: 0
  },
  {
      id: "b3",
      eventId: "3",
      eventTitle: "Bollywood Night Live Concert",
      customerId: "c1",
      customerName: "Rahul Sharma",
      customerEmail: "rahul@example.com",
      eventDate: "2026-03-28",
      guests: 4,
      totalPrice: 600,
      status: "pending",
      organizerId: "org1",
      createdAt: "2026-03-01",
      rating: undefined,
      paymentStatus: "",
      advanceAmount: 0,
      merchantMessage: "",
      customerPhone: "",
      couponCode: undefined,
      location: "",
      paymentStage: "",
      remainingAmount: 0,
      paidAmount: 0
  },
];

export const mockUsers: User[] = [
  {
    id: "admin1", name: "Admin User", email: "admin@eventpro.com", role: "admin", createdAt: "2025-01-01",
    _id: "",
    location: {
      lat: 0,
      lng: 0
    },
    images: [],
    services: [],
    bio: undefined,
    description: undefined,
    address: "",
    phone: ""
  },
  {
    id: "org1", name: "Elite Events Co.", email: "elite@events.com", role: "organizer", isApproved: true, createdAt: "2025-06-01",
    _id: "",
    location: {
      lat: 0,
      lng: 0
    },
    images: [],
    services: [],
    bio: undefined,
    description: undefined,
    address: "",
    phone: ""
  },
  {
    id: "org2", name: "TechMeet India", email: "tech@meet.com", role: "organizer", isApproved: true, createdAt: "2025-08-15",
    _id: "",
    location: {
      lat: 0,
      lng: 0
    },
    images: [],
    services: [],
    bio: undefined,
    description: undefined,
    address: "",
    phone: ""
  },
  {
    id: "org3", name: "Party Planners Plus", email: "party@planners.com", role: "organizer", isApproved: false, createdAt: "2026-01-20",
    _id: "",
    location: {
      lat: 0,
      lng: 0
    },
    images: [],
    services: [],
    bio: undefined,
    description: undefined,
    address: "",
    phone: ""
  },
  {
    id: "c1", name: "Rahul Sharma", email: "rahul@example.com", role: "customer", createdAt: "2025-09-10",
    _id: "",
    location: {
      lat: 0,
      lng: 0
    },
    images: [],
    services: [],
    bio: undefined,
    description: undefined,
    address: "",
    phone: ""
  },
  {
    id: "c2", name: "Priya Patel", email: "priya@example.com", role: "customer", createdAt: "2025-11-05",
    _id: "",
    location: {
      lat: 0,
      lng: 0
    },
    images: [],
    services: [],
    bio: undefined,
    description: undefined,
    address: "",
    phone: ""
  },
];
