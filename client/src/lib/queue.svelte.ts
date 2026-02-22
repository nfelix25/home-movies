import { startStream, closePlayer } from './playerStore.svelte.js';

export interface QueueItem {
  id: string;
  title: string;
  magnet: string;
  quality?: string;
}

export const queue = $state({
  items: [] as QueueItem[],
  currentIndex: -1,
});

export function hasPrev() { return queue.currentIndex > 0; }
export function hasNext() { return queue.currentIndex < queue.items.length - 1; }

export function playNow(item: Omit<QueueItem, 'id'>) {
  const newItem: QueueItem = { ...item, id: crypto.randomUUID() };
  queue.items.splice(0, 0, newItem);
  queue.currentIndex = 0;
  startStream(newItem.magnet, newItem.title);
}

export function addToQueue(item: Omit<QueueItem, 'id'>) {
  const wasEmpty = queue.items.length === 0;
  const newItem: QueueItem = { ...item, id: crypto.randomUUID() };
  queue.items.push(newItem);
  if (wasEmpty) {
    queue.currentIndex = 0;
    startStream(newItem.magnet, newItem.title);
  }
}

export function next() {
  if (queue.currentIndex < queue.items.length - 1) {
    queue.currentIndex += 1;
    const item = queue.items[queue.currentIndex];
    startStream(item.magnet, item.title);
  }
}

export function prev() {
  if (queue.currentIndex > 0) {
    queue.currentIndex -= 1;
    const item = queue.items[queue.currentIndex];
    startStream(item.magnet, item.title);
  }
}

export function jumpTo(index: number) {
  if (index >= 0 && index < queue.items.length) {
    queue.currentIndex = index;
    const item = queue.items[index];
    startStream(item.magnet, item.title);
  }
}

export function removeItem(id: string) {
  const index = queue.items.findIndex((item) => item.id === id);
  if (index === -1) return;

  const removingCurrent = index === queue.currentIndex;
  queue.items.splice(index, 1);

  if (queue.items.length === 0) {
    queue.currentIndex = -1;
    closePlayer();
    return;
  }

  if (removingCurrent) {
    // Stay at same index (which is now the next item) unless we were at the end
    if (queue.currentIndex >= queue.items.length) {
      queue.currentIndex = queue.items.length - 1;
    }
    const item = queue.items[queue.currentIndex];
    startStream(item.magnet, item.title);
  } else if (index < queue.currentIndex) {
    // Removed item was before current — shift index down
    queue.currentIndex -= 1;
  }
}

export function reorder(newItems: QueueItem[]) {
  const currentId = queue.currentIndex >= 0 ? queue.items[queue.currentIndex]?.id : null;
  queue.items = newItems;
  if (currentId !== null) {
    const newIndex = newItems.findIndex((item) => item.id === currentId);
    queue.currentIndex = newIndex >= 0 ? newIndex : queue.currentIndex;
  }
}
