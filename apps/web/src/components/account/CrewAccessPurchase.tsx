/**
 * Achat de l'accès road trip (paiement unique) : ce qui est inclus, prix du jour,
 * les deux cases exigées par le Code de la consommation, puis redirection vers
 * la page de paiement Stripe (Edge Function create-checkout). Ou un code d'accès offert
 * (généré dans l'administration), qui débloque l'accès sans paiement.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Check, CreditCard, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paymentsEnabled, supabase } from '@/lib/supabase';
import { toastError, unwrap } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { CONTACT_HREF, currentPriceCents, euros, isLaunchPrice, PRICING } from '@/lib/legal';

const INCLUDED = [
  'La page de ton road trip, privée par lien',
  'Le suivi GPS en direct avec un simple téléphone',
  'Trace, kilomètres, météo et altitude',
  'Photos, 360°, sponsors et cagnotte',
  'Le voyage rejoué en 3D, en vidéo',
  'Tes compagnons de route invités gratuitement',
];

const CODE_REFUSED: Record<string, string> = {
  invalid: 'Code inconnu : vérifie qu’il est bien recopié.',
  expired: 'Ce code a expiré.',
  exhausted: 'Ce code a déjà été utilisé.',
  already_used: 'Tu as déjà utilisé ce code.',
  too_many: 'Trop d’essais : réessaie dans une heure.',
};

/** « J'ai un code d'accès » : un code offert remplace le paiement. `folded` : replié derrière un lien. */
export function AccessCodeForm({ folded = false }: { folded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState(!folded);
  const redeem = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('redeem_access_code', { p_code: code })),
    onSuccess: (result) => {
      if (result !== 'ok') { toast.error(CODE_REFUSED[result] ?? 'Code refusé.'); return; }
      toast.success('Code accepté : ton accès road trip est offert !');
      void queryClient.invalidateQueries({ queryKey: ['crew-access'] });
    },
    onError: toastError,
  });
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 self-start text-[0.8824rem] font-bold text-dust-200 underline underline-offset-4 hover:text-cream">
        <Gift className="h-4 w-4 text-signal-text" />On t’a offert un code d’accès ?
      </button>
    );
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); redeem.mutate(); }} className={cn('flex flex-col gap-2', !folded && 'border-t-[1.5px] border-ink-700 pt-5')}>
      <label htmlFor="access-code" className="flex items-center gap-2 text-[0.8824rem] font-bold text-cream">
        <Gift className="h-4 w-4 text-signal-text" />On t’a offert un code d’accès ?
      </label>
      <div className="flex gap-2">
        <Input
          id="access-code"
          autoFocus={folded}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TT-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase tracking-[0.08em]"
        />
        <Button type="submit" variant="secondary" className="min-h-14" disabled={!code.trim() || redeem.isPending}>Utiliser</Button>
      </div>
    </form>
  );
}

/**
 * `returnTo` : page où Stripe ramène après le paiement (le parcours /creer, ou l'espace du compte par défaut).
 * `compact` : version courte pour le parcours sur téléphone (ce qui est inclus et le code offert sont repliés).
 */
export function CrewAccessPurchase({ returnTo, compact = false }: { returnTo?: 'creer'; compact?: boolean } = {}) {
  const [terms, setTerms] = useState(false);
  const [immediate, setImmediate] = useState(false);
  /** « Payer » touché sans avoir coché les deux cases : on dit pourquoi. */
  const [tried, setTried] = useState(false);
  const price = currentPriceCents();

  const checkout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ url: string }>('create-checkout', {
        body: { termsAccepted: terms, immediateStart: immediate, returnTo },
      });
      if (error) {
        const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
        throw new Error(body?.error ?? 'Le paiement est momentanément indisponible.');
      }
      return data!.url;
    },
    onSuccess: (url) => window.location.assign(url),
    onError: (e: Error) => toast.error(e.message),
  });

  const included = (
    <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
      {INCLUDED.map((item) => (
        <li key={item} className="flex gap-2.5 text-[0.8824rem] text-dust-200">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-live" />
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn('flex flex-col gap-5', compact ? 'gap-4' : 'rounded-[28px] border-[1.5px] border-cream/[0.08] tt-glass p-5 sm:p-7')}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {!compact && <span className="font-mono text-[0.7647rem] text-signal-text">accès road trip · paiement unique</span>}
          <p className="m-0 flex items-baseline gap-3">
            <span className="tt-display text-[3.2941rem] leading-none text-cream">{euros(price)}</span>
            {isLaunchPrice() && <span className="text-lg text-dust-500 line-through">{euros(PRICING.regularCents)}</span>}
          </p>
          <p className="m-0 text-[0.8235rem] text-dust-400">
            {isLaunchPrice() ? <>Tarif de lancement jusqu’au {PRICING.launchLastDay}, puis {euros(PRICING.regularCents)}. </> : null}
            TTC, sans abonnement. Gratuit pour tes proches.
          </p>
        </div>
      </div>
      {compact ? (
        <details className="group rounded-[18px] bg-ink-800/80 px-4 py-3">
          <summary className="cursor-pointer list-none text-[0.9412rem] font-bold text-cream marker:hidden">
            Ce qui est inclus <span className="ml-1 inline-block text-dust-400 transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="pt-3">{included}</div>
        </details>
      ) : included}

      {paymentsEnabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!terms || !immediate) return setTried(true);
            checkout.mutate();
          }}
          noValidate
          className={cn('flex flex-col gap-3 text-[0.8235rem] leading-relaxed text-dust-300', !compact && 'border-t-[1.5px] border-ink-700 pt-5')}
        >
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-signal" />
            <span>
              J’ai lu et j’accepte les <Link to="/conditions-vente" className="underline hover:text-cream">conditions de vente</Link>.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" required checked={immediate} onChange={(e) => setImmediate(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-signal" />
            <span>
              Je demande l’accès immédiat au service. Si j’exerce mon droit de rétractation dans les 14 jours, je paierai la part du
              service déjà fournie.
            </span>
          </label>
          {tried && (!terms || !immediate) && (
            <p role="alert" className="m-0 text-[0.8824rem] font-bold text-signal-text">Coche les deux cases pour pouvoir payer.</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={checkout.isPending}>
            <CreditCard />{checkout.isPending ? 'Redirection…' : `Payer ${euros(price)}`}
          </Button>
          <p className="m-0 text-center text-[0.7647rem] text-dust-500">Paiement sécurisé par carte bancaire (Stripe).</p>
        </form>
      ) : (
        <div className="border-t-[1.5px] border-ink-700 pt-5">
          <Button size="lg" className="w-full" disabled><CreditCard />Paiement bientôt disponible</Button>
          <p className="mb-0 mt-3 text-[0.8235rem] leading-relaxed text-dust-400">
            Le paiement en ligne ouvre dans quelques jours. Une question ? <a href={CONTACT_HREF} className="underline hover:text-cream">Écris-nous</a>.
          </p>
        </div>
      )}
      <AccessCodeForm folded={compact} />
    </div>
  );
}
