# 📋 Customer Dashboard - Sidebar Menu Structure

## Complete Navigation Hierarchy

```
┌─────────────────────────────────────┐
│  🎉 EventPro                        │
│     (Logo & Brand)                  │
├─────────────────────────────────────┤
│                                     │
│  📊 Dashboard                       │
│     └─ Home/Overview                │
│                                     │
│  🔍 Browse Events                   │
│     ├─ Search & Filter              │
│     ├─ Services Filter              │
│     │  ├─ Food & Catering           │
│     │  ├─ Decoration                │
│     │  ├─ Photography               │
│     │  ├─ Music/DJ                  │
│     │  └─ Entertainment             │
│     ├─ Price Range Slider           │
│     └─ Category Filter              │
│                                     │
│  🎫 My Bookings                     │
│     ├─ View All Bookings            │
│     ├─ Booking Details              │
│     ├─ Cancel Booking               │
│     └─ Payment Status               │
│                                     │
│  💳 Billing / Payments              │
│     ├─ Payment History              │
│     ├─ View Invoices                │
│     ├─ Make Payment                 │
│     └─ Payment Stats                │
│                                     │
│  🔔 Notifications                   │
│     ├─ Booking Updates              │
│     ├─ Payment Reminders            │
│     ├─ Event Updates                │
│     ├─ Special Offers               │
│     └─ Event Reminders              │
│                                     │
│  📸 Gallery                         │
│     ├─ Event Photos                 │
│     ├─ Category Filter              │
│     ├─ Photo Viewer                 │
│     └─ Download & Share             │
│                                     │
│  ❤️ Saved Events                    │
│     ├─ Wishlist                     │
│     ├─ Save for Later               │
│     └─ Quick Book                   │
│                                     │
│  ⚙️ Profile / Settings              │
│     ├─ Personal Info                │
│     ├─ Security Settings            │
│     ├─ Notification Preferences     │
│     └─ Payment Methods              │
│                                     │
│  ❓ Help / Support                  │
│     ├─ FAQ                          │
│     ├─ Contact Support              │
│     ├─ Email Support                │
│     └─ Phone Support                │
│                                     │
├─────────────────────────────────────┤
│  👤 User Profile                    │
│     └─ Name & Role                  │
│                                     │
│  🚪 Sign Out                        │
└─────────────────────────────────────┘
```

---

## Page Routing Map

```
/dashboard
├── /                                    (Dashboard Home)
├── /browse-events                       (Browse Events)
├── /my-bookings                         (My Bookings)
├── /billing-payments                    (Billing/Payments)
├── /notifications                       (Notifications)
├── /gallery                             (Gallery)
├── /saved-events                        (Saved Events)
├── /profile-settings                    (Profile/Settings)
└── /help-support                        (Help/Support)
```

---

## Feature Categories

### 📊 **Dashboard Management**
- Dashboard (Home)
- Browse Events
- Saved Events

### 🎫 **Booking Management**
- My Bookings
- Billing / Payments

### 🔔 **Communication**
- Notifications
- Help / Support

### 📸 **Memory & Media**
- Gallery

### ⚙️ **Account Management**
- Profile / Settings

---

## Icon Legend

| Icon | Meaning | Page |
|------|---------|------|
| 📊 | Analytics/Overview | Dashboard |
| 🔍 | Search/Explore | Browse Events |
| 🎫 | Ticket/Booking | My Bookings |
| 💳 | Payment/Card | Billing/Payments |
| 🔔 | Alert/Update | Notifications |
| 📸 | Camera/Photo | Gallery |
| ❤️ | Heart/Favorite | Saved Events |
| ⚙️ | Gear/Settings | Profile/Settings |
| ❓ | Question/Help | Help/Support |
| 👤 | Person/User | Profile Footer |
| 🚪 | Exit/Logout | Sign Out |

---

## User Journey Flow

### First Time User:
```
1. Dashboard (Landing) 
   ↓
2. Browse Events (Explore)
   ↓
3. Save Events (Wishlist)
   ↓
4. Book Event (Make Booking)
   ↓
5. My Bookings (Track Status)
   ↓
6. Billing/Payments (Pay for Event)
   ↓
7. Gallery (View Photos After Event)
```

### Regular User:
```
1. Dashboard (Quick Overview)
   ↓
2. Notifications (Check Updates)
   ↓
3. My Bookings (Manage Existing)
   ↓
4. Browse Events (Find New)
   ↓
5. Profile/Settings (Update Info)
```

---

## Mobile Responsive Layout

On mobile devices, the sidebar collapses into a hamburger menu:

```
☰ (Menu Button)
├── Dashboard
├── Browse Events
├── My Bookings
├── Billing/Payments
├── Notifications
├── Gallery
├── Saved Events
├── Profile/Settings
└── Help/Support
```

Each page is fully responsive with:
- Touch-friendly buttons
- Swipeable galleries
- Mobile-optimized forms
- Adaptive layouts

---

## Access Control

All pages are protected and require:
- ✅ User authentication (logged in)
- ✅ Customer role authorization
- ❌ Organizers cannot access customer pages
- ❌ Admins cannot access customer pages

---

## Future Expansion (Optional)

Potential additions to sidebar:
- 🎁 Loyalty/Rewards Program
- 💬 Live Chat Support
- 📅 Calendar View
- 🎯 Recommended Events
- 🏆 Achievements/Badges
- 📊 Spending Analytics
- 🎉 Event Planning Tools

---

This structure provides a complete, intuitive navigation system for customers to manage their entire event journey! 🎊
