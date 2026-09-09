"use client";

import {
  HOUSEHOLD_ICONS,
  HOUSEHOLD_ICON_KEYS,
  householdTileGradient,
} from "@/lib/household-icons";
import { cn } from "@/lib/utils";

export interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  /** Tints the selected tile so the icon and colour are chosen together. */
  color: string;
  name?: string;
  label: string;
}

export function IconPicker({ value, onChange, color, name, label }: IconPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {HOUSEHOLD_ICON_KEYS.map((key) => {
        const Icon = HOUSEHOLD_ICONS[key];
        const isSelected = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key.replace(/-/g, " ")}
            aria-pressed={isSelected}
            style={isSelected ? { backgroundImage: householdTileGradient(color) } : undefined}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg border transition",
              isSelected
                ? "border-transparent text-white shadow-sm"
                : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4.5" />
          </button>
        );
      })}
    </div>
  );
}
