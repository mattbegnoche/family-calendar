import { AlertCircle } from "lucide-react";

export interface FormErrorProps {
  message: string | null;
}

/**
 * The single place a failed action's message is rendered. `role="alert"` so a
 * screen reader announces it when it appears, since the form does not move
 * focus on failure.
 */
export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
