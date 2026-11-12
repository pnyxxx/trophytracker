/**
 * Navigation d'un parcours en étapes (création de compte, création d'un road trip) : bouton rond « ← » et grand
 * bouton d'action. Placée juste sous le contenu de l'étape, pas collée en bas de l'écran : sur téléphone, elle
 * reste visible au-dessus du clavier. Le bouton principal envoie le formulaire de l'étape (touche « Entrée » /
 * « Suivant » du clavier comprise).
 */
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StepNav({ label, onBack, busy = false, hidePrimary = false }: {
  label: string;
  onBack?: () => void;
  busy?: boolean;
  /** Pas de bouton principal (ex. : l'étape a son propre bouton, comme « Payer »). */
  hidePrimary?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 pt-1">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Étape précédente"
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-ink-800 text-cream hover:bg-ink-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      {!hidePrimary && (
        <Button type="submit" size="lg" className="flex-1" disabled={busy}>
          {label}
        </Button>
      )}
    </div>
  );
}
