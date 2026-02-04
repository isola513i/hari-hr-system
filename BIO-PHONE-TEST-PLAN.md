# Bio and Phone Field Testing & Debugging Guide

## Current Status
✅ Database has `bio` and `phone` columns
✅ Backend models updated with bio/phone fields
✅ Frontend types updated with bio/phone fields
✅ AuthContext updated to map bio/phone
✅ Settings page updated to save bio to AuthContext
✅ Servers are running (API: 3001, Web: 5173)

### Database Verification
Employee: nattapat@aiya.ai
- ✅ Bio: "KMUTT" (saved in database)
- ❌ Phone: null (not yet saved)

---

## Test Plan

### Test 1: Verify Bio Displays After Login
**Goal**: Check if bio field loads from database on login

**Steps**:
1. Open browser and go to http://localhost:5173
2. **Log out** if already logged in
3. Log in with: nattapat@aiya.ai
4. Open browser DevTools (F12) → Console
5. Run this command:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('user')))
   ```
6. **Expected Result**: You should see `bio: "KMUTT"` in the output

**If bio is null or undefined**:
- The login endpoint might not be returning bio
- Check Network tab → find the login request → check Response
- Bio should be in the response under `user.bio`

---

### Test 2: Save Bio from Settings Page
**Goal**: Verify bio updates immediately in UI

**Steps**:
1. Navigate to Settings page
2. Go to "General" tab
3. Check if Bio field shows "KMUTT" (from database)
4. Change bio to: "KMUTT - Computer Engineering"
5. Click "Save Changes"
6. **Expected Result**: Success toast appears
7. Open DevTools Console and run:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('user')).bio)
   ```
8. **Expected Result**: Should show "KMUTT - Computer Engineering"

**If bio doesn't update**:
- Check Network tab → find PATCH /employees request
- Verify request payload includes bio
- Verify response includes bio
- Check if `updateUser` was called with bio

---

### Test 3: Bio Persists After Refresh
**Goal**: Verify bio is saved to database

**Steps**:
1. After saving bio in Test 2
2. Refresh the page (F5 or Cmd+R)
3. Go to Settings → General tab
4. **Expected Result**: Bio field shows "KMUTT - Computer Engineering"

**If bio disappears after refresh**:
- Bio wasn't saved to database
- Check backend logs for errors
- Check database directly (see query below)

---

### Test 4: Save Phone from Settings Page
**Goal**: Verify phone number with country code saves correctly

**Steps**:
1. Navigate to Settings → General tab
2. Select country code: "+66" (Thailand)
3. Enter phone: "812345678"
4. Click "Save Changes"
5. **Expected Result**: Success toast appears
6. Refresh page
7. **Expected Result**: Phone shows "+66" and "812345678" in separate fields

---

### Test 5: Bio/Phone in Employee Profile Modal
**Goal**: Verify admin can edit bio/phone for employees

**Steps**:
1. Navigate to Employees page
2. Click on "Nattapat Lamnui" to open details
3. Click Edit Profile button
4. Check if Bio field shows current value
5. Update bio to: "Updated from Employee Profile Modal"
6. Update phone if visible
7. Click Save
8. **Expected Result**: Success toast appears
9. Refresh and check if changes persisted

---

## Debugging Commands

### Check Current User Data in Browser Console
```javascript
// Check localStorage
console.log('User data:', JSON.parse(localStorage.getItem('user')));

// Check AuthContext
// (You'll need to add this temporarily to a component)
const { user } = useAuth();
console.log('AuthContext user:', user);
```

### Check Database Directly
Run this in terminal:
```bash
node -e "
require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query('SELECT name, email, bio, phone FROM employees WHERE email = \$1', ['nattapat@aiya.ai'])
  .then(res => {
    console.log(JSON.stringify(res.rows[0], null, 2));
    pool.end();
  });
" 2>&1 | grep -A 10 "{"
```

### Check Backend API Response
1. Open DevTools → Network tab
2. Filter: "XHR" or "Fetch"
3. Perform an action (login, save settings, etc.)
4. Click on the request
5. Check "Response" tab
6. Verify bio and phone fields are present

### Check Backend Logs
Look at the terminal running the API server for any errors:
```
[API] Update employee error: ...
[API] Login error: ...
```

---

## Known Issues & Solutions

### Issue 1: Bio saves but doesn't display after refresh
**Cause**: Login endpoint not returning bio field
**Solution**: Already fixed in AuthService.ts (line 63, 91-92)
**Verify**: Check login API response in Network tab

### Issue 2: Phone saves as empty string
**Cause**: Country code and phone not properly concatenated
**Solution**: Already fixed in Settings.tsx (line 104)
**Verify**: Check PATCH request payload

### Issue 3: Bio appears in DB but not in frontend
**Cause**: User object in localStorage doesn't have bio
**Solution**: Log out and log back in to refresh user object

---

## Success Criteria

✅ Bio displays in Settings after login
✅ Bio updates immediately when saved
✅ Bio persists after page refresh
✅ Phone saves with country code (+66812345678)
✅ Phone displays correctly after refresh
✅ Bio can be edited from Employee Profile Modal
✅ Changes sync between Settings and Employee Profile Modal

---

## If All Tests Fail

1. **Clear browser cache and localStorage**:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Restart servers**:
   ```bash
   # In the terminal with servers running
   # Press Ctrl+C to stop
   # Then run:
   npm run dev
   ```

3. **Check for TypeScript errors** in the API server logs

4. **Verify database connection** - check if other data loads correctly

---

## Contact Points

If you encounter issues:
1. Share the browser console errors
2. Share the Network tab response for failed requests
3. Share backend server logs
4. Share database query results

I'll help debug from there!
