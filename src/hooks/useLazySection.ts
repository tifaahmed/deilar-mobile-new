import { useEffect, useRef, useState } from 'react';

const INTERACTION_EVENTS = ['scroll', 'wheel', 'touchmove', 'keydown'] as const;

/** True once the user has scrolled/touched/typed — or at once if the page is too short to scroll at all. */
function useInteracted(): boolean {
  const [interacted, setInteracted] = useState(false);

  useEffect(() => {
    if (interacted) return;

    // Nothing to scroll: waiting for a scroll that can never come would leave the page empty.
    if (document.documentElement.scrollHeight <= window.innerHeight + 1) {
      setInteracted(true);
      return;
    }

    const go = () => setInteracted(true);
    INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, go));
  }, [interacted]);

  return interacted;
}

/**
 * For a page section whose data should not be fetched while the page is still
 * painting: returns a ref for the section and a flag that turns true — and stays
 * true — once the user has scrolled AND the section is within `margin` of the viewport.
 * Nothing is requested on first load.
 */
export function useLazySection<T extends HTMLElement>(margin = '200px'): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const interacted = useInteracted();
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || loaded) return;

    const observer = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: margin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loaded, margin]);

  useEffect(() => {
    if (interacted && visible) setLoaded(true);
  }, [interacted, visible]);

  return [ref, loaded];
}
