"use client";

import { Check } from "lucide-react";

import { MEMBER_COLORS } from "@/lib/members";
import { cn } from "@/lib/utils";

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  /**
   * When set, a hidden input carries the value into the form submission.
   * Needed because the swatches are buttons: a dynamic list of member rows all
   * submit under the same field name and are paired by index on the server, so
   * a radio group — which would need one unique name per row — cannot express it.
   */
  name?: string;
  label: string;
  className?: string;
}

const SWATCH = "size-7 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2";

export function ColorPicker({
  value,
  onChange,
  name,
  label,
  className,
}: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="group" aria-label={label}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {MEMBER_COLORS.map((color) => {
        const isSelected = color.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={color}
            aria-pressed={isSelected}
            style={{ backgroundColor: color, outlineColor: color }}
            className={cn(
              SWATCH,
              "flex items-center justify-center",
              isSelected
                ? "ring-2 ring-offset-2 ring-offset-background scale-110"
                : "opacity-70 hover:opacity-100",
            )}
          >
            {isSelected ? <Check className="size-4 text-white" strokeWidth={3} /> : null}
          </button>
        );
      })}
    </div>
  );
}
