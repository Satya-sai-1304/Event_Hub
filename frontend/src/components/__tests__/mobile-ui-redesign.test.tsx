/**
 * Bug Condition Exploration Tests — Mobile UI Redesign Optimization
 *
 * These tests assert the EXPECTED (fixed) behavior.
 * They are EXPECTED TO FAIL on unfixed code — failure confirms the bugs exist.
 * They will PASS after the fix is implemented.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
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

// Mock framer-motion to avoid animation issues in jsdom
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement("div", props, children),
    h2: ({ children, ...props }: any) => React.createElement("h2", props, children),
    img: ({ children, ...props }: any) => React.createElement("img", props, children),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock swiper
vi.mock("swiper/react", () => ({
  Swiper: ({ children }: any) => React.createElement("div", { "data-testid": "swiper" }, children),
  SwiperSlide: ({ children }: any) => React.createElement("div", null, children),
}));
vi.mock("swiper/modules", () => ({ Autoplay: {}, Pagination: {} }));
vi.mock("swiper/css", () => ({}));
vi.mock("swiper/css/pagination", () => ({}));
vi.mock("swiper/css/autoplay", () => ({}));

// Mock leaflet and react-leaflet
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

// Mock RecommendedEvents to avoid complex dependencies
vi.mock("@/components/RecommendedEvents", () => ({
  default: () => React.createElement("div", { "data-testid": "recommended-events" }, "Recommended Events"),
}));

// Mock modals to avoid deep dependency chains
vi.mock("@/components/BookingModal", () => ({
  default: () => null,
}));
vi.mock("@/components/PaymentModal", () => ({
  default: () => null,
}));
vi.mock("@/components/EventDetailModal", () => ({
  default: () => null,
}));
vi.mock("@/components/ContactVendorModal", () => ({
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import EventCard from "@/components/EventCard";
import EventGallery from "@/components/EventGallery";
import CustomerDashboard from "@/pages/dashboard/CustomerDashboard";
import BrowseEventsPage from "@/pages/dashboard/BrowseEventsPage";
import DashboardLayout from "@/components/DashboardLayout";
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

function makeEvent(overrides: Partial<Event> & { isSoldOut?: boolean } = {}): Event & { isSoldOut?: boolean } {
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
// Test 1 — Duplicate Back Button
// isBugCondition_DuplicateBackButton: BrowseEventsPage renders its own internal
// back button (<Button onClick={() => navigate(-1)}><ArrowLeft /> Back</Button>)
// in addition to the one provided by DashboardLayout.
// Expected (fixed) behavior: BrowseEventsPage has NO internal back button.
// This test FAILS on unfixed code (internal back button IS present).
// Validates: Requirements 1.1, 2.1, 3.5
// ===========================================================================

describe("Test 1 — Duplicate Back Button: BrowseEventsPage must NOT render its own back button", () => {
  it("BrowseEventsPage does NOT render an internal back button — FAILS on unfixed code", () => {
    mockAuth(customerUser);
    mockMobile(true);

    // Set window.history.length > 1 so BrowseEventsPage's condition triggers
    // BrowseEventsPage renders: {window.history.length > 1 && <Button>Back</Button>}
    Object.defineProperty(window.history, "length", {
      writable: true,
      configurable: true,
      value: 3,
    });

    // Render BrowseEventsPage standalone (not inside DashboardLayout)
    // to isolate the page-internal back button
    const { queryAllByText } = render(
      <MemoryRouter initialEntries={["/dashboard/browse-events"]}>
        <BrowseEventsPage />
      </MemoryRouter>
    );

    // Expected (fixed) behavior: BrowseEventsPage has NO internal "Back" button
    // Bug condition: BrowseEventsPage renders its own "Back" button (ArrowLeft + "Back" text)
    const backElements = queryAllByText(/^Back$/i);
    expect(backElements).toHaveLength(0);
  });
});

// ===========================================================================
// Test 3 — Missing Card Buttons
// isBugCondition_MissingCardButtons: EventCard with showActions="customer"
// and an upcoming event must always show BOTH "Book Now" and "View Details".
// At 180px card width, buttons may collapse on unfixed code.
// This test PASSES on unfixed code (buttons are present in DOM) but validates
// the layout requirement. The test checks both buttons are in the DOM.
// Validates: Requirements 1.3, 2.3, 3.2, 3.3
// ===========================================================================

describe("Test 3 — Missing Card Buttons: EventCard customer view shows both action buttons", () => {
  it("renders both 'Book Now' and 'Details' buttons for an upcoming event at narrow width", () => {
    mockAuth(customerUser);

    // Simulate 180px card width (narrow mobile)
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 180 });

    const event = makeEvent({ status: "upcoming", isSoldOut: false });

    const { getByText } = render(
      <MemoryRouter>
        <div style={{ width: "180px" }}>
          <EventCard event={event} showActions="customer" />
        </div>
      </MemoryRouter>
    );

    // Both buttons must be present and visible
    expect(getByText("Book Now")).toBeInTheDocument();
    expect(getByText("Details")).toBeInTheDocument();
  });

  it("both buttons are not disabled for an active upcoming event", () => {
    mockAuth(customerUser);

    const event = makeEvent({ status: "upcoming", isSoldOut: false });

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} showActions="customer" />
      </MemoryRouter>
    );

    const bookNowBtn = getByText("Book Now").closest("button");
    const detailsBtn = getByText("Details").closest("button");

    expect(bookNowBtn).not.toBeDisabled();
    expect(detailsBtn).not.toBeDisabled();
  });
});

// ===========================================================================
// Test 4 — Explore Events Section
// isBugCondition_ExploreEventsSection: CustomerDashboard must NOT render
// an "Explore Events" section (only Featured Events and Recommended Events).
// This test FAILS on unfixed code ("Explore All Events" heading IS present).
// Validates: Requirements 1.4, 2.4, 3.8
// ===========================================================================

describe("Test 4 — Explore Events Section: CustomerDashboard must NOT render Explore Events", () => {
  it("does NOT render any heading containing 'Explore' in CustomerDashboard — FAILS on unfixed code", () => {
    mockAuth(customerUser);

    const { queryByText } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <CustomerDashboard />
      </MemoryRouter>
    );

    // Expected (fixed) behavior: no "Explore Events" / "Explore All Events" section
    // Bug condition: "Explore All Events" heading IS present in unfixed code
    const exploreHeading = queryByText(/explore.*events/i);
    expect(exploreHeading).toBeNull();
  });
});

// ===========================================================================
// Test 5 — Oversized Gallery
// isBugCondition_OversizedGallery: EventGallery on mobile must use a compact
// 3-column grid with image height ≤ 100px (not aspect-video which is ~200px).
// This test FAILS on unfixed code (aspect-video class produces oversized images).
// Validates: Requirements 1.5, 2.5, 3.9
// ===========================================================================

describe("Test 5 — Oversized Gallery: EventGallery must use compact 3-column grid", () => {
  it("image containers do NOT use aspect-video class (which produces height > 100px) — FAILS on unfixed code", () => {
    // Set mobile viewport
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });

    const { container } = render(
      <MemoryRouter>
        <EventGallery />
      </MemoryRouter>
    );

    // Bug condition: image containers use "aspect-video" class (produces ~200px height on mobile)
    // Expected (fixed) behavior: no aspect-video, use fixed height ≤ 100px
    const aspectVideoElements = container.querySelectorAll(".aspect-video");
    expect(aspectVideoElements).toHaveLength(0);
  });

  it("gallery grid uses 3-column layout (grid-cols-3 without breakpoint prefix) — FAILS on unfixed code", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 375 });

    const { container } = render(
      <MemoryRouter>
        <EventGallery />
      </MemoryRouter>
    );

    // Bug condition: grid uses "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" (single column on mobile)
    // Expected (fixed) behavior: "grid-cols-3" as the base (no breakpoint prefix) for always-3-column layout
    const gridContainer = container.querySelector(".grid");
    expect(gridContainer).not.toBeNull();

    const classes = gridContainer!.className.split(/\s+/);
    // Must have grid-cols-3 as a standalone class (not prefixed with md: or lg:)
    expect(classes).toContain("grid-cols-3");
  });
});
