import { useEffect } from 'react';

/** Titre de l'onglet et description de la page. */
export function Seo({ title, description }: { title?: string; description?: string }) {
  useEffect(() => {
    document.title = title ? `${title} · TrophysTracker` : 'TrophysTracker — Suivez les équipages du 4L Trophy en direct';
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
  return null;
}
