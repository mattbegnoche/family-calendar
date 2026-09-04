import { linkGoogleAccount } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getLinkedAccounts } from "@/lib/google/linked-accounts";
import { requireUser } from "@/lib/sessions";

export default async function SettingsPage() {
  const user = await requireUser();
  const accounts = await getLinkedAccounts(user.id);

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Connected calendars</h1>
          <p className="text-sm text-muted-foreground">
            Every Google account linked here has its events pulled into the
            family calendar.
          </p>
        </header>

        <ul className="flex flex-col gap-3">
          {accounts.map((account) => (
            <li key={account.id} className="rounded-xl border p-4">
              <p className="font-medium">{account.email}</p>
              {account.error ? (
                <p className="mt-1 text-sm text-destructive">{account.error}</p>
              ) : (
                <ul className="mt-2 flex flex-col gap-1">
                  {account.calendars.map((calendar) => (
                    <li
                      key={calendar.id}
                      className="flex items-center justify-between text-sm text-muted-foreground"
                    >
                      <span>{calendar.summary ?? calendar.id}</span>
                      <span className="flex gap-2 text-xs">
                        {calendar.primary ? (
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            reading
                          </span>
                        ) : null}
                        <span>{calendar.accessRole}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        <form action={linkGoogleAccount}>
          <Button type="submit">Add another Google account</Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Only the calendar marked <strong>reading</strong> is imported today —
          one per account. Choosing among the rest comes with the calendar
          picker.
        </p>
      </div>
    </div>
  );
}
