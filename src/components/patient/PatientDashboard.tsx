'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from './SearchBar';
import NearbyClinicsList from './NearbyClinicsList';
import PatientLayout from '@/components/layouts/PatientLayout';

const MapPlaceholder = () => (
  <div className="w-full h-64 md:h-full rounded-lg bg-secondary flex items-center justify-center border border-border">
    <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
  </div>
);

const MapModule = dynamic(() => import('./MapModule'), {
  ssr: false,
  loading: MapPlaceholder,
});

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance?: number;
  clinic: {
    id: number;
    name: string;
    specialty: string;
    rating: number;
    reviewCount: number;
    logo: string | null;
  };
}

interface ClinicRaw {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  logo: string | null;
  latitude: number;
  longitude: number;
  branches: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    latitude: number;
    longitude: number;
  }>;
}

const PatientDashboard = () => {
  const [rawClinics, setRawClinics] = useState<ClinicRaw[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');
  const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);

  const handleClinicSelect = (clinicId: number) => {
    setSelectedClinicId(clinicId);
    const selected = rawClinics.find(c => c.id === clinicId);
    if (selected) setSearchQuery(selected.name);
  };

  const handleClearSelection = () => {
    setSelectedClinicId(null);
    setSearchQuery('');
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 30.0444, lng: 31.2357 })
      );
    }
  }, []);

  useEffect(() => {
    fetch('/api/clinics')
      .then((r) => r.json())
      .then((result) => {
        const data: ClinicRaw[] = Array.isArray(result) ? result : result.data ?? [];
        setRawClinics(data);

        // Flatten clinics → branches
        const flat: Branch[] = data.flatMap((clinic) =>
          (clinic.branches ?? []).map((branch) => ({
            ...branch,
            clinic: {
              id: clinic.id,
              name: clinic.name,
              specialty: clinic.specialty,
              rating: clinic.rating,
              reviewCount: clinic.reviewCount,
              logo: clinic.logo,
            },
          }))
        );
        setBranches(flat);
      })
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const calcDist = (lat: number, lng: number) => {
      const R = 6371;
      const dLat = ((lat - userLocation.lat) * Math.PI) / 180;
      const dLng = ((lng - userLocation.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userLocation.lat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let filtered = branches.map((b) => ({
      ...b,
      distance: calcDist(b.latitude, b.longitude),
    }));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.clinic.name.toLowerCase().includes(q) ||
          b.clinic.specialty.toLowerCase().includes(q) ||
          b.address.toLowerCase().includes(q)
      );
    }

    if (selectedClinicId) {
      filtered = filtered.filter((b) => b.clinic.id === selectedClinicId);
    }

    filtered.sort((a, b) =>
      sortBy === 'distance'
        ? (a.distance ?? 0) - (b.distance ?? 0)
        : b.clinic.rating - a.clinic.rating
    );

    setFilteredBranches(filtered);
  }, [searchQuery, sortBy, userLocation, branches, selectedClinicId]);

  return (
    <PatientLayout title="اكتشف العيادات">
      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6">
        <div className="md:sticky md:top-0 md:h-screen md:max-h-[calc(100vh-120px)] z-0">
          {userLocation && (
            <MapModule
              userLocation={userLocation}
              clinics={rawClinics}
              onClinicSelect={handleClinicSelect}
              selectedClinicId={selectedClinicId}
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('distance')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'distance' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
            >
              الأقرب
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${sortBy === 'rating' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'}`}
            >
              التقييم
            </button>
          </div>

          {selectedClinicId && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-3 rounded-lg">
              <span className="text-sm font-medium text-primary">تم التصفية حسب العيادة المختارة</span>
              <button onClick={handleClearSelection}
                className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90">
                إلغاء التصفية ×
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد فروع متطابقة</div>
          ) : (
            <NearbyClinicsList branches={filteredBranches} />
          )}
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;