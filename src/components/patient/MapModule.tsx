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
}

const MapModule = ({ userLocation, clinics }: MapModuleProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

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
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add user location marker
    const userIcon = L.divIcon({
      html: `<div style="background: #2563eb; border: 3px solid #1e40af; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">📍</div>`,
      iconSize: [30, 30],
      className: 'user-marker',
    });

    const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup('موقعك الحالي', { offset: L.point(0, -15) })
      .addTo(mapInstanceRef.current!)
      .openPopup();
    
    markersRef.current.push(userMarker);

    // Add clinic markers
    clinics.forEach((clinic) => {
      const clinicIcon = L.divIcon({
        html: `<div style="background: #dc2626; border: 3px solid #991b1b; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">🦷</div>`,
        iconSize: [35, 35],
        className: 'clinic-marker',
      });

      const clinicMarker = L.marker([clinic.latitude, clinic.longitude], { icon: clinicIcon })
        .bindPopup(
          `<div style="text-align: right; font-family: system-ui; width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #000;">${clinic.name}</h3>
            <p style="font-size: 12px; margin-bottom: 2px; color: #666;">${clinic.specialty}</p>
            <p style="font-size: 12px; color: #666;">${clinic.address}</p>
          </div>`,
          { maxWidth: 250 }
        )
        .addTo(mapInstanceRef.current!);
      
      markersRef.current.push(clinicMarker);
    });

    return () => {
      // Cleanup happens on unmount only
    };
  }, [userLocation, clinics]);

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
