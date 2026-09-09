"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FamilyCodeDisplayProps {
  code: string;
  /** Start masked where the screen may be shared or wall-mounted. */
  initiallyHidden?: boolean;
}

const COPIED_FEEDBACK_MS = 2000;

export function FamilyCodeDisplay({
  code,
  initiallyHidden = false,
}: FamilyCodeDisplayProps) {
  const [isHidden, setIsHidden] = useState(initiallyHidden);
  const [hasCopied, setHasCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setHasCopied(true);
      window.setTimeout(() => setHasCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      // Clipboard access is denied in some browsers and on insecure origins.
      // The code is on screen either way, so reveal it rather than fail.
      setIsHidden(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
      <code
        className={cn(
          "flex-1 px-2 font-mono text-lg tracking-[0.2em] select-all",
          isHidden && "blur-[6px] select-none",
        )}
        aria-label={isHidden ? "Family code, hidden" : `Family code ${code}`}
      >
        {code}
      </code>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsHidden((hidden) => !hidden)}
        aria-label={isHidden ? "Show family code" : "Hide family code"}
      >
        {isHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={copy}
        aria-label="Copy family code"
      >
        {hasCopied ? (
          <Check className="size-4 text-emerald-600" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
    </div>
  );
}
