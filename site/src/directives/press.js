/**
 * Astro client directive: load and hydrate the island on the first sign of
 * intent, a pointer over it, a touch, focus or a click. A click that lands
 * while the island is still loading is replayed on the same button once
 * React owns it, so the first tap still opens what it was meant to open.
 */
export default (load, _opts, el) => {
  const intents = ['pointerover', 'touchstart', 'focusin'];
  let phase = 0;
  let pending = null;

  const start = async () => {
    if (phase) return;
    phase = 1;
    intents.forEach((type) => el.removeEventListener(type, start));
    const hydrate = await load();
    phase = 2;
    el.removeEventListener('click', hold, true);
    await hydrate();
    if (pending) {
      const target = pending;
      pending = null;
      requestAnimationFrame(() => target.isConnected && target.click());
    }
  };

  const hold = (event) => {
    if (phase === 2 || !(event.target instanceof Element)) return;
    const target = event.target.closest('button, a[href]');
    if (!target || target.tagName === 'A') return;
    pending = target;
    start();
  };

  intents.forEach((type) => el.addEventListener(type, start, { passive: true }));
  el.addEventListener('click', hold, true);
};
