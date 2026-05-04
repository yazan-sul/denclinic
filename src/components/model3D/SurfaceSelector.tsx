import React from "react";

export type ToothSurface = "MESIAL" | "DISTAL" | "OCCLUSAL" | "BUCCAL" | "LINGUAL";

const SURFACES: Array<{ key: ToothSurface; label: string }> = [
  { key: "MESIAL", label: "M" },
  { key: "DISTAL", label: "D" },
  { key: "OCCLUSAL", label: "O" },
  { key: "BUCCAL", label: "B" },
  { key: "LINGUAL", label: "L" },
];

interface SurfaceSelectorProps {
  value: ToothSurface[];
  onChange: (value: ToothSurface[]) => void;
}

export default function SurfaceSelector({ value, onChange }: SurfaceSelectorProps) {
  const toggle = (surface: ToothSurface) => {
    if (value.includes(surface)) {
      onChange(value.filter((s) => s !== surface));
      return;
    }
    onChange([...value, surface]);
  };

  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-wrap gap-2">
        {SURFACES.map((surface) => {
          const active = value.includes(surface.key);
          return (
            <button
              key={surface.key}
              type="button"
              onClick={() => toggle(surface.key)}
              className={`px-3 py-1 rounded-full border text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-secondary"
              }`}
            >
              {surface.label}
            </button>
          );
        })}
      </div>
      <svg
        width="70"
        height="70"
        viewBox="0 0 100 100"
        className="text-muted-foreground"
        aria-hidden="true"
      >
        <rect x="20" y="20" width="60" height="60" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="2" />
        <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="2" />
        <text x="50" y="18" textAnchor="middle" fontSize="10" fill="currentColor">O</text>
        <text x="50" y="96" textAnchor="middle" fontSize="10" fill="currentColor">B/L</text>
        <text x="12" y="54" textAnchor="middle" fontSize="10" fill="currentColor">M</text>
        <text x="88" y="54" textAnchor="middle" fontSize="10" fill="currentColor">D</text>
      </svg>
    </div>
  );
}
