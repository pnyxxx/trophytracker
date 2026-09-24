import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCrew, useMyCrews, useMyRole } from '@/hooks/queries';
import { InfoTab } from '@/components/manage/InfoTab';
import { PhotosTab } from '@/components/manage/PhotosTab';
import { SponsorsTab } from '@/components/manage/SponsorsTab';
import { MembersTab } from '@/components/manage/MembersTab';
import { GpsTab } from '@/components/manage/GpsTab';
import { DangerTab } from '@/components/manage/DangerTab';

const TABS = [
  { id: 'infos', label: 'Infos' },
  { id: 'gps', label: 'GPS' },
  { id: 'photos', label: 'Photos' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'membres', label: 'Membres' },
  { id: 'suppression', label: 'Suppression', ownerOnly: true },
];

export default function ManageCrewPage() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: crew, isLoading } = useCrew(slug);
  const { isLoading: loadingRoles } = useMyCrews();
  const { canEdit, isOwner } = useMyRole(crew?.id);

  if (isLoading || loadingRoles) return <PageShell><PageLoader /></PageShell>;
  if (!crew || !canEdit) return <Navigate to="/mon-compte" replace />;

  const tab = params.get('onglet') ?? 'infos';

  return (
    <PageShell>
      <Seo title={`Gérer ${crew.name}`} />
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <Link to="/mon-compte" className="mb-4 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Mon compte
        </Link>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary">Espace équipage</p>
            <h1 className="text-3xl font-bold text-white md:text-4xl">{crew.name}</h1>
          </div>
          <Button asChild variant="secondary">
            <Link to={`/equipages/${crew.slug}`}>Voir la page publique <ExternalLink className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ onglet: v }, { replace: true })}>
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start">
            {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
              <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="infos"><InfoTab crew={crew} /></TabsContent>
          <TabsContent value="gps"><GpsTab crew={crew} /></TabsContent>
          <TabsContent value="photos"><PhotosTab crew={crew} /></TabsContent>
          <TabsContent value="sponsors"><SponsorsTab crew={crew} /></TabsContent>
          <TabsContent value="membres"><MembersTab crew={crew} /></TabsContent>
          {isOwner && <TabsContent value="suppression"><DangerTab crew={crew} /></TabsContent>}
        </Tabs>
      </div>
    </PageShell>
  );
}
