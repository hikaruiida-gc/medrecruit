"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS, KANBAN_COLUMNS, formatDate } from "@/lib/constants";

interface Applicant {
  id: string;
  lastName: string;
  firstName: string;
  status: string;
  rating: number | null;
  appliedAt: string;
  position: { id: string; title: string } | null;
  compatibilityScore: number | null;
}

interface KanbanBoardProps {
  applicants: Applicant[];
  onStatusChange: (applicantId: string, newStatus: string) => Promise<void>;
  onRefresh: () => void;
}

function KanbanColumn({
  status,
  applicants,
  children,
}: {
  status: string;
  applicants: Applicant[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] rounded-xl p-3 transition-colors ${
        isOver ? "bg-[#D6E6F2]" : "bg-[#F7FBFC]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#2C3E50]">
          {STATUS_LABELS[status] || status}
        </h3>
        <Badge variant="secondary" className="bg-[#B9D7EA] text-[#2C3E50] text-xs">
          {applicants.length}
        </Badge>
      </div>
      <div className="space-y-2 min-h-[100px]">{children}</div>
    </div>
  );
}

function KanbanCard({ applicant }: { applicant: Applicant }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: applicant.id, data: { status: applicant.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg p-3 shadow-sm border border-[#B9D7EA] cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <Link href={`/applicants/${applicant.id}`} className="block">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-[#2C3E50]">
            {applicant.lastName} {applicant.firstName}
          </span>
          {applicant.compatibilityScore != null && (
            <Badge
              className={`text-xs ${
                applicant.compatibilityScore >= 80
                  ? "bg-green-100 text-green-800"
                  : applicant.compatibilityScore >= 60
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {Math.round(applicant.compatibilityScore)}%
            </Badge>
          )}
        </div>
        {applicant.position && (
          <p className="text-xs text-[#7F8C9B] mb-1">{applicant.position.title}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-[#7F8C9B]">{formatDate(applicant.appliedAt)}</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${s <= (applicant.rating || 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
              />
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}

function DragOverlayCard({ applicant }: { applicant: Applicant }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-lg border-2 border-[#769FCD] w-[260px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-[#2C3E50]">
          {applicant.lastName} {applicant.firstName}
        </span>
      </div>
      {applicant.position && (
        <p className="text-xs text-[#7F8C9B]">{applicant.position.title}</p>
      )}
    </div>
  );
}

export function KanbanBoard({ applicants, onStatusChange }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const getApplicantsByStatus = (status: string) =>
    applicants.filter((a) => a.status === status);

  const activeApplicant = activeId
    ? applicants.find((a) => a.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const applicant = applicants.find((a) => a.id === active.id);
    if (!applicant) return;

    // Determine target status - could be dropping on a column or another card
    let targetStatus = over.id as string;

    // If dropping on another card, get that card's status
    if (!KANBAN_COLUMNS.includes(targetStatus as typeof KANBAN_COLUMNS[number])) {
      const targetApplicant = applicants.find((a) => a.id === over.id);
      if (targetApplicant) {
        targetStatus = targetApplicant.status;
      } else {
        return;
      }
    }

    if (applicant.status !== targetStatus) {
      onStatusChange(applicant.id, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((status) => {
          const columnApplicants = getApplicantsByStatus(status);
          return (
            <KanbanColumn
              key={status}
              status={status}
              applicants={columnApplicants}
            >
              <SortableContext
                items={columnApplicants.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                {columnApplicants.map((applicant) => (
                  <KanbanCard key={applicant.id} applicant={applicant} />
                ))}
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeApplicant && <DragOverlayCard applicant={activeApplicant} />}
      </DragOverlay>
    </DndContext>
  );
}
