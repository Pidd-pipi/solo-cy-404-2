import { Switch } from '@headlessui/react';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useDragSort } from '../../hooks/useDragSort';
import { ResumeSection, ResumeSectionType } from '../../types/resume';
import { DragHandle } from '../common/DragHandle';

interface ModuleSidebarProps {
  sections: ResumeSection[];
  activeSectionId: ResumeSectionType;
  onSelect: (sectionId: ResumeSectionType) => void;
  onSorted: (sections: ResumeSection[]) => void;
  onToggle: (sectionId: ResumeSectionType) => void;
}

export function ModuleSidebar({ sections, activeSectionId, onSelect, onSorted, onToggle }: ModuleSidebarProps) {
  const { items, onDragEnd } = useDragSort(sections, onSorted);

  return (
    <aside className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <div>
        <h2 className="font-display text-xl font-semibold">模块顺序</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">拖拽左侧把手调整预览顺序。</p>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="resume-sections">
          {(provided) => (
            <div className="mt-4 space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((section, index) => (
                <Draggable draggableId={section.id} index={index} key={section.id}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`flex items-center gap-2 border px-2 py-2 transition ${
                        activeSectionId === section.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border)] bg-[var(--bg)]'
                      }`}
                    >
                      <DragHandle dragHandleProps={dragProvided.dragHandleProps} />
                      <button
                        className="min-w-0 flex-1 truncate text-left text-sm font-semibold"
                        type="button"
                        onClick={() => onSelect(section.id)}
                      >
                        {section.title}
                      </button>
                      <Switch
                        checked={section.enabled}
                        onChange={() => onToggle(section.id)}
                        className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border border-[var(--border)] transition ${
                          section.enabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-alt)]'
                        }`}
                        aria-label={`${section.title} 启用状态`}
                      >
                        <span
                          className={`mt-0.5 h-5 w-5 rounded-full bg-[var(--surface)] transition ${
                            section.enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </Switch>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </aside>
  );
}

