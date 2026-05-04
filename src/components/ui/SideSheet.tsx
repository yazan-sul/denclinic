import React, { useEffect } from "react";

interface SideSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  side?: "left" | "right";
  widthClass?: string;
  children: React.ReactNode;
}

export default function SideSheet({
  isOpen,
  onOpenChange,
  title,
  subtitle,
  side = "left",
  widthClass = "w-[360px] md:w-[420px]",
  children,
}: SideSheetProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onOpenChange]);

  return (
    <div
      className={`fixed inset-0 z-50 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`absolute top-0 h-full bg-card border-border border shadow-xl transition-transform ${widthClass} ${
          side === "left" ? "left-0" : "right-0"
        } ${
          isOpen
            ? "translate-x-0"
            : side === "left"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        {(title || subtitle) && (
          <div className="border-b border-border px-5 py-4">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <div className="h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
