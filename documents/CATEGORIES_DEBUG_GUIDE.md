# Categories Not Displaying - Debugging Guide

## Problem Summary
- Categories are successfully created and stored in DB with merchantId
- UI shows "No categories found"
- Duplicate error appears correctly → means create API is working
- **Issue is with fetching/displaying categories**

## Debugging Steps Added

### 1. Backend Console Logging (server/routes/categories.js)

#### GET /categories API now logs:
```javascript
=== GET Categories API Called ===
Query params: { merchantId: 'xxx' }
merchantId from query: xxx
merchantId type: string
globalOnly: undefined
Query (merchant isolated): { $or: [...], isGlobal: false }
All categories with merchantId in DB: X
Sample merchantIds: [ { id, merchantId, merchantIdType, name, isGlobal } ]
Categories found: X
Categories data: [ { id, name, merchantId, isGlobal } ]
```

#### POST /categories API now logs:
```javascript
=== POST Categories API Called ===
Request body: { name, merchantId, isGlobal }
merchantId from body: xxx
isGlobal: false
Saving category: { ... }
Category saved successfully: { ... }
```

### 2. Frontend Console Logging (frontend/src/pages/dashboard/CategoriesPage.tsx)

#### Categories fetch now logs:
```javascript
=== Fetching Categories ===
User ID: xxx
Categories API Response: [ ... ]
Categories count: X
```

#### Service Types fetch now logs:
```javascript
=== Fetching Service Types ===
User ID: xxx
Service Types API Response: [ ... ]
Service Types count: X
```

## How to Debug

### Step 1: Check Server Console

1. **Restart your server** to apply the new logging
2. **Login as a merchant**
3. **Navigate to Categories page**
4. **Check server console** for logs

Look for:
```
=== GET Categories API Called ===
merchantId from query: <VALUE>
```

### Step 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to Categories page
4. Look for:
```
=== Fetching Categories ===
User ID: <VALUE>
Categories API Response: [ ... ]
Categories count: X
```

### Step 3: Compare Values

**CRITICAL CHECK:**
- `User ID` from frontend console
- `merchantId from query` from backend console
- `merchantId` values in database

**They must match EXACTLY!**

### Step 4: Check Database Directly

Open MongoDB and run:
```javascript
use event_hub
db.categories.find().pretty()
```

Check:
- Do categories exist?
- What is the `merchantId` value stored?
- What is the `isGlobal` value? (should be `false` for categories)

### Step 5: Check for Type Mismatch

The issue might be:
- Frontend sends: `merchantId: "67f8a9b0c1d2e3f4g5h6i7j8"` (string)
- Database has: `merchantId: ObjectId("67f8a9b0c1d2e3f4g5h6i7j8")` (ObjectId)

**The updated code now handles both cases with $or query!**

## Common Issues & Solutions

### Issue 1: merchantId Mismatch

**Symptom:**
```
User ID: abc123
merchantId from query: abc123
Categories found: 0
```

**But database has:**
```javascript
{ merchantId: "xyz789", name: "Wedding" }
```

**Solution:** The merchantId values don't match. Check:
1. User who created the category
2. User who is currently logged in
3. Are they the same user?

### Issue 2: isGlobal Flag Wrong

**Symptom:**
```
Query: { merchantId: "abc", isGlobal: false }
Categories found: 0
```

**But database has:**
```javascript
{ merchantId: "abc", name: "Wedding", isGlobal: true }
```

**Solution:** The category was saved with `isGlobal: true` (should be `false`).
- Categories should have `isGlobal: false`
- Service Types should have `isGlobal: true`

Check the create form - it should NOT be setting `isGlobal: true` for categories.

### Issue 3: No merchantId in Query

**Symptom:**
```
No merchantId provided - returning empty array
```

**Solution:** Frontend is not passing merchantId. Check:
1. Is user logged in?
2. Does `user?.id` exist?
3. Is the API call constructed correctly?

### Issue 4: Type Mismatch (ObjectId vs String)

**Symptom:**
```
merchantId from query: 67f8a9b0c1d2e3f4g5h6i7j8 (string)
merchantId in DB: ObjectId("67f8a9b0c1d2e3f4g5h6i7j8")
Categories found: 0
```

**Solution:** ✅ **Already fixed!** The updated code now uses:
```javascript
query = { 
  $or: [
    { merchantId: merchantId },
    { merchantId: String(merchantId) }
  ],
  isGlobal: false 
}
```

## Testing the Fix

### Test 1: Create and View Category

1. Login as Merchant A
2. Create category "Wedding"
3. Check server console - should log the save operation
4. Refresh page
5. Check if "Wedding" appears in the list
6. Check browser console - should show categories in response

### Test 2: Merchant Isolation

1. Login as Merchant A, create "Wedding"
2. Logout
3. Login as Merchant B
4. Create "Wedding" (should work - different merchant)
5. Check if Merchant B sees ONLY their "Wedding"
6. Logout and login as Merchant A
7. Check if Merchant A sees ONLY their "Wedding"

### Test 3: Duplicate Prevention

1. Login as Merchant A
2. Create category "Wedding"
3. Try to create "Wedding" again
4. Should show error: "Category already exists for your account"

## Expected Console Output (Working Case)

### Server Console:
```
=== GET Categories API Called ===
Query params: { merchantId: '67f8a9b0c1d2e3f4g5h6i7j8' }
merchantId from query: 67f8a9b0c1d2e3f4g5h6i7j8
merchantId type: string
globalOnly: undefined
Query (merchant isolated): { $or: [...], isGlobal: false }
All categories with merchantId in DB: 5
Sample merchantIds: [
  { id: '...', merchantId: '67f8a9b0c1d2e3f4g5h6i7j8', merchantIdType: 'string', name: 'Wedding', isGlobal: false }
]
Categories found: 3
Categories data: [
  { id: '...', name: 'Wedding', merchantId: '67f8a9b0c1d2e3f4g5h6i7j8', isGlobal: false },
  { id: '...', name: 'Birthday', merchantId: '67f8a9b0c1d2e3f4g5h6i7j8', isGlobal: false }
]
```

### Browser Console:
```
=== Fetching Categories ===
User ID: 67f8a9b0c1d2e3f4g5h6i7j8
Categories API Response: [ { _id: '...', name: 'Wedding', ... }, { ... } ]
Categories count: 3
```

## Quick Fix Commands

### If you need to check database directly:
```bash
# Connect to MongoDB
mongosh

# Switch to database
use event_hub

# Check all categories
db.categories.find().pretty()

# Check categories for specific merchant
db.categories.find({ merchantId: "YOUR_MERCHANT_ID" }).pretty()

# Check category count
db.categories.countDocuments()

# Check categories with isGlobal flag
db.categories.find({}, { name: 1, merchantId: 1, isGlobal: 1 }).pretty()
```

### If you need to fix existing data:
```javascript
// Fix categories that have wrong isGlobal value
db.categories.updateMany(
  { isGlobal: { $exists: false } },
  { $set: { isGlobal: false } }
)

// Check for type mismatches
db.categories.find({ merchantId: { $type: "objectId" } }).pretty()
```

## Next Steps

1. ✅ Restart server with new logging
2. ✅ Open browser console
3. ✅ Navigate to Categories page
4. ✅ Check both consoles for logs
5. ✅ Compare merchantId values
6. ✅ Identify the mismatch
7. ✅ Apply the fix based on the issue found

## Support

If the issue persists after checking all logs:
1. Copy the console logs from both server and browser
2. Check the database directly
3. Share the logs for further analysis

The extensive logging will pinpoint exactly where the issue is!
