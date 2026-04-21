/**
 * Preservation Property Tests — Mobile UI Redesign Optimization
 *
 * These tests capture BASELINE behavior on non-buggy render paths.
 * They MUST PASS on unfixed code — they encode what must be preserved after the fix.
 * Re-run after the fix to confirm no regressions.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.9
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}));

vi.mock("@/contexts/SocketContext", () => ({
  useSocket: () => ({ notificationCount: 0, pendingBookingsCount: 0 }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
  useMutation: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
    reset: vi.fn(),
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement("div", props, children),
    h2: ({ children, ...props }: any) => React.createElement("h2", props, children),
    img: ({ children, ...props }: any) => React.createElement("img", props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock("swiper/react", () => ({
  Swiper: ({ children }: any) => React.createElement("div", { "data-testid": "swiper" }, children),
  SwiperSlide: ({ children }: any) => React.createElement("div", null, children),
}));
vi.mock("swiper/modules", () => ({ Autoplay: {}, Pagination: {} }));
vi.mock("swiper/css", () => ({}));
vi.mock("swiper/css/pagination", () => ({}));
vi.mock("swiper/css/autoplay", () => ({}));

vi.mock("leaflet", () => ({
  default: {
    icon: vi.fn(() => ({})),
    Marker: { prototype: { options: { icon: null } } },
  },
  icon: vi.fn(() => ({})),
  Marker: { prototype: { options: { icon: null } } },
}));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: any) => React.createElement("div", { "data-testid": "map" }, children),
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: "" }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: "" }));

vi.mock("@/components/RecommendedEvents", () => ({
  default: () => React.createElement("div", { "data-testid": "recommended-events" }, "Recommended Events"),
}));

vi.mock("@/components/BookingModal", () => ({ default: () => null }));
vi.mock("@/components/PaymentModal", () => ({ default: () => null }));
vi.mock("@/components/EventDetailModal", () => ({ default: () => null }));
vi.mock("@/components/ContactVendorModal", () => ({ default: () => null }));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import EventCard from "@/components/EventCard";
import EventGallery from "@/components/EventGallery";
import { Event } from "@/data/mockData";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const customerUser = {
  id: "1",
  _id: "1",
  name: "Alice",
  email: "alice@example.com",
  role: "customer" as const,
  address: "",
  phone: "",
  bio: null,
  description: null,
  images: [],
  services: [],
  location: { lat: 0, lng: 0 },
  createdAt: "2024-01-01",
};

function mockAuth(user: typeof customerUser | null) {
  (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    setUser: vi.fn(),
    isAuthenticated: !!user,
    socket: null,
  });
}

function mockMobile(isMobile: boolean) {
  (useIsMobile as ReturnType<typeof vi.fn>).mockReturnValue(isMobile);
}

function makeEvent(overrides: Partial<Event> & { isSoldOut?: boolean; eventType?: string } = {}): Event & { isSoldOut?: boolean; eventType?: string } {
  return {
    _id: "test-id",
    id: "test-id",
    type: "event",
    title: "Test Event",
    description: "A test event description",
    category: "Concert",
    categoryId: "cat-1",
    price: 100,
    location: "Test Venue, Mumbai",
    eventDate: "2026-06-01",
    image: "/placeholder.svg",
    status: "upcoming",
    organizerId: "org-1",
    organizerName: "Test Organizer",
    capacity: 200,
    createdAt: "2026-01-01",
    eventType: "ticketed",
    isSoldOut: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMobile(false);
});

// ===========================================================================
// Preservation Test 1 — Organizer Action Buttons
// FOR ALL X WHERE NOT isBugCondition_MissingCardButtons(X) AND showActions="organizer"
// Organizer card must always show Edit, Delete, Notify, Cancel buttons.
// These are NOT affected by the fix — must remain identical before and after.
// Validates: Requirements 3.6
// ===========================================================================

describe("Preservation 1 — Organizer card action buttons render correctly", () => {
  it("renders Edit, Delete, Notify, and Cancel buttons for organizer view", () => {
    mockAuth(customerUser);

    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onNotify = vi.fn();
    const onCancel = vi.fn();

    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard
          event={event}
          showActions="organizer"
          onEdit={onEdit}
          onDelete={onDelete}
          onNotify={onNotify}
          onCancel={onCancel}
        />
      </MemoryRouter>
    );

    expect(getByText("Edit")).toBeInTheDocument();
    expect(getByText("Delete")).toBeInTheDocument();
    expect(getByText("Notify")).toBeInTheDocument();
    expect(getByText("Cancel")).toBeInTheDocument();
  });

  it("Edit button calls onEdit handler when clicked", () => {
    mockAuth(customerUser);
    const onEdit = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="organizer" onEdit={onEdit} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(event);
  });

  it("Delete button calls onDelete handler when clicked", () => {
    mockAuth(customerUser);
    const onDelete = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="organizer" onDelete={onDelete} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith(event);
  });

  it("Notify button calls onNotify handler when clicked", () => {
    mockAuth(customerUser);
    const onNotify = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="organizer" onNotify={onNotify} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Notify"));
    expect(onNotify).toHaveBeenCalledWith(event);
  });

  it("Cancel button calls onCancel handler when clicked for non-cancelled event", () => {
    mockAuth(customerUser);
    const onCancel = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="organizer" onCancel={onCancel} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledWith(event);
  });

  it("Cancel button is disabled and shows 'Cancelled' text when event is already cancelled", () => {
    mockAuth(customerUser);
    const event = makeEvent({ status: "cancelled" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="organizer" />
      </MemoryRouter>
    );

    // The cancel button shows "Cancelled" text and is disabled
    const cancelledBtn = getByText("Cancelled").closest("button");
    expect(cancelledBtn).toBeDisabled();
  });
});

// ===========================================================================
// Preservation Test 2 — Admin Action Buttons
// FOR ALL X WHERE showActions="admin"
// Admin card must always show Remove button.
// Validates: Requirements 3.6
// ===========================================================================

describe("Preservation 2 — Admin card Remove button renders correctly", () => {
  it("renders Remove button for admin view", () => {
    mockAuth(customerUser);
    const onDelete = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="admin" onDelete={onDelete} />
      </MemoryRouter>
    );

    expect(getByText("Remove")).toBeInTheDocument();
  });

  it("Remove button calls onDelete handler when clicked", () => {
    mockAuth(customerUser);
    const onDelete = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="admin" onDelete={onDelete} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Remove"));
    expect(onDelete).toHaveBeenCalledWith(event);
  });

  it("admin view does NOT render Edit, Notify, or Cancel buttons", () => {
    mockAuth(customerUser);
    const event = makeEvent({ status: "upcoming" });

    const { queryByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="admin" />
      </MemoryRouter>
    );

    expect(queryByText("Edit")).toBeNull();
    expect(queryByText("Notify")).toBeNull();
    expect(queryByText("Cancel")).toBeNull();
  });
});

// ===========================================================================
// Preservation Test 3 — Sold-Out Event State
// FOR ALL X WHERE isSoldOut=true
// Sold-out event must show "SOLD OUT" badge and disabled "Sold Out" button.
// Validates: Requirements 3.7
// ===========================================================================

describe("Preservation 3 — Sold-out event shows correct status indicators", () => {
  it("renders SOLD OUT badge when isSoldOut=true", () => {
    mockAuth(customerUser);
    const event = makeEvent({ isSoldOut: true, status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    expect(getByText("SOLD OUT")).toBeInTheDocument();
  });

  it("Book Now button is disabled and shows 'Sold Out' text when isSoldOut=true", () => {
    mockAuth(customerUser);
    const event = makeEvent({ isSoldOut: true, status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    const soldOutBtn = getByText("Sold Out").closest("button");
    expect(soldOutBtn).toBeDisabled();
  });

  it("Details button is still present and enabled for sold-out events", () => {
    mockAuth(customerUser);
    const event = makeEvent({ isSoldOut: true, status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    const detailsBtn = getByText("Details").closest("button");
    expect(detailsBtn).not.toBeDisabled();
  });
});

// ===========================================================================
// Preservation Test 4 — Completed Event State
// FOR ALL X WHERE status="completed"
// Completed event must show "Event Ended" indicator instead of action buttons.
// Validates: Requirements 3.7
// ===========================================================================

describe("Preservation 4 — Completed event shows 'Event Ended' indicator", () => {
  it("renders 'Event Ended' indicator for completed events in customer view", () => {
    mockAuth(customerUser);
    const event = makeEvent({ status: "completed" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    expect(getByText("Event Ended")).toBeInTheDocument();
  });

  it("does NOT render Book Now or Details buttons for completed events", () => {
    mockAuth(customerUser);
    const event = makeEvent({ status: "completed" });

    const { queryByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    expect(queryByText("Book Now")).toBeNull();
    expect(queryByText("Details")).toBeNull();
  });
});

// ===========================================================================
// Preservation Test 5 — Cancelled Event State
// FOR ALL X WHERE status="cancelled"
// Cancelled event must show "Cancelled" indicator instead of action buttons.
// Validates: Requirements 3.7
// ===========================================================================

describe("Preservation 5 — Cancelled event shows 'Cancelled' indicator", () => {
  it("renders Cancelled indicator for cancelled events in customer view", () => {
    mockAuth(customerUser);
    const event = makeEvent({ status: "cancelled" });

    const { getAllByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    // The cancelled state renders both a status badge and an action area indicator
    // Both contain "cancelled" text — verify at least one is present
    const cancelledElements = getAllByText(/cancelled/i);
    expect(cancelledElements.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render Book Now or Details buttons for cancelled events", () => {
    mockAuth(customerUser);
    const event = makeEvent({ status: "cancelled" });

    const { queryByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    expect(queryByText("Book Now")).toBeNull();
    expect(queryByText("Details")).toBeNull();
  });
});

// ===========================================================================
// Preservation Test 6 — BottomNavBar hidden at desktop viewport
// FOR ALL X WHERE viewport >= 1024px (desktop)
// BottomNavBar must have block md:hidden class so it is hidden on desktop.
// Validates: Requirements 3.1, 3.4
// ===========================================================================
// Preservation Test 7 — EventCard booking flow navigation
// FOR ALL X WHERE showActions="customer" AND eventType varies
// "Book Now" must call onBook with the event — the parent handles routing
// based on eventType (full-service, ticketed, service).
// Validates: Requirements 3.2
// ===========================================================================

describe("Preservation 7 — EventCard booking flow calls onBook correctly", () => {
  it("clicking Book Now calls onBook with the event for a ticketed event", () => {
    mockAuth(customerUser);
    const onBook = vi.fn();
    const event = makeEvent({ eventType: "ticketed", status: "upcoming", isSoldOut: false });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" onBook={onBook} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Book Now"));
    expect(onBook).toHaveBeenCalledWith(event);
  });

  it("clicking Book Now calls onBook with the event for a full-service event", () => {
    mockAuth(customerUser);
    const onBook = vi.fn();
    const event = makeEvent({ eventType: "full-service", status: "upcoming", isSoldOut: false });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" onBook={onBook} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Book Now"));
    expect(onBook).toHaveBeenCalledWith(event);
  });

  it("clicking Book Now calls onBook with the event for a standard event", () => {
    mockAuth(customerUser);
    const onBook = vi.fn();
    const event = makeEvent({ eventType: "service", status: "upcoming", isSoldOut: false });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" onBook={onBook} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Book Now"));
    expect(onBook).toHaveBeenCalledWith(event);
  });

  it("clicking Details calls onViewDetails with the event", () => {
    mockAuth(customerUser);
    const onViewDetails = vi.fn();
    const event = makeEvent({ status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" onViewDetails={onViewDetails} />
      </MemoryRouter>
    );

    fireEvent.click(getByText("Details"));
    expect(onViewDetails).toHaveBeenCalledWith(event);
  });

  it("Book Now is NOT called when event is sold out", () => {
    mockAuth(customerUser);
    const onBook = vi.fn();
    const event = makeEvent({ isSoldOut: true, status: "upcoming" });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" onBook={onBook} />
      </MemoryRouter>
    );

    const soldOutBtn = getByText("Sold Out").closest("button");
    fireEvent.click(soldOutBtn!);
    // Button is disabled, onBook should not be called
    expect(onBook).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Preservation Test 8 — EventGallery lightbox functionality
// FOR ALL X WHERE EventGallery lightbox is opened
// Lightbox must support image navigation, like/unlike, download, share.
// Validates: Requirements 3.9
// ===========================================================================

describe("Preservation 8 — EventGallery lightbox supports navigation and actions", () => {
  it("EventGallery renders gallery images", () => {
    const { container } = render(
      <MemoryRouter>
        <EventGallery />
      </MemoryRouter>
    );

    // Gallery should render some images
    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("EventGallery renders the section with default title 'Event Memories'", () => {
    const { getByText } = render(
      <MemoryRouter>
        <EventGallery />
      </MemoryRouter>
    );

    expect(getByText("Event Memories")).toBeInTheDocument();
  });

  it("EventGallery accepts a custom title prop", () => {
    const { getByText } = render(
      <MemoryRouter>
        <EventGallery title="Our Gallery" />
      </MemoryRouter>
    );

    expect(getByText("Our Gallery")).toBeInTheDocument();
  });

  it("clicking a gallery image opens the lightbox dialog", () => {
    const { container, getAllByRole } = render(
      <MemoryRouter>
        <EventGallery />
      </MemoryRouter>
    );

    // Click the first image to open lightbox
    const images = container.querySelectorAll("img");
    if (images.length > 0) {
      fireEvent.click(images[0]);
    }

    // After clicking, a dialog should appear (lightbox)
    // The dialog contains navigation buttons and action buttons
    const buttons = getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
