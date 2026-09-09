"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DialogProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * The modal surface shared by the event editor and the details card. Closes
 * on Escape and on a click outside the panel; moves focus into the panel on
 * open so keyboard users land inside it.
 */
export function Dialog({ isOpen, onClose, label, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(
      "[autofocus], input, select, textarea, button, a[href]",
    );
    (first ?? panel)?.focus();

    const onKeyDown = (keyboard: KeyboardEvent) => {
      if (keyboard.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onPointerDown={(pointer) => {
        if (pointer.target === pointer.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          "flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border bg-background p-5 shadow-xl outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
