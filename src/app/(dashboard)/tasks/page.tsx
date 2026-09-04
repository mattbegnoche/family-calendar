import {
  TaskBoard,
  type BoardColumn,
  type BoardTask,
} from "@/components/tasks/TaskBoard";
import { requireHousehold } from "@/lib/household";
import { listTasks } from "@/lib/tasks";

export default async function TasksPage() {
  const { household } = await requireHousehold();
  const tasks = await listTasks(household.id);

  // One column per member, in the household's own sort order.
  const columns: BoardColumn[] = household.members.map((member) => ({
    memberId: member.id,
    name: member.name,
    color: member.color,
    tasks: tasks
      .filter((task) => task.memberId === member.id)
      .map(
        (task): BoardTask => ({
          id: task.id,
          title: task.title,
          icon: task.icon,
          isComplete: task.completedAt !== null,
        }),
      ),
  }));

  return (
    <div className="h-full w-full overflow-hidden p-1">
      <TaskBoard columns={columns} />
    </div>
  );
}
