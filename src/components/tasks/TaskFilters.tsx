"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TASK_PRIORITIES, TASK_PRIORITY_LABEL } from "@/lib/task-priority";
import { TASK_STATUSES, TASK_STATUS_LABEL } from "@/lib/task-status";

/** "all" rather than "" so the select shows a real, selectable option. */
export const ANY = "all";

export interface TaskFilterState {
  readonly query: string;
  readonly memberId: string;
  readonly priority: string;
  readonly status: string;
}

export const EMPTY_FILTERS: TaskFilterState = {
  query: "",
  memberId: ANY,
  priority: ANY,
  status: ANY,
};

export interface FilterMember {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export interface TaskFiltersProps {
  filters: TaskFilterState;
  onChange: (filters: TaskFilterState) => void;
  members: readonly FilterMember[];
  /** Shown next to the controls so an over-filtered list is never a mystery. */
  matchCount: number;
  totalCount: number;
  /**
   * Hidden on the board, where the columns ARE the statuses — filtering by one
   * there would just empty the other two.
   */
  showStatusFilter: boolean;
}

const SELECT_CLASS =
  "h-8 rounded-md border border-border bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function TaskFilters({
  filters,
  onChange,
  members,
  matchCount,
  totalCount,
  showStatusFilter,
}: TaskFiltersProps) {
  const isFiltered =
    filters.query !== "" ||
    filters.memberId !== ANY ||
    filters.priority !== ANY ||
    (showStatusFilter && filters.status !== ANY);

  const update = (patch: Partial<TaskFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <div className="relative min-w-40 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => update({ query: event.target.value })}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="h-8 pl-7"
        />
      </div>

      <select
        value={filters.memberId}
        onChange={(event) => update({ memberId: event.target.value })}
        aria-label="Filter by person"
        className={SELECT_CLASS}
      >
        <option value={ANY}>Everyone</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </select>

      {showStatusFilter ? (
        <select
          value={filters.status}
          onChange={(event) => update({ status: event.target.value })}
          aria-label="Filter by status"
          className={SELECT_CLASS}
        >
          <option value={ANY}>Any status</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {TASK_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      ) : null}

      <select
        value={filters.priority}
        onChange={(event) => update({ priority: event.target.value })}
        aria-label="Filter by priority"
        className={SELECT_CLASS}
      >
        <option value={ANY}>Any priority</option>
        {TASK_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {TASK_PRIORITY_LABEL[priority]}
          </option>
        ))}
      </select>

      {isFiltered ? (
        <>
          <span className="text-xs tabular-nums text-muted-foreground">
            {matchCount} of {totalCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="size-3.5" />
            Clear
          </Button>
        </>
      ) : null}
    </div>
  );
}
