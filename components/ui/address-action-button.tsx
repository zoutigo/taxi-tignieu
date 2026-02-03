"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";

type AddressActionButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "search" | "edit";
  className?: string;
};

export const AddressActionButton = forwardRef<HTMLButtonElement, AddressActionButtonProps>(
  ({ icon: Icon, label, onClick, disabled, variant = "search", className }, ref) => {
    const tone =
      variant === "search"
        ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_12px_30px_rgba(246,196,49,0.45)]"
        : "bg-amber-500 text-white hover:bg-amber-600 shadow-[0_10px_25px_rgba(245,158,11,0.35)]";

    return (
      <Button
        ref={ref}
        type="button"
        size="sm"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "cursor-pointer rounded-full px-3 py-2",
          "inline-flex items-center justify-center gap-2 text-sm font-semibold",
          tone,
          className
        )}
        aria-label={label}
        title={label}
      >
        <Icon className="h-4 w-4" />
        <span className="sr-only">{label}</span>
      </Button>
    );
  }
);

AddressActionButton.displayName = "AddressActionButton";
