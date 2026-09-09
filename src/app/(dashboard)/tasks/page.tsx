import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";
import { requireHousehold } from "@/lib/household";
import { taskDetailsOf, type TaskItem } from "@/lib/task-item";
import { currentTaskOccurrence, repeatRuleOf, type CompletionSource } from "@/lib/task-occurrences";
import { toTaskPriority } from "@/lib/task-priority";
import { describeRepeat } from "@/lib/task-recurrence";
import { taskStatusOf } from "@/lib/task-status";
import { listCompletions, listTasks, type TaskRecord } from "@/lib/tasks";

/** How far either side of now completions are fetched for "the current occurrence". */
const COMPLETION_WINDOW_DAYS = 400;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Formatted here, on the server, in the HOUSEHOLD's zone rather than in the
 * browser: the same string is then produced during SSR and after hydration, and
 * "due Tuesday" means the same thing to everyone in the family regardless of
 * which device is looking. Household.timeZone exists for exactly this.
 */
function formatDue(dueAt: Date, timeZone: string, allDay: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(allDay ? {} : { hour: "numeric", minute: "2-digit" }),
  }).format(dueAt);
}

function toTaskItem(
  task: TaskRecord,
  completions: readonly CompletionSource[],
  now: Date,
  timeZone: string,
): TaskItem {
  const occurrence = currentTaskOccurrence(task, completions, now, timeZone);
  const rule = repeatRuleOf(task);
  // For a repeating task the board shows the current occurrence: its date,
  // and whether THAT one is done. taskStatusOf reads the same two fields it
  // always did; they are just the occurrence's rather than the row's.
  const dueAt = occurrence?.start ?? null;
  const completedAt = occurrence ? (occurrence.isDone ? now : null) : task.completedAt;

  return {
    id: task.id,
    title: task.title,
    icon: task.icon,
    notes: task.notes,
    priority: toTaskPriority(task.priority),
    status: taskStatusOf({ completedAt, dueAt }),
    dueLabel: dueAt ? formatDue(dueAt, timeZone, task.dueAllDay) : null,
    dueAtMs: dueAt ? dueAt.getTime() : null,
    memberId: task.memberId,
    memberName: task.member.name,
    memberColor: task.member.color,
    completedByName: occurrence?.completedByName ?? task.completedByMember?.name ?? null,
    repeatLabel: rule && task.dueAt ? describeRepeat(rule, task.dueAt, timeZone) : null,
    occurrenceStartMs: occurrence?.isRepeating ? occurrence.start.getTime() : null,
    details: taskDetailsOf(task),
  };
}

interface TasksPageProps {
  /** `?edit=<taskId>` opens the editor on that task: how the calendar links across. */
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const { household } = await requireHousehold();
  const { edit } = await searchParams;
  const initialEditTaskId = typeof edit === "string" ? edit : null;
  const now = new Date();
  const [tasks, completions] = await Promise.all([
    listTasks(household.id),
    listCompletions(household.id, {
      from: new Date(now.getTime() - COMPLETION_WINDOW_DAYS * MS_PER_DAY),
      to: new Date(now.getTime() + COMPLETION_WINDOW_DAYS * MS_PER_DAY),
    }),
  ]);

  return (
    // Same shell as the calendar page, which is the point: the two pages should
    // read as the same application.
    <div className="h-full w-full overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <TasksWorkspace
        tasks={tasks.map((task) => toTaskItem(task, completions, now, household.timeZone))}
        members={household.members.map((member) => ({
          id: member.id,
          name: member.name,
          color: member.color,
        }))}
        initialEditTaskId={initialEditTaskId}
      />
    </div>
  );
}
