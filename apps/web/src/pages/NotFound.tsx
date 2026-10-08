import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Button } from '@/components/ui/button';

/** Page introuvable : la balise a perdu le signal. */
export default function NotFound() {
  return (
    <PageShell>
      <Seo title="Page introuvable" noindex />
      <section className="relative flex min-h-[80vh] items-center overflow-hidden">
        <div aria-hidden="true" className="tt-display pointer-events-none absolute -bottom-20 -right-6 text-[min(60vw,520px)] leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(245,241,234,.08)]">
          404
        </div>
        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-start gap-6 px-5 py-20">
          <span className="flex items-center gap-2 rounded-full bg-gold/[0.16] px-[13px] py-[7px] font-mono text-[14px] text-gold-text">
            <span className="h-2 w-2 rounded-full border-2 border-gold" />404 · signal perdu
          </span>
          <h1 className="tt-display m-0 text-[clamp(56px,9vw,140px)] leading-[0.95] text-cream">
            Cette page est
            <br />
            <span className="text-signal">hors réseau.</span>
          </h1>
          <p className="m-0 max-w-[560px] text-[19px] leading-relaxed text-dust-200">
            Elle n’existe pas, ou plus. Si c’est un road trip, il est peut-être réservé à ses voyageurs : demande-leur le lien.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/">Retour à l’accueil</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/creer">Créer mon trip</Link></Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
