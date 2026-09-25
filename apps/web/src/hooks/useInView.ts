import { useEffect, useState, type RefObject } from 'react';

/**
 * Vrai tant que l'élément est à l'écran (ou à moins de `margin` de l'être).
 * Sert à ne créer les cartes WebGL, coûteuses, qu'à l'approche de leur section.
 */
export function useInView(ref: RefObject<Element | null>, margin = '100%') {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setInView(true);
    const io = new IntersectionObserver(([entry]) => setInView(!!entry?.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return inView;
}

/** Comme useInView, mais reste vrai une fois l'élément approché (pour monter un composant une seule fois). */
export function useSeen(ref: RefObject<Element | null>, margin = '100%') {
  const inView = useInView(ref, margin);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (inView) setSeen(true);
  }, [inView]);
  return seen;
}
