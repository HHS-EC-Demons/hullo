/**
 * Astro client directive: hydrate once the media query in the directive
 * value matches and the browser is idle, so a phone-only island never loads
 * on wide screens and never competes with the first paint.
 */
export default (load, opts) => {
  const mq = window.matchMedia(opts.value);
  const run = async () => {
    const hydrate = await load();
    await hydrate();
  };
  const go = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2500 });
    else setTimeout(run, 300);
  };
  if (mq.matches) go();
  else mq.addEventListener('change', (e) => e.matches && go(), { once: true });
};
