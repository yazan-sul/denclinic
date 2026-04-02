# DenClinic – Phase 1 Architecture Documentation

## System Overview

**DenClinic** is a clinic management system designed for dental clinics with multi-branch operations, family-oriented booking workflows, and clinic-level subscriptions. Phase 1 covers core functionality for patient discovery, clinic management, and appointment booking.

---

## 1. Core Design Principles

✅ **Multi-Tenancy Ready**: Each clinic is independent with its own branches, doctors, and appointments
✅ **Family-Oriented**: Guardians can book/manage appointments for dependents (children, elderly, etc.)
✅ **Clinic-Level Subscriptions**: Clinics pay for platform access, patients use free
✅ **RBAC Integration**: 5 roles (PATIENT, DOCTOR, STAFF, ADMIN, CLINIC_OWNER) support permission control
✅ **Slot Conflict Prevention**: Appointments consume and lock slots to prevent double-booking
✅ **Cascading Deletions**: Clinic deletion safely cascades to branches, doctors, and appointments

---

## 2. Data Architecture

### 2.1 User & Identity Management

```
User (Base Entity)
├─ role: UserRole (PATIENT, DOCTOR, STAFF, ADMIN, CLINIC_OWNER)
├─ phoneNumber: Unique identifier
├─ Patient Profile (if role = PATIENT)
│  └─ Medical history, allergies, blood type
│  └─ PatientGuardian links (family relationships)
├─ Doctor Profile (if role = DOCTOR)
│  └─ Specialization, qualifications, experience
│  └─ Services offered
└─ Clinic Ownership (if role = CLINIC_OWNER)
   └─ Owns one clinic (1:1)
```

**Key Relationships:**
- `User` → `Patient` (one doctor/patient per user)
- `Patient` ← `PatientGuardian` → `User` (many-to-many via junction table)

**Guardian Relationships:**
- SELF, PARENT, SPOUSE, SIBLING, CHILD, GRANDPARENT, OTHER
- Guards control: `canBook` (schedule appointments), `canView` (see medical data)

### 2.2 Clinic & Infrastructure

```
Clinic (1:N) Branch
├─ Each branch has location (lat/long, address, phone)
├─ Each branch hosts multiple Doctors
├─ Each branch schedules Slots and Appointments

Clinic (1:N) Service
├─ Services offered by doctorsat clinic level
├─ Each service has basePrice, estimatedDuration
├─ Many-to-many: Doctor ← → Service

Clinic (1) Subscription
├─ Linked to single SubscriptionPlan (BASIC/PROFESSIONAL/ENTERPRISE)
├─ Controls access to platform features
└─ Determines max doctors, branches, appointments allowed
```

### 2.3 Scheduling & Appointments

```
Doctor (1:N) Slot
├─ slotDate, startTime, endTime
├─ isAvailable: Boolean (locks when appointment booked)
└─ (1:1) Appointment (null if not booked)

Appointment (Core Entity)
├─ Links: Patient, User (booker), Clinic, Branch, Doctor, Service
├─ slotId: Optional (supports manual time entry)
├─ appointmentDate, appointmentTime (denormalized for queries)
├─ status: PENDING → CONFIRMED → COMPLETED, or CANCELLED
├─ bookedForPatientId: If guardian books for dependent
└─ Payment: One payment per appointment (costing/billing)
```

**Conflict Resolution:**
1. When appointment booking starts, check `isAvailable = true`
2. Create appointment with status = PENDING
3. Mark slot `isAvailable = false`
4. On confirmation, update status → CONFIRMED
5. On cancellation, release slot (`isAvailable = true`)

### 2.4 Subscription System (Clinic-Level)

```
SubscriptionPlan (Tier)
├─ BASIC ($1,000/month): 1 branch, 5 doctors, 100 appointments
├─ PROFESSIONAL ($2,500/month): 3 branches, 20 doctors, 500 appointments
└─ ENTERPRISE ($5,000/month): Unlimited everything

Subscription (Clinic Subscription Instance)
├─ Links clinic → plan
├─ startDate, endDate (auto-calculated based on billing)
├─ status: ACTIVE, EXPIRED, CANCELLED, PENDING_PAYMENT
├─ monthlyBilled vs annual
├─ autoRenew: Automatic renewal flag
└─ Payment: Multiple payments for renewals
```

### 2.5 Payment Flow

```
Payment (Dual Purpose)
├─ For Clinic Subscriptions:
│  ├─ appointmentId = NULL
│  ├─ subscriptionId = active subscription
│  └─ Tracks clinic renewal payments
├─ For Patient Appointments:
│  ├─ appointmentId = appointment ID
│  ├─ subscriptionId = NULL
│  └─ Tracks patient co-pays (optional)
├─ method: CASH, CARD, BANK_TRANSFER, ONLINE_PAYMENT, INSURANCE
└─ status: PENDING → COMPLETED, or FAILED/REFUNDED
```

---

## 3. Business Logic & Rules

### 3.1 Appointment Booking Workflow

**Step 1: Browse**
- Patient selects clinic → Sees branches (map, address, ratings)
- Selects service from clinic (with basePrice, duration)
- Selects doctor (with specialization, reviews)

**Step 2: Family Selection** *(Guardian Feature)*
```typescript
if (isGuardian) {
  // Show list of dependents: "Self", "Son (محمود)", "Daughter (فاطمة)"
  // User picks who appointment is for
  bookedForPatientId = selectedDependent.patientId
} else {
  // Patient books for self
  bookedForPatientId = null
}
```

**Step 3: Schedule**
- Browse available slots (filtered by selected doctor)
- Slot object: `{ id, doctorId, date, startTime, endTime, isAvailable }`
- Select time → Create appointment

**Step 4: Confirm & Pay**
```typescript
const appointment = {
  patientId: patient.id,
  userId: currentUser.id,        // Who's booking
  bookedForPatientId: dependent?.id,  // Who it's for (if different)
  slotId: selectedSlot.id,
  appointmentDate: slot.slotDate,
  appointmentTime: slot.startTime,
  status: 'PENDING',
  // Create optional payment
}

// Lock the slot
await updateSlot(slotId, { isAvailable: false })
```

### 3.2 RBAC Enforcement

| Role | Can | Cannot |
|------|-----|--------|
| PATIENT | Book appointments, pay, rate clinics | Create slots, view other patients' history |
| DOCTOR | Create/manage own slots | Approve bookings, modify clinic subscription |
| STAFF | View appointments, manage patients | Create slots (doctor-only feature) |
| ADMIN | Full platform access | None (platform-level admin) |
| CLINIC_OWNER | Manage clinic, subscribe, see reports | None in clinic scope |

### 3.3 Slot Management (Doctor-Controlled)

Doctors manage their own availability:
```typescript
POST /api/doctor/slots
{
  doctorId,
  branchId,
  slotDate: "2026-04-05",
  startTime: "09:00",
  endTime: "09:30"
}

// Doctor can see their slots and book status
GET /api/doctor/:doctorId/slots?date=2026-04-05
```

---

## 4. API Architecture (Phase 1)

### Patient-Facing Endpoints

**Clinics Discovery**
```
GET /api/clinics                          // Public list
GET /api/clinics?specialty=dentistry      // Filtered
GET /api/clinics/:clinicId                // Details + branches, services, ratings
GET /api/clinics/:clinicId/branches       // All branches
GET /api/clinics/:clinicId/ratings        // Reviews
```

**Booking Workflow**
```
GET /api/clinics/:clinicId/services       // Available services
GET /api/branch/:branchId                 // Doctors at branch
GET /api/doctor/:doctorId/slots           // Available slots
POST /api/appointments                    // Create appointment
GET /api/users/:userId/appointments       // My bookings
GET /api/users/:userId/family             // My dependents (guardians)

POST /api/ratings                         // Rate clinic
```

### Doctor-Facing Endpoints

**Slot Management**
```
POST /api/doctor/:doctorId/slots          // Create slots
GET /api/doctor/:doctorId/slots           // View my slots
PUT /api/doctor/:doctorId/slots/:slotId   // Modify availability
DELETE /api/doctor/:doctorId/slots/:slotId
```

### Admin/Clinic Owner

**Clinic Management**
```
POST /api/clinics                         // Create clinic
PUT /api/clinics/:clinicId                // Update clinic
POST /api/clinics/:clinicId/branches      // Add branch
POST /api/clinics/:clinicId/services      // Add service
POST /api/clinics/:clinicId/doctors       // Add doctor
GET /api/clinics/:clinicId/dashboard      // Analytics
```

**Subscription Management**
```
GET /api/subscriptions/plans              // Available plans
POST /api/clinics/:clinicId/subscribe     // Subscribe to plan
GET /api/clinics/:clinicId/subscription   // Current subscription

POST /api/payments                        // Record payment
GET /api/payments                         // Payment history
```

---

## 5. Payment Logic (Detailed)

### Clinic Subscription Payment Flow

```
1. Clinic submits subscription request:
   POST /api/clinics/:clinicId/subscribe { planId: 2 }

2. System creates Subscription record:
   {
     clinicId: 1,
     planId: 2,
     startDate: now(),
     endDate: add 1 year,
     status: 'PENDING_PAYMENT'
   }

3. Payment gateway processes:
   POST /api/payments {
     userId: clinicOwnerId,
     subscriptionId: 1,
     amount: 25000 (annual professional plan),
     method: 'BANK_TRANSFER',
     externalTransactionId: 'txn_xyz'
   }

4. On success:
   - Update Subscription.status → 'ACTIVE'
   - Clinic.currentSubscriber → true
   - Clinic.subscriptionId → subscription.id
   - Create future renewal notification
```

### Appointment Payment (Optional)

```
1. Patient confirms appointment:
   POST /api/appointments { ... }

2. If co-pay enabled:
   POST /api/payments {
     userId: patientId,
     appointmentId: appt_id,
     amount: service.basePrice,
     method: 'CASH' or 'CARD'
   }

3. On completion:
   - Payment.status → 'COMPLETED'
   - Clinic receives notification
```

---

## 6. Guardian/Family Workflow

### Setup (One-Time)

```typescript
// Patient 1001 (فاطمة) adds child 1002 (محمود) as dependent
POST /api/patient/guardians {
  guardianUserId: 1001,  // فاطمة
  patientId: 3,          // محمود (or by patient's own registration)
  relationship: 'PARENT',
  canBook: true,
  canView: true
}

// System creates PatientGuardian link
// فاطمة can now see محمود's appointments and book for him
```

### Booking for Dependent

```typescript
// When booking, user selects which "patient" to book for
const dependents = [
  { id: 3, name: 'محمود (ابني)' },
  { id: 1, name: 'أنا' }  // Self
]

// User selects Son → creates appointment with bookedForPatientId = 3
```

### Access Control

```typescript
// Doctor sees: "Appointment for محمود, Guardian: فاطمة علي"
// فاطمة can: View appointments, Cancel, Reschedule
// فاطمة sees: Medical history restricted to shared info
```

---

## 7. Data Validation & Conflict Resolution

### Slot Booking Safety

```typescript
// Atomic transaction
BEGIN TRANSACTION
  1. SELECT Slot WHERE id = slotId AND isAvailable = true FOR UPDATE
  2. IF NOT FOUND → ERROR: "Slot no longer available"
  3. CREATE Appointment
  4. UPDATE Slot SET isAvailable = false
COMMIT
```

### Cascade Deletion Safety

```
Clinic deleted:
├─ DELETE all Branches (automatically)
├─ DELETE all Doctors (on delete cascade)
├─ DELETE all Services (on delete cascade)
├─ DELETE all Appointments (on delete cascade)
├─ DELETE Subscription (on delete cascade)
└─ Refund any active payments (manual business logic)
```

---

## 8. Indexed Queries (Performance)

```sql
-- Fast patient lookups
CREATE INDEX idx_User_role ON User(role);
CREATE INDEX idx_User_clinicId ON User(clinicId);

-- Fast clinic navigation
CREATE INDEX idx_Branch_clinicId ON Branch(clinicId);
CREATE INDEX idx_Doctor_clinicId ON Doctor(clinicId);
CREATE INDEX idx_Doctor_branchId ON Doctor(branchId);

-- Appointment lookups
CREATE INDEX idx_Appointment_patientId ON Appointment(patientId);
CREATE INDEX idx_Appointment_userId ON Appointment(userId);
CREATE INDEX idx_Appointment_appointmentDate ON Appointment(appointmentDate);
CREATE INDEX idx_Appointment_status ON Appointment(status);

-- Slot scheduling
CREATE INDEX idx_Slot_doctorId ON Slot(doctorId);
CREATE INDEX idx_Slot_slotDate ON Slot(slotDate);

-- Subscription tracking
CREATE INDEX idx_Subscription_status ON Subscription(status);
CREATE INDEX idx_Subscription_endDate ON Subscription(endDate);

-- Payment history
CREATE INDEX idx_Payment_userId ON Payment(userId);
CREATE INDEX idx_Payment_status ON Payment(status);
```

---

## 9. Next Steps (Phase 2 - Treatment & Advanced)

Phase 2 will add:

- **Treatment Records**: `Treatment` → `Appointment` (1:1)
  - Diagnosis, notes, follow-up date
  
- **Lab Cases**: `LabCase` → `Treatment` (1:N)
  - External lab work tracking, costing, status

- **Medical History**: Comprehensive patient history timeline
  
- **SMS/Email Notifications**: Appointment reminders, subscription renewal alerts

- **Advanced Reports**: Clinic analytics, revenue tracking, doctor utilization

- **Patient Portal**: Patient-facing history, upcoming appointments, prescription access

---

## 10. Integration with Current App

**Backward Compatibility:**
- Legacy `MOCK_TIME_SLOTS` → Maps to `MOCK_SLOTS`
- Legacy `MOCK_BOOKINGS` → Maps to `MOCK_APPOINTMENTS`
- Existing API responses continue to work with data mapping

**Migration Path:**
```typescript
// Old: MOCK_BOOKINGS with denormalized data
// New: Clean relational structure via Prisma

// Components receive mapped data:
const appointment = {
  id: appt.id,
  clinic: { name: appt.clinic.name },
  doctor: { name: appt.doctor.user.name },
  // ... rest mapped from relations
}
```

---

## 11. Summary

| Aspect | Details |
|--------|---------|
| **Clinics** | Independent, multi-branch, can subscribe |
| **Doctors** | Manage own slots, link to branches/services |
| **Patients** | Can book for self or dependents (guardian feature) |
| **Appointments** | Core entity, links patient/doctor/clinic/slot/payment |
| **Subscriptions** | Clinic-level, 3 tiers, monthly/annual billing |
| **Payments** | Dual-purpose: clinic subscription + appointment co-pays |
| **RBAC** | 5 roles with specific permissions |
| **Safety** | Atomic transactions, cascading deletes, slot locking |

**Status:** ✅ **Phase 1 Ready** – All core entities defined, schema created, mock data populated, TypeScript interfaces generated.

