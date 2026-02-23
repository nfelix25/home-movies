<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import { queue, reorder, removeItem, jumpTo, type QueueItem } from '../lib/queue.svelte.js';

  let { open, onclose }: { open: boolean; onclose: () => void } = $props();

  // svelte-dnd-action needs its own copy of items during drag
  let dragItems = $state<QueueItem[]>([]);

  $effect(() => {
    dragItems = [...queue.items];
  });

  function handleConsider(e: CustomEvent<{ items: QueueItem[] }>) {
    dragItems = e.detail.items;
  }

  function handleFinalize(e: CustomEvent<{ items: QueueItem[] }>) {
    reorder(e.detail.items);
  }
</script>

<div class="queue-panel" class:open>
  <div class="panel-header">
    <span class="panel-title">Up Next</span>
    <span class="panel-count">{queue.items.length} item{queue.items.length !== 1 ? 's' : ''}</span>
    <button class="close-btn" onclick={onclose} aria-label="Close queue">✕</button>
  </div>

  {#if queue.items.length === 0}
    <p class="empty">Queue is empty</p>
  {:else}
    <ul
      class="queue-list"
      use:dndzone={{ items: dragItems, flipDurationMs: 150 }}
      onconsider={handleConsider}
      onfinalize={handleFinalize}
    >
      {#each dragItems as item, i (item.id)}
        <li class="queue-item" class:current={i === queue.currentIndex}>
          <span class="drag-handle" aria-hidden="true">⠿</span>
          <button class="item-title" onclick={() => jumpTo(i)}>
            {#if i === queue.currentIndex}
              <span class="playing-indicator">▶</span>
            {/if}
            <span class="title-text">{item.title}</span>
            {#if item.quality}
              <span class="quality-tag">{item.quality}</span>
            {/if}
          </button>
          <button class="remove-btn" onclick={() => removeItem(item.id)} aria-label="Remove from queue">✕</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .queue-panel {
    width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: #111;
    border-left: 1px solid #2a2a2a;
    border-radius: 0 4px 4px 0;
    transition: width 0.25s ease;
    flex-shrink: 0;
  }

  .queue-panel.open {
    width: 280px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #2a2a2a;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .panel-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: #eee;
  }

  .panel-count {
    font-size: 0.75rem;
    color: #666;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #555;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.25rem 0.35rem;
    border-radius: 3px;
    line-height: 1;
    transition: color 0.15s;
    flex-shrink: 0;
  }

  .close-btn:hover {
    color: #ccc;
  }

  .empty {
    padding: 1rem;
    color: #555;
    font-size: 0.85rem;
    text-align: center;
    white-space: nowrap;
  }

  .queue-list {
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
    overflow-y: auto;
    flex: 1;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3rem 0.5rem 0.3rem 0.25rem;
    transition: background 0.1s;
  }

  .queue-item:hover {
    background: #1a1a1a;
  }

  .queue-item.current {
    background: #1e2a1e;
  }

  .drag-handle {
    color: #444;
    font-size: 1rem;
    cursor: grab;
    padding: 0.25rem 0.15rem;
    flex-shrink: 0;
    user-select: none;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .item-title {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: transparent;
    border: none;
    color: #ccc;
    font-size: 0.8rem;
    text-align: left;
    cursor: pointer;
    padding: 0.15rem 0;
    min-width: 0;
    overflow: hidden;
  }

  .item-title:hover {
    color: #fff;
  }

  .playing-indicator {
    color: #4caf50;
    font-size: 0.65rem;
    flex-shrink: 0;
  }

  .title-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .quality-tag {
    font-size: 0.65rem;
    color: #555;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .remove-btn {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: #444;
    font-size: 0.7rem;
    cursor: pointer;
    padding: 0.25rem 0.3rem;
    border-radius: 3px;
    transition: all 0.1s;
    line-height: 1;
  }

  .remove-btn:hover {
    color: #e55;
    background: rgba(229, 85, 85, 0.1);
  }

  /* Mobile: full-width overlay */
  @media (max-width: 600px) {
    .queue-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 0;
      z-index: 10;
      border-radius: 0;
    }

    .queue-panel.open {
      width: 100%;
    }
  }
</style>
