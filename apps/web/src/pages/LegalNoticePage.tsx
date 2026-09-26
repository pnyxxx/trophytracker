import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/common/LegalPage';
import { BUSINESS, CONTACT_HREF, EDITOR, VAT_MENTION } from '@/lib/legal';

export default function LegalNoticePage() {
  return (
    <LegalPage seoTitle="Mentions légales" title={<>Mentions<br />légales</>}>
      <h2>Éditeur</h2>
      <p>
        TrophyTracker est un projet indépendant, édité par <strong>{EDITOR.name}</strong>, {BUSINESS.status.toLowerCase()}.
        <br />
        {BUSINESS.siret ? <>SIRET : {BUSINESS.siret}</> : <>Immatriculation en cours.</>} {VAT_MENTION}.
        {BUSINESS.address && <><br />Adresse : {BUSINESS.address}</>}
        <br />
        Contact : <a href={CONTACT_HREF}>{EDITOR.email}</a>
      </p>
      <p>Directeur de la publication : {EDITOR.name}.</p>

      <h2>Hébergement</h2>
      <ul>
        <li>
          <strong>Serveur</strong> : serveur personnel de l’éditeur, situé en France. Contact : <a href={CONTACT_HREF}>{EDITOR.email}</a>.
        </li>
        <li>
          <strong>Acheminement du trafic et protection</strong> : Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis
          (<a href="https://www.cloudflare.com" target="_blank" rel="noopener noreferrer">cloudflare.com</a>).
        </li>
        <li>
          <strong>Paiements</strong> : Stripe Payments Europe, Ltd., 1 Grand Canal Street Lower, Dublin 2, Irlande
          (<a href="https://stripe.com" target="_blank" rel="noopener noreferrer">stripe.com</a>).
        </li>
        <li>
          <strong>Envoi des emails</strong> : Brevo (Sendinblue SAS), Paris, France
          (<a href="https://www.brevo.com" target="_blank" rel="noopener noreferrer">brevo.com</a>).
        </li>
      </ul>

      <h2>Indépendance</h2>
      <p>
        TrophyTracker n’est <strong>ni organisé, ni soutenu, ni validé</strong> par l’organisation du 4L Trophy (Rey Voyages, Désertours)
        ni par Renault. Le nom « 4L Trophy » est une marque de son propriétaire ; il n’est cité que pour désigner l’événement que suivent
        les équipages. Les informations de l’événement (dates, étapes, parcours) sont indicatives et ne remplacent pas les communications
        officielles, à retrouver sur{' '}
        <a href="https://www.4ltrophy.com" target="_blank" rel="noopener noreferrer">4ltrophy.com</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Le site (textes, design, code) appartient à son éditeur. Les pages des équipages, leurs textes, photos et logos de sponsors
        appartiennent aux équipages et à leurs auteurs, qui en sont responsables (voir les{' '}
        <Link to="/conditions-utilisation">conditions d’utilisation</Link>).
      </p>
      <p>
        Cartes : © contributeurs <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>,{' '}
        <a href="https://openmaptiles.org" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>, servies par{' '}
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>. Imagerie satellite © Esri, Maxar,
        Earthstar Geographics. Relief : Mapzen / AWS Terrain Tiles.
      </p>

      <h2>Données personnelles</h2>
      <p>
        Tout est expliqué sur la page <Link to="/confidentialite">Confidentialité & données</Link>.
      </p>
    </LegalPage>
  );
}
