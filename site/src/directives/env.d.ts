import 'astro';

declare module 'astro' {
  interface AstroClientDirectives {
    'client:press'?: boolean;
  }
}
