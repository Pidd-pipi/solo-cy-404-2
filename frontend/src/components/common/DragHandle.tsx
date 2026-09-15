import { GripVertical } from 'lucide-react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';

interface DragHandleProps {
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
}

export function DragHandle({ dragHandleProps }: DragHandleProps) {
  return (
    <span
      className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-alt)] active:cursor-grabbing"
      aria-label="拖拽排序"
      {...dragHandleProps}
    >
      <GripVertical size={18} aria-hidden />
    </span>
  );
}

