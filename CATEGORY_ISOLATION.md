# Per-User Category Isolation Implementation

## Overview

This document explains how PieTracker implements per-user category isolation to ensure that each user has their own separate category system that doesn't interfere with other users.

## Backend Implementation

### 1. User Identification (`get_user_id` function)

```python
def get_user_id(
    x_user_id: Optional[str] = Header(default=None),
    authorization: Optional[str] = Header(default=None)
) -> str:
    # Priority: JWT token > X-User-Id header > public anonymous
```

**Security Features:**

- JWT tokens take precedence over headers (prevents spoofing)
- Authenticated users are identified by their JWT token
- Anonymous users get a stable "public-anon-user" ID
- Invalid tokens gracefully fall back to header-based identification

### 2. Category Storage Structure

```python
categories_db: Dict[str, Dict[str, str]] = {}
# Format: { user_id: {category_name: color} }
```

**Examples:**

```json
{
  "user-123": {
    "CustomCategory1": "#FF5733",
    "MySpecialCategory": "#00FF00"
  },
  "user-456": {
    "CustomCategory1": "#0000FF", // Same name, different color
    "AnotherCategory": "#FFFF00"
  },
  "__legacy__": {
    "OldCategory": "#888888" // Legacy categories for migration
  }
}
```

### 3. Category Initialization (`ensure_user_category_init`)

- New users automatically get a copy of legacy categories (if any exist)
- This prevents shared state between users
- Users can then customize their categories independently

### 4. Isolated Category Operations

#### Get Categories (`/categories`)

- Returns only the user's categories plus default categories
- Includes categories from user's expenses
- No longer merges legacy categories directly

#### Add Category (`POST /categories`)

- Adds category only to the requesting user's space
- Validates category doesn't already exist for that user
- Returns success/error specific to that user

#### Delete Category (`DELETE /categories/{name}`)

- Only deletes from the requesting user's categories
- Removes associated expenses for that user only
- Returns "not found" silently if category doesn't exist (prevents information leakage)
- Cannot delete default categories

#### Get Category Colors (`/categories/colors`)

- Returns only the requesting user's custom color mappings
- No cross-contamination between users

## Frontend Implementation

### 1. Header Management (`getHeaders` function)

```typescript
function getHeaders() {
  const headers = AuthService.getAuthHeaders();
  // Only add legacy public user id if there's no JWT token
  if (!headers["Authorization"] && !headers["X-User-Id"]) {
    headers["X-User-Id"] = "public-anon-user";
  }
  return headers;
}
```

**Benefits:**

- Authenticated users rely on JWT tokens
- Anonymous users get consistent data segregation
- No conflicting headers when authenticated

### 2. Category Management in `useExpenses` Hook

#### Refresh Strategy

After any category operation, the frontend refreshes:

1. Categories list (`fetchCategories`)
2. Category colors (`fetchCategoryColors`)
3. Monthly summary (to reflect category changes)
4. Monthly expenses (to reflect category deletions)

#### Error Handling

- Falls back to default categories if API fails
- Maintains user experience during network issues
- Preserves data integrity

## Security Considerations

### 1. User Spoofing Prevention

- JWT tokens cannot be spoofed (signed with server secret)
- Header-based user IDs only used for anonymous/legacy support
- Authenticated users always use JWT-derived user ID

### 2. Information Leakage Prevention

- Category existence checks don't reveal other users' categories
- Delete operations return generic success messages
- Error messages don't leak information about other users

### 3. Data Isolation

- Complete separation of user category data
- No shared mutable state between users
- Legacy categories are copied, not shared

## Testing Category Isolation

### Manual Test Steps

1. **Setup Test Users:**

   ```bash
   # User 1 adds a category
   curl -X POST "http://localhost:8000/categories" \
     -H "X-User-Id: test-user-1" \
     -H "Content-Type: application/json" \
     -d '{"name": "TestCategory", "color": "#FF0000"}'

   # User 2 adds the same category with different color
   curl -X POST "http://localhost:8000/categories" \
     -H "X-User-Id: test-user-2" \
     -H "Content-Type: application/json" \
     -d '{"name": "TestCategory", "color": "#00FF00"}'
   ```

2. **Verify Isolation:**

   ```bash
   # Check User 1's categories
   curl -H "X-User-Id: test-user-1" "http://localhost:8000/categories"

   # Check User 2's categories
   curl -H "X-User-Id: test-user-2" "http://localhost:8000/categories"
   ```

3. **Test Deletion Isolation:**

   ```bash
   # Delete category for User 1
   curl -X DELETE "http://localhost:8000/categories/TestCategory" \
     -H "X-User-Id: test-user-1"

   # Verify User 2 still has the category
   curl -H "X-User-Id: test-user-2" "http://localhost:8000/categories"
   ```

### Automated Test Script

Run `python test_category_isolation.py` to automatically verify:

- Category deletion isolation
- Category color isolation
- No cross-user interference

## Migration from Shared Categories

### Legacy Support

- Existing shared categories are preserved in `__legacy__` namespace
- New users get a copy of legacy categories on first access
- Existing users continue with their current setup until they make changes

### Migration Process

1. Legacy categories detected in `categories.json`
2. Moved to `__legacy__` namespace during startup
3. Each user gets a private copy on first category operation
4. Users can then customize independently

## Production Deployment

### Environment Variables

```bash
# Required for JWT authentication
PIETRACKER_SECRET_KEY=your-secret-key-here

# Optional for admin access
PIETRACKER_ADMIN_KEY=your-admin-key-here
```

### File Structure

```
backend/
├── categories.json    # User category data
├── expenses.json      # User expense data
├── users.json         # User account data
└── main.py           # Main application
```

### Backup Considerations

- `categories.json` contains all user category customizations
- Regular backups recommended for production use
- Consider database migration for high-scale deployments

## Troubleshooting

### Common Issues

1. **Categories Disappearing:**

   - Check user authentication status
   - Verify JWT token validity
   - Ensure consistent user identification

2. **Cross-User Interference:**

   - Verify `get_user_id` function is working correctly
   - Check for header conflicts
   - Test with different user IDs

3. **Legacy Category Issues:**
   - Check `__legacy__` namespace in `categories.json`
   - Verify `ensure_user_category_init` function
   - Test new user onboarding

### Debug Commands

```bash
# Check category data structure
curl "http://localhost:8000/categories" -H "X-User-Id: debug-user"

# Check category colors
curl "http://localhost:8000/categories/colors" -H "X-User-Id: debug-user"

# Test with JWT authentication
curl "http://localhost:8000/categories" -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
