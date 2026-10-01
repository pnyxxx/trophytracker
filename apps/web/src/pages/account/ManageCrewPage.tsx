import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Seo } from '@/components/common/Seo';
import { PageLoader } from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { Container, PageHero } from '@/components/common/Brand';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCrew, useMyCrews, useMyRole } from '@/hooks/queries';
import { InfoTab } from '@/components/manage/InfoTab';
import { PhotosTab } from '@/components/manage/PhotosTab';
import { SponsorsTab } from '@/components/manage/SponsorsTab';
import { MembersTab } from '@/components/manage/MembersTab';
import { GpsTab } from '@/components/manage/GpsTab';
import { DangerTab } from '@/components/manage/DangerTab';
import { CrewQrPanel } from '@/components/crew/CrewQr';

const TABS = [
  { id: 'infos', label: 'Infos' },
  { id: 'gps', label: 'GPS' },
  { id: 'photos', label: 'Photos' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'membres', label: 'Membres' },
  { id: 'qr', label: 'QR code' },
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
    <PageShell padTop={false}>
      <Seo title={`Gérer ${crew.name}`} noindex />
      <PageHero
        kicker={<><Link to="/mon-compte" className="inline-flex items-center gap-1 text-dust-300 hover:text-cream"><ArrowLeft className="h-3.5 w-3.5" />Mon compte</Link><span className="text-dust-600">/</span>Espace équipage</>}
        title={crew.name}
        aside={
          <Button asChild variant="secondary">
            <Link to={`/equipages/${crew.slug}`}>Voir la page publique <ExternalLink /></Link>
          </Button>
        }
      />
      <Container className="max-w-5xl pb-16">
        <Tabs value={tab} onValueChange={(v) => setParams({ onglet: v }, { replace: true })}>
          <TabsList className="mb-8 flex w-full justify-start overflow-x-auto">
            {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
              <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="infos"><InfoTab crew={crew} /></TabsContent>
          <TabsContent value="gps"><GpsTab crew={crew} /></TabsContent>
          <TabsContent value="photos"><PhotosTab crew={crew} /></TabsContent>
          <TabsContent value="sponsors"><SponsorsTab crew={crew} /></TabsContent>
          <TabsContent value="membres"><MembersTab crew={crew} /></TabsContent>
          <TabsContent value="qr"><CrewQrPanel crew={crew} /></TabsContent>
          {isOwner && <TabsContent value="suppression"><DangerTab crew={crew} /></TabsContent>}
        </Tabs>
      </Container>
    </PageShell>
  );
}
