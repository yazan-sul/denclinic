# Patient Dashboard Setup Guide

## Overview
The Patient Dashboard is a responsive single-page component that works on both desktop and mobile. Patients can search for clinics, view them on an interactive Google Map, and browse nearby clinics with ratings and directions.

## Setup Instructions

### 1. Database Schema Updates ✅
The Prisma schema has been updated with the following new models:
- **Clinic** - Stores clinic information with coordinates, ratings, and reviews
- **Rating** - User reviews and ratings for clinics
- **Booking** - Appointment bookings
- **User** - Updated with roles (PATIENT, DOCTOR, STAFF, ADMIN)

### 2. Create Database Migration
```bash
npx prisma migrate dev --name add_clinic_models
```

### 3. Install Google Maps JavaScript API Library
```bash
npm install @googlemaps/js-api-loader
```

### 4. Get Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API (optional, for advanced features)
4. Create an API key (Credentials → Create Credentials → API Key)
5. Restrict it to your domain for security

### 5. Add Environment Variables
Create or update `.env.local` file:
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your_api_key_here"
DATABASE_URL="your_database_url"
```

### 6. Seed Sample Data
```bash
npm run prisma:seed
# or manually:
npx tsx prisma/seed.ts
```

This will create 8 sample clinics and 3 sample users (2 patients, 1 doctor).

### 7. Update package.json
Add seed script to your `package.json`:
```json
{
  "scripts": {
    "prisma:seed": "prisma db seed"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

## Features

### Patient Dashboard Components

#### 1. **Search Bar** (`SearchBar.tsx`)
- Search clinics by name or specialty
- Real-time filtering

#### 2. **Interactive Map** (`MapModule.tsx`)
- Shows user location (blue marker)
- Clinic pins with info windows
- Google Maps integration
- Click on clinic pins to see details

#### 3. **Nearby Clinics List** (`NearbyClinicsList.tsx`)
- Displays clinics in card format
- Shows clinic name, specialty, address
- 5-star rating system
- Distance calculation from user location
- Action buttons:
  - "فتح الفرع" (Open Branch) - Navigate to branch details
  - "صفحة العيادة" (Clinic Page) - View full clinic profile

#### 4. **Bottom Navigation** (`BottomNavigation.tsx`)
- Mobile-only navigation bar
- 5 tabs: Home, Family, Records, Bookings, Profile
- Similar styling to doctor dashboard

#### 5. **Sorting & Filtering**
- Sort by distance (closest first)
- Sort by rating (highest first)
- Search across all clinic properties

## File Structure
```
src/
├── components/patient/
│   ├── PatientDashboard.tsx      # Main dashboard component
│   ├── SearchBar.tsx              # Search input
│   ├── MapModule.tsx              # Google Map integration
│   ├── NearbyClinicsList.tsx       # Clinic cards list
│   └── BottomNavigation.tsx        # Mobile navigation
└── app/
    ├── patient/
    │   ├── page.tsx               # Patient home page
    │   ├── family/                # TODO: Family management
    │   ├── records/               # TODO: Medical records
    │   ├── bookings/              # TODO: Appointments
    │   └── profile/               # TODO: User profile
    └── api/
        └── clinics/
            └── route.ts            # Get clinics API
```

## API Endpoints

### GET `/api/clinics`
Returns all clinics with their details:
```json
[
  {
    "id": 1,
    "name": "عيادة عبد اللطيف سليمان للأسنان",
    "specialty": "طب الأسنان وجراحة الفم",
    "address": "شارع الملك عبدالعزيز",
    "city": "الرياض",
    "phone": "+966 11 1234567",
    "latitude": 24.7136,
    "longitude": 46.6753,
    "rating": 4.8,
    "reviewCount": 150
  }
]
```

## Features To Implement

### Priority 1
- [ ] Clinic detail page with full information
- [ ] Booking appointment system
- [ ] User authentication & registration

### Priority 2
- [ ] Family member management
- [ ] Medical records upload/view
- [ ] Booking history and management

### Priority 3
- [ ] Clinic filtering by specialty
- [ ] Working hours availability
- [ ] In-app notifications
- [ ] Payment integration

## Styling Notes
- Uses semantic CSS variables from `globals.css`
- Responsive design: mobile-first approach
- Dark mode support via `bg-background`, `text-foreground`, etc.
- Tailwind CSS classes for all styling
- Bottom navigation only shows on mobile (`md:hidden`)
- Map takes full height on desktop

## Testing

### Test User Credentials
After seeding, you can login with:
- **Email:** patient1@example.com
- **Password:** (defined in seed file)

### Check Map Display
1. Visit `/patient`
2. Allow location access when prompted
3. Should see:
   - Map with your location (blue marker)
   - Clinic pins around Riyadh area
   - Clinic list with ratings and distances

## Troubleshooting

### Google Maps not loading
1. Check API key in `.env.local`
2. Verify API is enabled in Google Cloud Console
3. Check browser console for errors

### Location not detected
1. Give browser permission to access location
2. Use HTTPS (some browsers restrict HTTP)
3. Check if geolocation is available in your browser

### Clinics not showing
1. Verify database migration ran: `npx prisma migrate status`
2. Check seed data loaded: `npx prisma studio`
3. Verify API route is working: Visit `/api/clinics`

### Styling issues
1. Check CSS variables in `globals.css`
2. Ensure dark mode class applied to `<html>` tag
3. Verify Tailwind CSS is compiled

## Future Enhancements

- [ ] Virtual consultations
- [ ] Clinic specialization filtering
- [ ] Insurance provider integration
- [ ] Appointment reminder notifications
- [ ] Clinic comparison view
- [ ] Patient reviews system
- [ ] Doctor availability calendar
- [ ] Prescription management
