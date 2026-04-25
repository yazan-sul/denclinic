'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Clinic {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  specialty: string;
  address: string;
}

interface MapModuleProps {
  userLocation: { lat: number; lng: number };
  clinics: Clinic[];
  onClinicSelect?: (id: number) => void;
  selectedClinicId?: number | null;
}

const MapModule = ({ userLocation, clinics, onClinicSelect, selectedClinicId }: MapModuleProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<number, L.Marker>>({});

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map only once
    if (!mapInstanceRef.current) {
      const mapInstance = L.map(mapRef.current).setView([userLocation.lat, userLocation.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance);

      mapInstanceRef.current = mapInstance;
    }

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add user location marker
    const userIcon = L.divIcon({
      html: `<div style="background: #2563eb; border: 3px solid #1e40af; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📍</div>`,
      iconSize: [30, 30],
      className: 'user-marker',
    });

    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup('موقعك الحالي', { offset: L.point(0, -15) })
      .addTo(mapInstanceRef.current!)
      .openPopup();

    // Add clinic markers
    clinics.forEach((clinic) => {
      if (!clinic.latitude || !clinic.longitude || isNaN(clinic.latitude) || isNaN(clinic.longitude)) return;

      const isSelected = selectedClinicId === clinic.id;
      
      const clinicIcon = L.divIcon({
        html: `<div style="background: ${isSelected ? '#2563eb' : '#dc2626'}; border: 3px solid ${isSelected ? '#1e40af' : '#991b1b'}; border-radius: 50%; width: ${isSelected ? '45px' : '35px'}; height: ${isSelected ? '45px' : '35px'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: ${isSelected ? '24px' : '18px'}; transition: all 0.3s ease; box-shadow: ${isSelected ? '0 0 15px rgba(37, 99, 235, 0.5)' : 'none'}; z-index: ${isSelected ? 1000 : 1};">🦷</div>`,
        iconSize: isSelected ? [45, 45] : [35, 35],
        className: 'clinic-marker',
      });

      const clinicMarker = L.marker([clinic.latitude, clinic.longitude], { icon: clinicIcon })
        .bindPopup(
          `<div style="text-align: right; font-family: system-ui; width: 200px; direction: rtl;">
            <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #000;">${clinic.name}</h3>
            <p style="font-size: 12px; margin-bottom: 2px; color: #666;">${clinic.specialty}</p>
            <p style="font-size: 12px; margin-bottom: 8px; color: #666;">${clinic.address}</p>
            <a href="/patient/clinics/${clinic.id}" style="display: block; background: #2563eb; color: white; text-align: center; padding: 6px; border-radius: 4px; text-decoration: none; font-size: 12px; font-weight: bold;">عرض التفاصيل</a>
          </div>`,
          { maxWidth: 250 }
        )
        .addTo(mapInstanceRef.current!);
      
      clinicMarker.on('click', () => {
        if (onClinicSelect) onClinicSelect(clinic.id);
      });

      markersRef.current[clinic.id] = clinicMarker;
      
      // Keep selected popup open
      if (isSelected) {
        setTimeout(() => clinicMarker.openPopup(), 100);
      }
    });

  }, [userLocation, clinics, onClinicSelect, selectedClinicId]);

  // Handle external selection (pan to marker)
  useEffect(() => {
    if (selectedClinicId && markersRef.current[selectedClinicId] && mapInstanceRef.current) {
      const marker = markersRef.current[selectedClinicId];
      mapInstanceRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedClinicId]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-64 md:h-full rounded-lg overflow-hidden shadow-lg border border-border">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default MapModule;
