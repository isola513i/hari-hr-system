# Quick Testing Instructions for Bio/Phone Feature

## 🎯 Quick Test (2 minutes)

### Option 1: Fresh Login Test
1. **Log out** from the app
2. **Clear browser data**: Press F12 → Application tab → Clear storage → Clear site data
3. **Log in again** with your credentials
4. **Open Console** (F12 → Console tab)
5. **Run this**:
   ```javascript
   const user = JSON.parse(localStorage.getItem('user'));
   console.log('Bio:', user.bio);
   console.log('Phone:', user.phone);
   ```
6. **Check result**:
   - If bio shows "KMUTT" ✅ Backend is working
   - If bio is null/undefined ❌ Login endpoint issue

### Option 2: Settings Page Test
1. Go to **Settings** page
2. Check the **Bio** field - does it show "KMUTT"?
   - ✅ YES: Everything works! Try updating it.
   - ❌ NO: Bio not loading from user context
3. **Update bio** to something new
4. Click **Save Changes**
5. **Refresh page** (F5)
6. Check if bio still shows your update
   - ✅ YES: Perfect! Feature working!
   - ❌ NO: Bio not persisting

---

## 🔍 Browser Console Debug (30 seconds)

Copy-paste this into browser console (F12):
```javascript
// Quick diagnostic
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('=== BIO/PHONE STATUS ===');
console.log('Bio in localStorage:', user.bio || '❌ NOT FOUND');
console.log('Phone in localStorage:', user.phone || '❌ NOT FOUND');
console.log('\nExpected:');
console.log('  Bio: "KMUTT" or your custom bio');
console.log('  Phone: "+66812345678" or null if not set');
console.log('\n=== NEXT STEPS ===');
if (!user.bio) {
  console.log('❌ Bio missing → Log out and log back in');
} else {
  console.log('✅ Bio found → Go to Settings to test update');
}
```

---

## 🐛 If Bio Doesn't Show

### Fix 1: Clear Cache and Re-login
```javascript
// Run in console:
localStorage.clear();
sessionStorage.clear();
location.href = '/login';
```

### Fix 2: Check Network Tab
1. Open **DevTools** (F12)
2. Go to **Network** tab
3. **Log in** to your account
4. Find the **login** request
5. Click it → **Response** tab
6. Look for `"bio": "KMUTT"` in the response
   - ✅ Found: Frontend issue (localStorage not updating)
   - ❌ Not found: Backend issue (login not returning bio)

### Fix 3: Check Database
Run in terminal:
```bash
cd /Users/isolicez/AiYa-Internship/HARI-V1.1
node -e "
require('dotenv').config({ path: './apps/api/.env' });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT name, bio, phone FROM employees WHERE email = \$1', ['nattapat@aiya.ai'])
  .then(res => { console.log(res.rows[0]); pool.end(); })
  .catch(err => { console.error(err.message); pool.end(); });
" 2>&1 | grep -A 5 "name"
```

---

## ✅ What Should Work Now

| Feature | Location | Expected Behavior |
|---------|----------|-------------------|
| **View Bio** | Settings → General | Shows "KMUTT" (or your bio) |
| **Edit Bio** | Settings → General | Can type and save |
| **Bio Persists** | Refresh page | Bio still shows after F5 |
| **Phone Save** | Settings → General | Country code + number saves as "+66812345678" |
| **Phone Display** | Settings → General | Splits into dropdown "+66" and input "812345678" |
| **Login Bio** | After login | localStorage has bio field |
| **Employee Modal** | Employees → Click employee → Edit | Can edit bio and phone |

---

## 📊 Test Results Template

After testing, share your results:

```
Test 1 - Fresh Login:
[ ] Bio in localStorage: _________
[ ] Phone in localStorage: _________

Test 2 - Settings Display:
[ ] Bio shows in Settings field: YES / NO
[ ] Phone shows in Settings field: YES / NO

Test 3 - Save and Persist:
[ ] Bio saves successfully: YES / NO
[ ] Bio persists after refresh: YES / NO
[ ] Phone saves successfully: YES / NO
[ ] Phone persists after refresh: YES / NO

Test 4 - Employee Modal:
[ ] Can edit bio from Employee page: YES / NO
[ ] Changes save correctly: YES / NO

Issues encountered:
[Write any errors or unexpected behavior here]

Browser console errors:
[Paste any red errors from console]

Network response (login):
[Paste the user object from login response]
```

---

## 🚀 If Everything Works

Try these scenarios:

1. **Empty Bio Test**:
   - Clear bio field completely
   - Save
   - Refresh
   - Should show empty (not "KMUTT")

2. **Phone Format Test**:
   - Try different country codes: +1, +44, +81
   - Save and refresh
   - Should remember the country code

3. **Long Bio Test**:
   - Write a long bio (200+ characters)
   - Save
   - Check if it all saves

4. **Special Characters Test**:
   - Use emoji in bio: "KMUTT Student 🎓"
   - Save
   - Check if emoji displays correctly

---

## 📝 Changes Made (For Reference)

✅ Added `bio` and `phone` to User interface (frontend & backend)
✅ Updated AuthContext to map bio/phone from login response
✅ Updated AuthService to SELECT and return bio/phone
✅ Updated Settings to save bio in updateUser call
✅ Updated EmployeeService to handle bio/phone updates
✅ Database already has bio/phone columns

Files changed:
- `apps/web/types.ts`
- `apps/web/contexts/AuthContext.tsx`
- `apps/web/pages/Settings.tsx`
- `apps/api/src/models/User.ts`
- `apps/api/src/services/AuthService.ts`

---

**Start testing and let me know what you find! 🎉**
