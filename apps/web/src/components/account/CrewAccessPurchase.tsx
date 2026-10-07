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
import { CONTACT_HREF, currentPriceCents, euros, isLaunchPrice, PRICING } from '@/lib/legal';

const INCLUDED = [
  'La page de votre road trip, publique ou privée',
  'Le suivi GPS en direct avec un simple téléphone',
  'Trace complète, kilomètres et statistiques',
  'Photos, photos 360° et sponsors sur la carte',
  'Vos compagnons de route invités gratuitement',
];

const CODE_REFUSED: Record<string, string> = {
  invalid: 'Code inconnu : vérifiez qu’il est bien recopié.',
  expired: 'Ce code a expiré.',
  exhausted: 'Ce code a déjà été utilisé.',
  already_used: 'Vous avez déjà utilisé ce code.',
  too_many: 'Trop d’essais : réessayez dans une heure.',
};

/** « J'ai un code d'accès » : un code offert remplace le paiement. */
function AccessCodeForm() {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const redeem = useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('redeem_access_code', { p_code: code })),
    onSuccess: (result) => {
      if (result !== 'ok') { toast.error(CODE_REFUSED[result] ?? 'Code refusé.'); return; }
      toast.success('Code accepté : votre accès road trip est offert !');
      void queryClient.invalidateQueries({ queryKey: ['crew-access'] });
    },
    onError: toastError,
  });
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); redeem.mutate(); }}
      className="mt-5 border-t border-cream/[0.1] pt-4"
    >
      <label htmlFor="access-code" className="flex items-center gap-2 text-xs font-semibold text-dust-200">
        <Gift className="h-4 w-4 text-ochre" />On vous a offert un code d’accès ?
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="access-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="TT-XXXX-XXXX"
          autoComplete="off"
          spellCheck={false}
          className="font-mono uppercase tracking-[0.08em]"
        />
        <Button type="submit" variant="secondary" disabled={!code.trim() || redeem.isPending}>Utiliser</Button>
      </div>
    </form>
  );
}

export function CrewAccessPurchase() {
  const [terms, setTerms] = useState(false);
  const [immediate, setImmediate] = useState(false);
  const price = currentPriceCents();

  const checkout = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ url: string }>('create-checkout', {
        body: { termsAccepted: terms, immediateStart: immediate },
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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
      <div>
        <p className="m-0 max-w-[520px] text-dust-300">
          Vous participez au raid ? Créez la page de votre road trip pour la partager à vos proches et sponsors. Vos compagnons de route la
          rejoindront ensuite par invitation, gratuitement.
        </p>
        <ul className="m-0 mt-5 list-none space-y-2 p-0">
          {INCLUDED.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm text-dust-200">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-live" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-cream/[0.14] bg-black/30 p-5">
        <p className="tt-kicker m-0 text-ochre">Accès road trip · paiement unique</p>
        <p className="m-0 mt-3 flex items-baseline gap-3">
          <span className="font-display text-6xl font-black leading-none text-cream">{euros(price)}</span>
          {isLaunchPrice() && <span className="text-lg text-dust-500 line-through">{euros(PRICING.regularCents)}</span>}
        </p>
        <p className="mb-0 mt-2 text-xs text-dust-400">
          {isLaunchPrice()
            ? <>Tarif de lancement jusqu’au {PRICING.launchLastDay}, puis {euros(PRICING.regularCents)}. </>
            : null}
          TTC, sans abonnement.
        </p>

        {paymentsEnabled ? (
          <form
            onSubmit={(e) => { e.preventDefault(); checkout.mutate(); }}
            className="mt-5 space-y-3 border-t border-cream/[0.1] pt-4 text-xs leading-relaxed text-dust-300"
          >
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
              <span>
                J’ai lu et j’accepte les <Link to="/conditions-vente" className="underline hover:text-cream">conditions de vente</Link>.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" required checked={immediate} onChange={(e) => setImmediate(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
              <span>
                Je demande l’accès immédiat au service. Si j’exerce mon droit de rétractation dans les 14 jours, je paierai la part du
                service déjà fournie.
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={!terms || !immediate || checkout.isPending}>
              <CreditCard />{checkout.isPending ? 'Redirection…' : `Payer ${euros(price)}`}
            </Button>
            <p className="m-0 text-center text-[11px] text-dust-500">Paiement sécurisé par carte bancaire (Stripe).</p>
          </form>
        ) : (
          <div className="mt-5 border-t border-cream/[0.1] pt-4">
            <Button className="w-full" disabled><CreditCard />Paiement bientôt disponible</Button>
            <p className="mb-0 mt-3 text-xs leading-relaxed text-dust-400">
              Le paiement en ligne ouvre dans quelques jours. Une question ? <a href={CONTACT_HREF} className="underline hover:text-cream">Écrivez-nous</a>.
            </p>
          </div>
        )}
        <AccessCodeForm />
      </div>
    </div>
  );
}
