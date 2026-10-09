/**
 * /desabonnement?t=… : lien des e-mails du voyage. Un clic suffit, sans compte : on n'envoie plus
 * d'e-mail de ce road trip à cette adresse (invitation, « C'est parti », résumé du soir).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Spinner } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('t') ?? '';
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'unknown' | 'error'; name?: string }>({ status: 'loading' });
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    if (!UUID.test(token)) return setState({ status: 'unknown' });
    supabase.rpc('unsubscribe', { p_token: token }).then(({ data, error }) => {
      if (error) return setState({ status: 'error' });
      const r = data as { status: string; name?: string };
      setState(r.status === 'ok' ? { status: 'ok', name: r.name } : { status: 'unknown' });
      window.history.replaceState(null, '', '/desabonnement');
    });
  }, [token]);

  return (
    <PageShell>
      <Seo title="Désinscription" noindex />
      <section className="mx-auto flex max-w-[720px] flex-col items-start gap-5 px-5 py-20">
        {state.status === 'loading' ? <Spinner /> : (
          <>
            <span className="font-mono text-[14px] text-dust-400">e-mails du voyage</span>
            <h1 className="tt-display m-0 text-[clamp(40px,6vw,72px)] leading-none text-cream">
              {state.status === 'ok' ? 'C’est noté.' : state.status === 'unknown' ? 'Lien déjà utilisé.' : 'Oups.'}
            </h1>
            <p className="m-0 text-[19px] leading-relaxed text-dust-200">
              {state.status === 'ok'
                ? `Tu ne recevras plus d’e-mail de « ${state.name ?? 'ce road trip'} ». Le lien du voyage marche toujours, si tu veux le suivre de temps en temps.`
                : state.status === 'unknown'
                  ? 'Ce lien de désinscription n’est plus valable : tu es sans doute déjà désinscrit.'
                  : 'La désinscription n’a pas abouti. Réessaie dans un instant, ou réponds simplement à l’e-mail reçu.'}
            </p>
            <Button asChild variant="outline"><Link to="/">Découvrir trophytracker</Link></Button>
          </>
        )}
      </section>
    </PageShell>
  );
}
