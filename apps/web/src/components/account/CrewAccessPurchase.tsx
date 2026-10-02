/**
 * Achat de l'accès équipage (paiement unique) : ce qui est inclus, prix du jour,
 * les deux cases exigées par le Code de la consommation, puis redirection vers
 * la page de paiement Stripe (Edge Function create-checkout).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Check, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { paymentsEnabled, supabase } from '@/lib/supabase';
import { CONTACT_HREF, currentPriceCents, euros, isLaunchPrice, PRICING } from '@/lib/legal';

const INCLUDED = [
  'La page de votre équipage, publique ou privée',
  'Le suivi GPS en direct avec un simple téléphone',
  'Trace complète, kilomètres et statistiques',
  'Photos, photos 360° et sponsors sur la carte',
  'Vos coéquipiers invités gratuitement',
];

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
          Vous participez au raid ? Créez la page de votre équipage pour la partager à vos proches et sponsors. Vos coéquipiers la
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
        <p className="tt-kicker m-0 text-ochre">Accès équipage · paiement unique</p>
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
            <p className="m-0 text-center text-[11px] text-dust-500">
              Paiement sécurisé par carte bancaire (Stripe). Un code promo ? Saisissez-le sur la page de paiement.
            </p>
          </form>
        ) : (
          <div className="mt-5 border-t border-cream/[0.1] pt-4">
            <Button className="w-full" disabled><CreditCard />Paiement bientôt disponible</Button>
            <p className="mb-0 mt-3 text-xs leading-relaxed text-dust-400">
              Le paiement en ligne ouvre dans quelques jours. Une question ? <a href={CONTACT_HREF} className="underline hover:text-cream">Écrivez-nous</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
