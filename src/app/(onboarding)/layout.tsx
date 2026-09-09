import { ReactNode } from "react";

/**
 * Onboarding sits outside the dashboard shell on purpose: there is no sidebar
 * to draw yet, because the person looking at it has no household.
 */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full items-start justify-center p-4 py-8 sm:p-6 md:py-12">
      <div className="w-full max-w-lg">{children}</div>
    </div>
  );
}
