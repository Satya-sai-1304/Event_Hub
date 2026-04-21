# 🔧 Category & Service Type Index Fix

## Problem

You deleted all your data but still getting error:
```
"Category already exists for this user" - 400 Bad Request
```

Also, you want:
- Different merchants CAN create same category names ✅
- Different merchants CAN create same service type names ✅
- Same merchant CANNOT create duplicate categories ✅
- Same merchant CANNOT create duplicate service types ✅

## Root Cause

The MongoDB unique index `{ name: 1, merchantId: 1 }` was not sparse, meaning it treated `null` and `undefined` merchantIds as the same value. This prevented creating new categories even after deleting data.

## Solution

Changed to **sparse index** which:
- Allows multiple documents with `null` or `undefined` merchantId
- Enforces uniqueness only when merchantId has a value
- Properly separates data per merchant

## Files Modified

### Backend

#### 1. `server/models/Category.js`
```javascript
// BEFORE:
categorySchema.index({ name: 1, merchantId: 1 }, { unique: true });

// AFTER:
categorySchema.index({ name: 1, merchantId: 1 }, { unique: true, sparse: true });
```

Added `isGlobal` field to schema:
```javascript
isGlobal: { type: Boolean, default: false }
```

#### 2. `server/routes/categories.js`
- Updated POST endpoint to require `merchantId`
- Added proper error messages for duplicates
- Service types now saved with `merchantId` (not global)

```javascript
// POST /api/categories
router.post('/', async (req, res) => {
  const { name, description, merchantId, isGlobal } = req.body;
  
  // merchantId is REQUIRED for both categories and service types
  if (!merchantId) {
    return res.status(400).json({ message: 'Merchant ID is required' });
  }

  const category = new Category({
    name,
    description,
    merchantId: merchantId,  // Always include merchantId
    isGlobal: !!isGlobal     // true = service type, false = category
  });
  
  await category.save();
});
```

#### 3. `server/routes/services.js`
- Updated `/service-types` endpoint to filter by merchantId
- Added Category model import

```javascript
// GET /api/service-types?merchantId=123
router.get('/service-types', async (req, res) => {
  const { merchantId } = req.query;
  
  let query = { isGlobal: true };
  if (merchantId) {
    query.merchantId = merchantId;  // Filter by merchant
  }
  
  const serviceTypes = await Category.find(query);
  res.json(serviceTypes);
});
```

## How It Works Now

### Database Structure

```javascript
// Categories Collection
{
  _id: ObjectId,
  name: "Wedding Events",
  description: "...",
  merchantId: "merchant_123",    // Each merchant has their own
  isGlobal: false,                // false = category
  createdAt: Date
}

{
  _id: ObjectId,
  name: "Catering",
  description: "...",
  merchantId: "merchant_123",    // Each merchant has their own
  isGlobal: true,                 // true = service type
  createdAt: Date
}
```

### Index Behavior

```javascript
// Sparse index: { name: 1, merchantId: 1 } { unique: true, sparse: true }

✅ Merchant A creates "Wedding Events" → Works
✅ Merchant B creates "Wedding Events" → Works (different merchantId)
❌ Merchant A creates "Wedding Events" again → Fails (duplicate for same merchant)

✅ Merchant A creates "Catering" service type → Works
✅ Merchant B creates "Catering" service type → Works (different merchantId)
❌ Merchant A creates "Catering" service type again → Fails (duplicate)
```

## Migration Steps

### Step 1: Run Migration Script
```bash
cd c:\Users\Satya\Desktop\Event_Hub\server
node scripts/fix-category-indexes.js
```

**Expected Output:**
```
🔌 Connecting to MongoDB...
✅ Connected to MongoDB

🚀 Starting Category Index Migration...

📋 Step 1: Checking current indexes...
Current indexes: [ '_id_', 'name_1_merchantId_1' ]

🗑️  Step 2: Dropping old indexes...
   ✓ Dropped index: name_1_merchantId_1

✨ Step 3: Creating new sparse index...
   ✓ Created new sparse index: { name: 1, merchantId: 1 }

🧹 Step 4: Checking for duplicate categories...
   ✓ No duplicates found

🔍 Step 5: Verifying new indexes...
New indexes: [ { name: '_id_', ... }, { name: 'name_1_merchantId_1_sparse', ... } ]

🧪 Step 6: Testing index with sample data...
   ✓ Test 1 passed: Created category for merchant_1
   ✓ Test 2 passed: Same category for merchant_2 (different merchant)
   ✓ Test 3 passed: Correctly rejected duplicate for same merchant
   ✓ Test 4 passed: Created service type for merchant_1
   ✓ Test 5 passed: Same service type for merchant_2

🧹 Cleaned up test data

=============================================================
✅ MIGRATION COMPLETE!
=============================================================
```

### Step 2: Restart Server
```bash
# Stop server (Ctrl+C)
# Then restart:
npm start
# or
nodemon index.js
```

### Step 3: Clear Browser Cache
```
Press Ctrl+Shift+R (hard refresh)
```

### Step 4: Test
1. Go to Dashboard → Manage Categories
2. Create category: "Wedding Events"
3. Should work without errors ✅
4. Create service type: "Premium Catering"
5. Should work without errors ✅

## Frontend Integration

### Creating Categories
```typescript
// CategoriesPage.tsx
const addCategoryMutation = useMutation({
  mutationFn: async (data: { name: string; description: string }) => {
    await api.post('/categories', {
      name: data.name,
      description: data.description,
      merchantId: user?.id,  // Include merchantId
      isGlobal: false         // It's a category, not service type
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    toast.success("Category created!");
  }
});
```

### Creating Service Types
```typescript
// CategoriesPage.tsx
const addServiceTypeMutation = useMutation({
  mutationFn: async (data: { name: string; description: string }) => {
    await api.post('/categories', {
      name: data.name,
      description: data.description,
      merchantId: user?.id,  // Include merchantId
      isGlobal: true          // It's a service type
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['service-types', user?.id] });
    toast.success("Service Type created!");
  }
});
```

### Fetching Service Types
```typescript
const { data: serviceTypes } = useQuery({
  queryKey: ['service-types', user?.id],
  queryFn: async () => {
    const response = await api.get(`/service-types?merchantId=${user?.id}`);
    return response.data;
  },
  enabled: !!user?.id
});
```

## Key Differences

### Before ❌
```javascript
// Service Types stored globally (no merchantId)
{
  name: "Catering",
  merchantId: undefined,  // ❌ No merchantId
  isGlobal: true
}

// Only ONE merchant could create "Catering"
// Others would get: "Service Type already exists"
```

### After ✅
```javascript
// Service Types stored per merchant
{
  name: "Catering",
  merchantId: "merchant_123",  // ✅ Has merchantId
  isGlobal: true
}

// Each merchant can create their own "Catering"
// Same merchant cannot create duplicates
```

## Testing Checklist

- [ ] Run migration script successfully
- [ ] Restart server
- [ ] Clear browser cache
- [ ] Create category "Wedding Events" → Should work
- [ ] Create category "Wedding Events" again → Should show error
- [ ] Create service type "Catering" → Should work
- [ ] Create service type "Catering" again → Should show error
- [ ] Login as different merchant
- [ ] Create category "Wedding Events" → Should work (different merchant)
- [ ] Create service type "Catering" → Should work (different merchant)
- [ ] Verify service types appear in Services dropdown

## Error Messages

### Duplicate Category
```json
{
  "message": "Category already exists for your account"
}
```

### Duplicate Service Type
```json
{
  "message": "Service type already exists for your account"
}
```

### Missing Merchant ID
```json
{
  "message": "Merchant ID is required"
}
```

## Troubleshooting

### Still getting 400 error?
1. Run migration script again
2. Check MongoDB directly:
   ```javascript
   // In MongoDB shell:
   use event_hub
   db.categories.getIndexes()
   // Should see: name_1_merchantId_1_sparse
   ```

### Service types not showing?
1. Check if merchantId is being sent in request
2. Check browser Network tab for API response
3. Verify `isGlobal: true` is set correctly

### Categories not showing?
1. Check if merchantId matches logged-in user
2. Verify `isGlobal: false` is set correctly
3. Check query in CategoriesPage

## Benefits

1. ✅ **Multi-Tenant Support**: Different merchants can have same names
2. ✅ **No Conflicts**: Deleting data doesn't break future creates
3. ✅ **Proper Validation**: Same merchant can't create duplicates
4. ✅ **Scalable**: Works for unlimited merchants
5. ✅ **Clean Data**: Each merchant's data is isolated

## Summary

| Feature | Before | After |
|---------|--------|-------|
| Index Type | Unique (non-sparse) | Unique (sparse) |
| Same name, different merchants | ❌ No | ✅ Yes |
| Same name, same merchant | ❌ No | ❌ No |
| Service types per merchant | ❌ Global | ✅ Per merchant |
| Works after deleting data | ❌ No | ✅ Yes |

---

**Date:** April 2, 2026  
**Status:** Migration ready  
**Action Required:** Run `node scripts/fix-category-indexes.js`
