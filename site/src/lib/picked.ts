type Listener = (key: string) => void;

let current = 'voyager1';
const listeners = new Set<Listener>();

export function getPicked(): string {
  return current;
}

export function setPicked(key: string): void {
  if (key === current) return;
  current = key;
  listeners.forEach((fn) => fn(key));
}

export function onPicked(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
