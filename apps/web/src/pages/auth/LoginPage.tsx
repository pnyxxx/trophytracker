import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLoader } from '@/components/common/Spinner';
import { EmailCodeSignIn } from '@/components/auth/EmailCodeSignIn';
import { useAuth } from '@/hooks/auth';
import { AuthLayout, safeNext } from './AuthLayout';
import { MfaChallenge } from './MfaChallenge';

/**
 * /connexion et /inscription : le même parcours par code e-mail (l'inscription demande en plus le prénom).
 * Une adresse inconnue crée le compte ; une adresse connue connecte : on ne révèle pas lequel des deux.
 */
export default function LoginPage({ signup = false }: { signup?: boolean }) {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const { user, loading, needsMfa, mfaPending } = useAuth();
  const [hold, setHold] = useState(false);

  useEffect(() => {
    if (user && !hold && !mfaPending && !needsMfa) navigate(next, { replace: true });
  }, [user, hold, mfaPending, needsMfa, next, navigate]);

  if (loading || (user && !hold && mfaPending)) return <PageLoader />;

  if (user && !hold && needsMfa) {
    return (
      <AuthLayout title="Double authentification" subtitle="Saisis le code à 6 chiffres affiché par ton application d’authentification.">
        <MfaChallenge />
      </AuthLayout>
    );
  }

  const other = signup
    ? <>Déjà inscrit ? <Link to={`/connexion?next=${encodeURIComponent(next)}`} className="font-bold text-signal-text hover:text-cream">Se connecter</Link></>
    : <>Pas encore de compte ? <Link to={`/inscription?next=${encodeURIComponent(next)}`} className="font-bold text-signal-text hover:text-cream">Créer un compte</Link></>;

  return (
    <AuthLayout
      title={signup ? 'Créer ton compte' : 'Connexion'}
      subtitle={signup ? 'Ton compte sert à retrouver ton road trip depuis n’importe quel appareil.' : 'Entre ton e-mail : on t’envoie un code pour te connecter.'}
      footer={other}
    >
      <EmailCodeSignIn askName={signup} initialEmail={params.get('email') ?? ''} onHold={setHold} />
    </AuthLayout>
  );
}
