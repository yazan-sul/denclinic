# Booking System Implementation Guide

## Overview
The clinic booking system implements a 4-step appointment booking flow for patients:
1. **Service Selection** - Choose the medical service needed
2. **Doctor Selection** - Pick the available doctor
3. **Date/Time Selection** - Select appointment date and time
4. **Booking Confirmation** - Confirm and complete the booking

## Database Migration

Before using the system, run the database migration:

```bash
# Create migration
npx prisma migrate dev --name add_clinic_models

# This will:
# - Create all necessary tables (Clinic, Branch, Doctor, Service, TimeSlot, Booking, Rating)
# - Run the seed script with sample data
```

## Environment Setup

Add these variables to `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/denclinic"

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-api-key-here"
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── clinic/[clinicId]/route.ts          # Get clinic details
│   │   ├── branch/[branchId]/route.ts          # Get branch details
│   │   ├── time-slots/route.ts                 # Get available time slots
│   │   ├── bookings/route.ts                   # Create new booking
│   │   └── users/[userId]/bookings/route.ts    # Get user's bookings
│   ├── patient/
│   │   ├── page.tsx                            # Patient dashboard (clinic discovery)
│   │   ├── booking/page.tsx                    # Main booking flow page
│   │   ├── bookings/page.tsx                   # View user's bookings
│   │   └── clinics/[clinicId]/page.tsx         # Clinic profile page
│   └── ClientLayout.tsx                        # Root layout with providers
├── components/
│   ├── patient/
│   │   ├── PatientDashboard.tsx                # Map + clinic listing
│   │   ├── SearchBar.tsx                       # Search clinics
│   │   ├── MapModule.tsx                       # Google Maps integration
│   │   ├── NearbyClinicsList.tsx               # Clinic cards with actions
│   │   └── BottomNavigation.tsx                # Mobile navigation
│   └── booking/
│       ├── ServiceSelection.tsx                # Step 1: Select service
│       ├── DoctorSelection.tsx                 # Step 2: Select doctor
│       ├── DateTimeSelection.tsx               # Step 3: Select date/time
│       └── BookingConfirmation.tsx             # Step 4: Confirm booking
├── context/
│   ├── ThemeContext.tsx                        # Theme management
│   └── BookingContext.tsx                      # Booking state management
└── lib/
    └── prisma.ts                               # Prisma client
```

## API Endpoints

### Get Clinic Details
```
GET /api/clinic/[clinicId]
```

Response:
```json
{
  "id": 1,
  "name": "عيادة عبد اللطيف سليمان للأسنان",
  "specialty": "طب الأسنان",
  "branches": [...],
  "services": [...],
  "ratings": [...]
}
```

### Get Branch Details
```
GET /api/branch/[branchId]
```

Includes doctors with services and future time slots.

### Get Available Time Slots
```
GET /api/time-slots?branchId=1&date=2024-12-25&doctorId=1
```

Query Parameters:
- `branchId` (required): Branch ID
- `date` (required): Date in YYYY-MM-DD format
- `doctorId` (optional): Filter by specific doctor

### Create Booking
```
POST /api/bookings

Body:
{
  "userId": 1,
  "clinicId": 1,
  "branchId": 1,
  "doctorId": 1,
  "serviceId": 1,
  "timeSlotId": 1
}
```

Response:
```json
{
  "id": 1,
  "bookingId": "BK1703123456789",
  "status": "CONFIRMED",
  "clinic": { "name": "..." },
  "branch": { "name": "..." },
  "doctor": { "name": "..." },
  "service": { "name": "..." },
  "timeSlot": { "date": "2024-12-25", "time": "10:00" }
}
```

### Get User's Bookings
```
GET /api/users/[userId]/bookings
```

## Booking State Management

The `BookingContext` manages the multi-step booking process:

```typescript
interface BookingState {
  clinicId: number | null;
  branchId: number | null;
  serviceId: number | null;
  doctorId: number | null;
  selectedDate: string | null;
  selectedTimeSlotId: number | null;
  currentStep: 1 | 2 | 3 | 4;
  bookingId: string | null;
}
```

Usage in components:
```typescript
import { useBooking } from '@/context/BookingContext';

function MyComponent() {
  const { state, dispatch } = useBooking();
  
  // Move to next step
  dispatch({ type: 'SET_STEP', payload: 2 });
  
  // Set selected service
  dispatch({ type: 'SET_SERVICE', payload: serviceId });
}
```

## Patient Flow

### 1. Patient Dashboard (`/patient`)
- Search and filter clinics
- View on Google Map
- Sorted by distance or rating
- Click "احجز الآن" to start booking or "صفحة العيادة" to view details

### 2. Clinic Profile (`/patient/clinics/[clinicId]`)
- View clinic rating and reviews
- Browse all services
- List all branches
- Select branch to start booking

### 3. Booking Flow (`/patient/booking`)
- **Step 1**: Select service from available options
- **Step 2**: Choose doctor with specialization and experience
- **Step 3**: Pick appointment date and available time slots
- **Step 4**: Review and confirm booking

### 4. My Bookings (`/patient/bookings`)
- View all appointments (upcoming and past)
- Check booking status (CONFIRMED, PENDING, COMPLETED, CANCELLED)
- Reschedule or cancel appointments

## Database Schema

### Clinic
```prisma
model Clinic {
  id        Int      @id @default(autoincrement())
  name      String
  specialty String
  branches  Branch[]
  services  Service[]
  ratings   Rating[]
  bookings  Booking[]
}
```

### Branch
```prisma
model Branch {
  id          Int       @id @default(autoincrement())
  name        String
  address     String
  phone       String
  latitude    Float
  longitude   Float
  clinic      Clinic    @relation(fields: [clinicId], references: [id])
  clinicId    Int
  doctors     Doctor[]
  timeSlots   TimeSlot[]
  bookings    Booking[]
}
```

### Doctor
```prisma
model Doctor {
  id              Int       @id @default(autoincrement())
  name            String
  specialization  String
  experience      Int
  bio             String?
  avatar          String?
  branch          Branch    @relation(fields: [branchId], references: [id])
  branchId        Int
  services        Service[]
  timeSlots       TimeSlot[]
  bookings        Booking[]
}
```

### Service
```prisma
model Service {
  id        Int       @id @default(autoincrement())
  name      String
  description String?
  icon      String
  clinic    Clinic    @relation(fields: [clinicId], references: [id])
  clinicId  Int
  doctors   Doctor[]
  bookings  Booking[]
}
```

### TimeSlot
```prisma
model TimeSlot {
  id        Int       @id @default(autoincrement())
  date      DateTime
  time      String
  isBooked  Boolean   @default(false)
  branch    Branch    @relation(fields: [branchId], references: [id])
  branchId  Int
  doctor    Doctor    @relation(fields: [doctorId], references: [id])
  doctorId  Int
  booking   Booking?
}
```

### Booking
```prisma
model Booking {
  id          Int       @id @default(autoincrement())
  bookingId   String    @unique
  status      BookingType @default(PENDING)
  user        User      @relation(fields: [userId], references: [id])
  userId      Int
  clinic      Clinic    @relation(fields: [clinicId], references: [id])
  clinicId    Int
  branch      Branch    @relation(fields: [branchId], references: [id])
  branchId    Int
  doctor      Doctor    @relation(fields: [doctorId], references: [id])
  doctorId    Int
  service     Service   @relation(fields: [serviceId], references: [id])
  serviceId   Int
  timeSlot    TimeSlot  @relation(fields: [timeSlotId], references: [id])
  timeSlotId  Int       @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

## Features Implemented

✅ Multi-step booking funnel (4 steps)
✅ Service selection with search
✅ Doctor selection with ratings and experience
✅ Date/Time selection with availability checking
✅ Booking confirmation with success screen
✅ Clinic profile with ratings and branches
✅ API endpoints for all operations
✅ Booking state management with Context
✅ My Bookings page to view appointments
✅ Responsive design (mobile + desktop)
✅ Arabic RTL support
✅ Dark mode support

## Features Not Yet Implemented

⏳ Email confirmation for bookings
⏳ SMS notifications
⏳ Payment processing
⏳ Doctor availability calendar management
⏳ Clinic admin dashboard
⏳ Prescription management
⏳ Medical records access
⏳ Appointment reminders
⏳ Cancellation/rescheduling logic
⏳ Doctor ratings and reviews submission
⏳ Real authentication system

## Testing the System

1. **Set up database:**
   ```bash
   npx prisma migrate dev
   ```

2. **Access patient dashboard:**
   - Navigate to `http://localhost:3000/patient`
   - Search for "dental" or view all clinics
   - Click on clinic to view details or start booking

3. **Create a booking:**
   - Click "احجز الآن" on any clinic
   - Follow the 4-step flow
   - Complete the booking

4. **View bookings:**
   - Go to `http://localhost:3000/patient/bookings`
   - See all your appointments with status

## Troubleshooting

### Database connection error
- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running
- Check database credentials

### Google Maps not loading
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- Check API key is enabled for Maps JavaScript API
- Check browser console for errors

### Booking creation fails
- Verify all required fields are filled
- Check that time slot is not already booked
- Verify `userId` exists in database

## Next Steps

1. **Authentication**: Integrate real auth system to replace hardcoded userId
2. **Payment**: Add payment processing for premium services
3. **Notifications**: Implement email/SMS confirmations
4. **Admin Panel**: Create clinic admin dashboard for managing doctors, services, slots
5. **Doctor Reviews**: Allow patients to rate and review doctors
6. **Medical Records**: Add patient medical history and prescriptions
