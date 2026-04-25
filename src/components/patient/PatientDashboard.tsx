'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from './SearchBar';
import NearbyClinicsList from './NearbyClinicsList';
import PatientLayout from '@/components/layouts/PatientLayout';

// Loading placeholder for map
const MapPlaceholder = () => (
  <div className="w-full h-64 md:h-full rounded-lg bg-secondary flex items-center justify-center border border-border">
    <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
  </div>
);

// Dynamically import MapModule with SSR disabled (Leaflet requires window object)
const MapModule = dynamic(() => import('./MapModule'), {
  ssr: false,
  loading: MapPlaceholder,
});

interface Clinic {
  id: number;
  name: string;
  specialty: string;
  address: string;
  city: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  distance?: number;
  branches?: Array<{
    id: number;
    name?: string;
    address?: string;
  }>;
}

const PatientDashboard = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [filteredClinics, setFilteredClinics] = useState<Clinic[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);

  // Request user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied, using default location');
          // Default to Cairo (where clinics are located)
          setUserLocation({
            lat: 30.0444,   // Cairo latitude
            lng: 31.2357,   // Cairo longitude
          });
        }
      );
    }
  }, []);

  // Fetch clinics
  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const response = await fetch('/api/clinics');
        const result = await response.json();
        const clinicsData = Array.isArray(result) ? result : result.data;
        setClinics(clinicsData);
      } catch (error) {
        console.error('Failed to fetch clinics:', error);
        setClinics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchClinics();
  }, []);

  // Calculate distance and filter/sort
  useEffect(() => {
    if (!userLocation || clinics.length === 0) return;

    const calculateDistance = (lat: number, lng: number) => {
      const R = 6371; // Earth's radius in km
      const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
      const dLng = ((lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let filtered = clinics.map((clinic) => ({
      ...clinic,
      distance: calculateDistance(clinic.latitude, clinic.longitude),
    }));

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (clinic) =>
          clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          clinic.specialty.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    if (sortBy === 'distance') {
      filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    setFilteredClinics(filtered);
  }, [searchQuery, sortBy, userLocation, clinics]);

  return (
    <PatientLayout title="اكتشف العيادات">
      {/* Header with Search */}
      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Map Section */}
        <div className="md:sticky md:top-0 md:h-screen md:max-h-[calc(100vh-120px)] z-0">
          {userLocation && (
            <MapModule 
              userLocation={userLocation} 
              clinics={filteredClinics} 
              onClinicSelect={setSelectedClinicId}
              selectedClinicId={selectedClinicId}
            />
          )}
        </div>

        {/* Clinics List Section */}
        <div className="flex flex-col gap-4">
          {/* Sort Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('distance')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                sortBy === 'distance'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              الأقرب
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                sortBy === 'rating'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              التقييم
            </button>
          </div>

          {/* Clinics List */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد عيادات متطابقة
            </div>
          ) : (
            <NearbyClinicsList 
              clinics={filteredClinics} 
              selectedClinicId={selectedClinicId}
              onClinicSelect={setSelectedClinicId}
            />
          )}
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
