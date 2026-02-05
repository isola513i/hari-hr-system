# Slack & Emergency Contact Fix

## 🐛 Root Cause Identified

The **backend was working correctly** all along! The issue was in the **frontend** - the `handleProfileSave` function in [EmployeeDetail.tsx](apps/web/pages/EmployeeDetail.tsx) was **not sending** `slack` and `emergencyContact` fields in the PATCH request.

## ✅ Fix Applied

### File: `apps/web/pages/EmployeeDetail.tsx` (Line 136-150)

**Before**:
```typescript
const handleProfileSave = async () => {
    if (!employee || !editForm) return;

    try {
        const updatedEmployee = await api.patch(`/employees/${employee.id}`, {
            name: editForm.name,
            email: editForm.email,
            role: editForm.role,
            department: editForm.department,
            status: editForm.status,
            location: editForm.location,
            bio: editForm.bio,
            phone: editForm.phone,
            avatar: avatar
            // ❌ Missing: slack and emergencyContact
        });
```

**After**:
```typescript
const handleProfileSave = async () => {
    if (!employee || !editForm) return;

    try {
        const updatedEmployee = await api.patch(`/employees/${employee.id}`, {
            name: editForm.name,
            email: editForm.email,
            role: editForm.role,
            department: editForm.department,
            status: editForm.status,
            location: editForm.location,
            bio: editForm.bio,
            phone: editForm.phone,
            slack: editForm.slack,              // ✅ Added
            emergencyContact: editForm.emergencyContact,  // ✅ Added
            avatar: avatar
        });
```

## 🔍 Investigation Steps

1. **Backend Check** ✅
   - `allowedFields` in [EmployeeController.ts:103](apps/api/src/controllers/EmployeeController.ts#L103) includes both `slack` and `emergencyContact`
   - Update logic in [EmployeeService.ts:174-180](apps/api/src/services/EmployeeService.ts#L174-L180) properly handles these fields
   - Database column mapping is correct: `emergencyContact` (camelCase) → `emergency_contact` (snake_case)

2. **UI Check** ✅
   - Edit Profile modal has input fields for both:
     - Slack Handle: [Line 1063-1074](apps/web/pages/EmployeeDetail.tsx#L1063-L1074)
     - Emergency Contact: [Line 1129-1140](apps/web/pages/EmployeeDetail.tsx#L1129-L1140)
   - Both use `handleProfileChange` to update `editForm` state

3. **Request Payload Check** ❌ **← Found the bug here!**
   - `handleProfileSave` function was NOT including these fields in the PATCH request
   - The backend never received the data, so it couldn't save it

## 🧪 Testing Instructions

### Test 1: Save Slack & Emergency Contact
1. Go to http://localhost:5173/#/employees/eb28f426-f067-4ddf-b826-279e1f717788
2. Click **"Edit Profile"**
3. Fill in:
   - **Slack Handle**: `@nattapat.lamnui`
   - **Emergency Contact**: `Mom - Mother - +66812345678`
4. Click **"Save Changes"**
5. **Expected**: Success toast appears
6. **Refresh the page** (F5)
7. **Verify**: Both fields persist and show in the UI

### Test 2: Check Database
After saving, check your PostgreSQL database:
```sql
SELECT slack, emergency_contact
FROM employees
WHERE email = 'nattapat@aiya.ai';
```

**Expected Result**:
```
slack              | emergency_contact
-------------------+----------------------------------
@nattapat.lamnui   | Mom - Mother - +66812345678
```

### Test 3: Update from UI Again
1. Edit Slack to `@nattapat`
2. Save
3. **Expected**: Changes persist after refresh

## 📊 All Fields Now Working

| Field | Backend | Frontend UI | Request Payload | Status |
|-------|---------|-------------|-----------------|--------|
| name | ✅ | ✅ | ✅ | ✅ Working |
| email | ✅ | ✅ | ✅ | ✅ Working |
| bio | ✅ | ✅ | ✅ | ✅ Working |
| phone | ✅ | ✅ | ✅ | ✅ Working |
| location | ✅ | ✅ | ✅ | ✅ Working |
| slack | ✅ | ✅ | ✅ **FIXED** | ✅ Working |
| emergencyContact | ✅ | ✅ | ✅ **FIXED** | ✅ Working |
| skills | ✅ | ✅ | ✅ (separate handler) | ✅ Working |

## 🎯 Summary

The issue was a simple oversight in the frontend code - the form had the fields, the backend could handle them, but the PATCH request wasn't including them in the payload. Now all profile fields should save correctly to the database! 🎉

---

**Servers Status**:
- Frontend: http://localhost:5173 ✅
- Backend: http://localhost:3001 ✅
