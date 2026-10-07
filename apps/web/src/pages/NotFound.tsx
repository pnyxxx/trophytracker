import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { Kicker } from '@/components/common/Brand';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <PageShell padTop={false}>
      <Seo title="Page introuvable" noindex />
      <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-[radial-gradient(120%_80%_at_80%_0%,#3A2215_0%,#1B1310_45%,#120F0C_75%)]">
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-6 font-stencil text-[min(60vw,520px)] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(244,236,223,.08)]">
          404
        </div>
        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-7 px-4 pb-16 pt-32 sm:px-7">
          <Kicker>Hors piste · 31°05′N 4°00′O</Kicker>
          <h1 className="m-0 font-display text-[clamp(64px,10vw,160px)] font-black uppercase leading-[0.95] text-cream">
            Perdu dans
            <br />
            le <span className="font-stencil text-primary">désert.</span>
          </h1>
          <p className="m-0 max-w-[520px] text-lg leading-relaxed text-dust-200">
            Cette page n’existe pas (ou plus). Si c’est un voyage, il est peut-être privé : demandez le lien à ses voyageurs.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/">Retour à l’accueil</Link></Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
