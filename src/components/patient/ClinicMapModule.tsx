'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

interface ClinicMapModuleProps {
  branches: Branch[];
  clinicName: string;
}

const ClinicMapModule = ({ branches, clinicName }: ClinicMapModuleProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map only once
    if (!mapInstanceRef.current) {
      const centers = branches.map((b) => [b.latitude, b.longitude] as [number, number]);
      if (centers.length === 0) return;

      const centerLat = centers.reduce((sum, c) => sum + c[0], 0) / centers.length;
      const centerLng = centers.reduce((sum, c) => sum + c[1], 0) / centers.length;

      const mapInstance = L.map(mapRef.current).setView([centerLat, centerLng], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstance);

      mapInstanceRef.current = mapInstance;
    }

    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add branch markers
    branches.forEach((branch) => {
      const branchIcon = L.divIcon({
        html: `<div style="background: #059669; border: 3px solid #047857; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">🏥</div>`,
        iconSize: [40, 40],
        className: 'branch-marker',
      });

      const marker = L.marker([branch.latitude, branch.longitude], { icon: branchIcon })
        .bindPopup(
          `<div style="text-align: right; font-family: system-ui; width: 220px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: #000;">${branch.name}</h3>
            <p style="font-size: 12px; margin-bottom: 4px; color: #666;">📍 ${branch.address}</p>
            <p style="font-size: 12px; color: #666;">☎️ ${branch.phone}</p>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #ddd;" />
            <p style="font-size: 11px; color: #666; font-style: italic;">الإحداثيات: ${branch.latitude.toFixed(4)}, ${branch.longitude.toFixed(4)}</p>
          </div>`,
          { maxWidth: 250 }
        )
        .addTo(mapInstanceRef.current!);
      
      markersRef.current.push(marker);
    });

    // Fit bounds to all markers if there are multiple branches
    if (branches.length > 1) {
      const centers = branches.map((b) => [b.latitude, b.longitude] as [number, number]);
      const bounds = L.latLngBounds(centers);
      mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      // Cleanup happens on unmount only
    };
  }, [branches]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (branches.length === 0) {
    return (
      <div className="w-full h-80 rounded-lg overflow-hidden shadow-lg border border-border flex items-center justify-center bg-muted">
        <p className="text-muted-foreground">لا توجد فروع لعرضها على الخريطة</p>
      </div>
    );
  }

  return (
    <div className="w-full h-80 rounded-lg overflow-hidden shadow-lg border border-border">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default ClinicMapModule;
