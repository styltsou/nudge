import { animate } from 'motion/mini';

/** A native disclosure with an explicit presence lifecycle for Motion's exit. */
export function attachToc(host: HTMLElement): () => void {
  const details = host.querySelector('details')!;
  const summary = host.querySelector('summary')!;
  const panel = host.querySelector<HTMLElement>('.dropdown')!;
  const currentLabel = host.querySelector<HTMLElement>('.display-current')!;
  const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('a'));
  const lifetime = new AbortController();
  const { signal } = lifetime;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 72rem)');
  let desiredOpen = details.open;
  let generation = 0;
  let frame = 0;
  let controls: ReturnType<typeof animate> | undefined;
  const curve = getComputedStyle(document.documentElement)
    .getPropertyValue('--ease-out')
    .match(/[\d.]+/g)
    ?.map(Number);
  const ease: [number, number, number, number] =
    curve?.length === 4
      ? [curve[0]!, curve[1]!, curve[2]!, curve[3]!]
      : [0.23, 1, 0.32, 1];

  function accessibility(open: boolean) {
    summary.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
  }
  function stop() {
    generation++;
    controls?.stop();
    controls = undefined;
  }
  function settle(open: boolean) {
    details.open = open;
    details.dataset.state = open ? 'open' : 'closed';
    panel.style.opacity = '1';
    panel.style.transform = 'none';
    accessibility(open);
  }
  function setOpen(open: boolean, pointer: boolean) {
    stop();
    const run = generation;
    desiredOpen = open;
    accessibility(open);
    if (!pointer || reduceMotion.matches || desktop.matches) {
      settle(open);
      return;
    }
    if (open && !details.open) {
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(-4px)';
      details.open = true;
    }
    if (!details.open) {
      settle(false);
      return;
    }
    details.dataset.state = open ? 'opening' : 'closing';
    controls = animate(
      panel,
      {
        opacity: open ? 1 : 0,
        transform: open ? 'translateY(0px)' : 'translateY(-2px)',
      },
      { duration: open ? 0.15 : 0.125, ease },
    );
    // The panel stays rendered until exit finishes; stale completions cannot close a reopened panel.
    void controls.then(() => {
      if (run !== generation || signal.aborted) return;
      controls = undefined;
      settle(open);
    });
  }

  summary.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      setOpen(!desiredOpen, event.detail > 0);
    },
    { signal },
  );
  panel.addEventListener(
    'click',
    (event) => {
      if (event.target instanceof Element && event.target.closest('a'))
        setOpen(false, false); // Navigation should never wait for an exit animation.
    },
    { signal },
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (
        desiredOpen &&
        event.target instanceof Node &&
        !host.contains(event.target)
      )
        setOpen(false, true);
    },
    { signal },
  );
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape' || (!desiredOpen && !details.open)) return;
      const restore = host.contains(document.activeElement);
      setOpen(false, false);
      if (restore) summary.focus();
    },
    { signal },
  );
  reduceMotion.addEventListener(
    'change',
    () => {
      stop();
      settle(desiredOpen);
    },
    { signal },
  );
  desktop.addEventListener(
    'change',
    () => {
      if (desktop.matches) setOpen(false, false);
    },
    { signal },
  );

  const entries = links.flatMap((link) => {
    const heading = document.getElementById(
      decodeURIComponent(link.hash.slice(1)),
    );
    return heading ? [{ link, heading }] : [];
  });
  function updateCurrent() {
    frame = 0;
    const offset =
      (document.querySelector('header')?.getBoundingClientRect().height ?? 0) +
      summary.getBoundingClientRect().height +
      32;
    let current = entries[0]?.link;
    for (const entry of entries) {
      if (entry.heading.getBoundingClientRect().top <= offset)
        current = entry.link;
    }
    if (!current) return;
    for (const link of links) {
      if (link === current) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    currentLabel.textContent = current.textContent?.trim() ?? '';
  }
  function scheduleCurrent() {
    if (!frame) frame = requestAnimationFrame(updateCurrent);
  }
  window.addEventListener('scroll', scheduleCurrent, { passive: true, signal });
  window.addEventListener('resize', scheduleCurrent, { signal });
  window.addEventListener('hashchange', scheduleCurrent, { signal });
  settle(desiredOpen);
  scheduleCurrent();
  return () => {
    stop();
    lifetime.abort();
    if (frame) cancelAnimationFrame(frame);
  };
}
