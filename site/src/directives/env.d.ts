import 'astro';

declare module 'astro' {
  interface AstroClientDirectives {
    'client:idlemedia'?: string;
  }
}
