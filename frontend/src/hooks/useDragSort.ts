import { useCallback, useEffect, useState } from 'react';
import { DropResult } from 'react-beautiful-dnd';

export function moveItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const nextList = [...list];
  const [removed] = nextList.splice(fromIndex, 1);
  nextList.splice(toIndex, 0, removed);
  return nextList;
}

export function useDragSort<T>(list: T[], onSorted?: (items: T[]) => void) {
  const [items, setItems] = useState<T[]>(list);

  useEffect(() => {
    setItems(list);
  }, [list]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) {
        return;
      }

      const nextItems = moveItem(items, result.source.index, result.destination.index);
      setItems(nextItems);
      onSorted?.(nextItems);
    },
    [items, onSorted],
  );

  return { items, setItems, onDragEnd };
}

