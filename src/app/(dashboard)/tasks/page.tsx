import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";
import { requireHousehold } from "@/lib/household";
import type { TaskItem } from "@/lib/task-item";
import { toTaskPriority } from "@/lib/task-priority";
import { taskStatusOf } from "@/lib/task-status";
import { listTasks, type TaskRecord } from "@/lib/tasks";

/**
 * Formatted here, on the server, in the HOUSEHOLD's zone rather than in the
 * browser: the same string is then produced during SSR and after hydration, and
 * "due Tuesday" means the same thing to everyone in the family regardless of
 * which device is looking. Household.timeZone exists for exactly this.
 */
function formatDue(dueAt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dueAt);
}

function toTaskItem(task: TaskRecord, timeZone: string): TaskItem {
  return {
    id: task.id,
    title: task.title,
    icon: task.icon,
    notes: task.notes,
    priority: toTaskPriority(task.priority),
    status: taskStatusOf(task),
    dueLabel: task.dueAt ? formatDue(task.dueAt, timeZone) : null,
    dueAtMs: task.dueAt ? task.dueAt.getTime() : null,
    memberId: task.memberId,
    memberName: task.member.name,
    memberColor: task.member.color,
    completedByName: task.completedByMember?.name ?? null,
  };
}

export default async function TasksPage() {
  const { household } = await requireHousehold();
  const tasks = await listTasks(household.id);

  return (
    // Same shell as the calendar page, which is the point: the two pages should
    // read as the same application.
    <div className="h-full w-full overflow-hidden bg-background ring-slate-900/10 sm:rounded-2xl sm:shadow-lg sm:shadow-slate-900/5 sm:ring-1 dark:ring-white/10">
      <TasksWorkspace
        tasks={tasks.map((task) => toTaskItem(task, household.timeZone))}
        members={household.members.map((member) => ({
          id: member.id,
          name: member.name,
          color: member.color,
        }))}
      />
    </div>
  );
}
