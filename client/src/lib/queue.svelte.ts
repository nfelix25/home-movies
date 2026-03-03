import { startStream, activateStream, closePlayer } from './playerStore.svelte.js';

export interface QueueItem {
  id: string;
  title: string;
  magnet: string;
  metadata: Record<string, unknown>;
  quality?: string;
}

export const queue = $state({
  items: [] as QueueItem[],
  currentIndex: -1,
});

export function hasPrev() { return queue.currentIndex > 0; }
export function hasNext() { return queue.currentIndex < queue.items.length - 1; }

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function playNow(item: Omit<QueueItem, 'id'>) {
  const newItem: QueueItem = { ...item, id: uid() };
  queue.items.splice(0, 0, newItem);
  queue.currentIndex = 0;
  startStream(newItem.magnet, newItem.title, newItem.metadata);
}

export function addToQueue(item: Omit<QueueItem, 'id'>) {
  const wasEmpty = queue.items.length === 0;
  const newItem: QueueItem = { ...item, id: uid() };
  queue.items.push(newItem);
  if (wasEmpty) {
    queue.currentIndex = 0;
    startStream(newItem.magnet, newItem.title, newItem.metadata);
  }
}

export function next() {
  if (queue.currentIndex < queue.items.length - 1) {
    queue.currentIndex += 1;
    const item = queue.items[queue.currentIndex];
    startStream(item.magnet, item.title, item.metadata);
  }
}

export function prev() {
  if (queue.currentIndex > 0) {
    queue.currentIndex -= 1;
    const item = queue.items[queue.currentIndex];
    startStream(item.magnet, item.title, item.metadata);
  }
}

export function jumpTo(index: number) {
  if (index >= 0 && index < queue.items.length) {
    queue.currentIndex = index;
    const item = queue.items[index];
    startStream(item.magnet, item.title, item.metadata);
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
    if (queue.currentIndex >= queue.items.length) {
      queue.currentIndex = queue.items.length - 1;
    }
    const item = queue.items[queue.currentIndex];
    startStream(item.magnet, item.title, item.metadata);
  } else if (index < queue.currentIndex) {
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
