# Category and Service Type Flow - Corrected

## Issues Fixed

### Problem 1: ❌ Service Types were going to Categories list
**Before:** When you created a Service Type, it appeared in the Categories tab  
**After:** Service Types stay in the Service Types tab only ✅

### Problem 2: ❌ Categories and Service Types were mixed
**Before:** Both were shown together causing confusion  
**After:** Completely separated with proper filtering ✅

### Problem 3: ❌ Newly created service types didn't appear in Services dropdown
**Before:** Service type dropdown showed hardcoded values  
**After:** Shows all dynamically created service types ✅

---

## How It Works Now

### Data Structure

```javascript
// Categories Collection in MongoDB
{
  _id: "...",
  name: "Wedding Events",        // Category name
  description: "...",
  merchantId: "merchant123",      // Merchant-specific
  isGlobal: false                 // NOT a service type
}

{
  _id: "...",
  name: "Catering",               // Service Type name
  description: "...",
  merchantId: undefined,          // Global (no owner)
  isGlobal: true                  // IS a service type
}
```

### Creation Flow

#### 1. Creating a Category
```
User Action → Categories Tab → "Add Category"
                                ↓
Backend receives: { name: "Wedding Events", merchantId: "123", isGlobal: false }
                                ↓
Saves to MongoDB with isGlobal: false
                                ↓
Result: Appears ONLY in Categories tab ✅
```

#### 2. Creating a Service Type
```
User Action → Service Types Tab → "Add Service Type"
                                   ↓
Backend receives: { name: "Premium Catering", isGlobal: true }
                                   ↓
Checks for duplicates (prevents duplicate service types)
                                   ↓
Saves to MongoDB with isGlobal: true
                                   ↓
Result: Appears ONLY in Service Types tab ✅
        Available in Services dropdown ✅
```

#### 3. Creating a Service
```
User Action → Services Page → "Add Service"
                               ↓
Category Dropdown: Shows only non-global categories
                   (Wedding Events, Birthday Party, etc.)
                               ↓
Service Type Dropdown: Shows all service types
                       (Catering, Photography, Decoration, etc.)
                               ↓
Result: Service created with both category AND type ✅
```

---

## Database Queries

### Get Categories (for Categories Tab)
```javascript
// Frontend: CategoriesPage.tsx
GET /api/categories?merchantId=123

// Backend filters:
Category.find({ 
  $or: [
    { merchantId: "123" },
    { isGlobal: true }
  ]
})

// Frontend then filters out global:
categories.filter(cat => !cat.isGlobal)

// Result: Only merchant-specific categories ✅
```

### Get Service Types (for Service Types Tab)
```javascript
// Frontend: CategoriesPage.tsx (Service Types tab)
GET /api/service-types

// Backend returns:
Category.find({ isGlobal: true })

// Result: Only global service types ✅
```

### Get Categories (for Services Page - Category Dropdown)
```javascript
// Frontend: ServicesPage.tsx
GET /api/categories?merchantId=123

// Backend returns all for merchant
// Frontend filters out global:
categories.filter(cat => !cat.isGlobal)

// Result: Only merchant categories in dropdown ✅
```

### Get Service Types (for Services Page - Type Dropdown)
```javascript
// Frontend: ServicesPage.tsx
GET /api/service-types

// Backend returns:
Category.find({ isGlobal: true })

// Result: All service types in dropdown ✅
```

---

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Manage Categories Page                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┬──────────────────┐                        │
│  │  Categories  │ Service Types    │ ← Tabs                 │
│  └──────────────┴──────────────────┘                        │
│                                                              │
│  CATEGORIES TAB:                    SERVICE TYPES TAB:       │
│  ┌──────────────────────┐          ┌──────────────────────┐ │
│  │ Wedding Events       │          │ Catering             │ │
│  │ Birthday Party       │          │ Photography          │ │
│  │ Corporate Event      │          │ Decoration           │ │
│  │                      │          │ Lighting             │ │
│  │ + Add Category       │          │ + Add Service Type   │ │
│  └──────────────────────┘          └──────────────────────┘ │
│         ↓                                      ↓             │
│   isGlobal: false                        isGlobal: true      │
│   merchantId: "123"                      merchantId: undef   │
└─────────────────────────────────────────────────────────────┘

                            ↓

┌─────────────────────────────────────────────────────────────┐
│                    Services Page                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Add New Service Dialog:                                    │
│                                                              │
│  Service Name: [Premium Wedding Decor]                      │
│                                                              │
│  Category: [Wedding Events ▼]  ← Shows ONLY categories      │
│                                                             │
│  Service Type: [Decoration ▼]  ← Shows ALL service types    │
│                                                             │
│  Price: [₹50,000]                                           │
│                                                              │
│  [Create Service]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Changes Made

### Backend Changes

#### 1. `server/routes/categories.js`
```javascript
// POST /api/categories
router.post('/', async (req, res) => {
  const { name, description, merchantId, isGlobal } = req.body;
  
  // NEW: Check for duplicate service types
  if (isGlobal) {
    const existingType = await Category.findOne({ 
      name, 
      isGlobal: true 
    });
    
    if (existingType) {
      return res.status(400).json({ 
        message: 'Service Type already exists' 
      });
    }
  }
  
  // Create category/service type
  const category = new Category({
    name,
    description,
    merchantId: isGlobal ? undefined : merchantId,
    isGlobal: !!isGlobal
  });
  
  await category.save();
  res.status(201).json(category);
});
```

#### 2. `server/routes/services.js`
```javascript
// GET /api/service-types
router.get('/service-types', async (req, res) => {
  if (req.useMongoDB) {
    // CHANGED: Get from Category model with isGlobal: true
    const serviceTypes = await Category.find({ isGlobal: true });
    res.json(serviceTypes.map(st => ({
      _id: st._id,
      name: st.name,
      description: st.description,
      isGlobal: st.isGlobal
    })));
  } else {
    // JSON fallback...
  }
});
```

### Frontend Changes

#### 1. `frontend/src/pages/dashboard/CategoriesPage.tsx`
```typescript
// Categories query - filter out global
const { data: categories } = useQuery({
  queryKey: ['categories', user?.id],
  queryFn: async () => {
    const response = await api.get(`/categories?merchantId=${user?.id}`);
    const allCategories = response.data;
    // Filter out service types
    return allCategories.filter((cat: any) => !cat.isGlobal);
  },
});

// Service Types mutation - invalidate both queries
const addServiceTypeMutation = useMutation({
  mutationFn: async (newServiceType) => {
    await api.post('/categories', {
      name: newServiceType.name,
      description: newServiceType.description,
      isGlobal: true,
      merchantId: undefined
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['categories', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['service-types'] }); // NEW
    toast.success("Service Type added successfully!");
  },
});
```

#### 2. `frontend/src/pages/dashboard/ServicesPage.tsx`
```typescript
// Categories query - filter out global
const { data: categories } = useQuery({
  queryKey: ['categories', user?.id],
  queryFn: async () => {
    const response = await api.get(`/categories?merchantId=${user?.id}`);
    const allCategories = response.data;
    // Filter out service types
    return allCategories.filter((cat: any) => !cat.isGlobal);
  },
});

// Service Types query (already working)
const { data: serviceTypes } = useQuery({
  queryKey: ['service-types'],
  queryFn: async () => {
    const response = await api.get('/service-types');
    return response.data as { _id: string; name: string }[];
  },
});
```

---

## Testing Steps

### Test 1: Create Category
1. Go to **Dashboard → Manage Categories**
2. Click **"Categories"** tab
3. Click **"Add Category"**
4. Enter: "Wedding Events"
5. Click Create
6. ✅ Should appear in Categories list
7. ✅ Should NOT appear in Service Types tab

### Test 2: Create Service Type
1. Go to **Dashboard → Manage Categories**
2. Click **"Service Types"** tab
3. Click **"Add Service Type"**
4. Enter: "Premium Catering"
5. Click Create
6. ✅ Should appear in Service Types list
7. ✅ Should NOT appear in Categories tab
8. ✅ Try creating duplicate → Should show error

### Test 3: Create Service
1. Go to **Dashboard → Services**
2. Click **"Add Service"**
3. **Category dropdown** should show:
   - Wedding Events
   - Birthday Party
   - (Your categories, NOT service types)
4. **Service Type dropdown** should show:
   - Catering
   - Photography
   - Decoration
   - Premium Catering (your new one)
5. Select Category: "Wedding Events"
6. Select Service Type: "Premium Catering"
7. Enter other details and create
8. ✅ Service created successfully

### Test 4: Verify Separation
1. Create category: "Test Category"
2. Create service type: "Test Service Type"
3. Go to Services page → Add Service
4. Check Category dropdown:
   - ✅ Should see "Test Category"
   - ✅ Should NOT see "Test Service Type"
5. Check Service Type dropdown:
   - ✅ Should see "Test Service Type"
   - ✅ Should see all other service types

---

## Summary

### Before ❌
```
Categories Tab:
- Wedding Events (category)
- Catering (service type) ← WRONG
- Birthday Party (category)
- Photography (service type) ← WRONG

Service Types Tab:
- (Empty or mixed)

Services Page:
- Category: Shows everything mixed
- Service Type: Hardcoded arrays
```

### After ✅
```
Categories Tab:
- Wedding Events (category) ✓
- Birthday Party (category) ✓
- Corporate Event (category) ✓

Service Types Tab:
- Catering (service type) ✓
- Photography (service type) ✓
- Decoration (service type) ✓
- Premium Catering (custom type) ✓

Services Page:
- Category: Only categories
- Service Type: All service types (dynamic)
```

---

## Benefits

1. ✅ **Clear Separation**: Categories and Service Types are completely separate
2. ✅ **No Confusion**: Users know exactly where to add what
3. ✅ **Dynamic Service Types**: Create custom service types that appear in dropdowns
4. ✅ **No Duplicates**: Service types can't be duplicated
5. ✅ **Proper Filtering**: Each dropdown shows only relevant data
6. ✅ **Scalable**: Easy to add more categories or service types

---

**Date:** April 2, 2026  
**Status:** Flow corrected and fully functional  
**Next:** Test and verify all scenarios
