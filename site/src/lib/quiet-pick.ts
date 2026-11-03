type Listener = (id: string) => void;

const listeners = new Set<Listener>();

/** Asks the Silent timeline to show the object `id`, as if its row was picked. */
export function pickQuiet(id: string): void {
  listeners.forEach((fn) => fn(id));
}

export function onQuietPick(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
