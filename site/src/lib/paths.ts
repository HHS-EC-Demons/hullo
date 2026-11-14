const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export function href(path = ''): string {
  return BASE + path.replace(/^\//, '');
}

export function asset(path: string): string {
  return BASE + path.replace(/^\//, '');
}
