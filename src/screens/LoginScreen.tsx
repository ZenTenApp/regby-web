/**
 * First screen: pick a role (mandatory), then how to get a key. The key
 * buttons stay disabled until a role is picked, since the role decides where
 * a successful login lands.
 */
import { Page } from '@/components/Layout';
import { Logo } from '@/components/Logo';
import { ROLES, ROLE_ORDER, type Role } from '@/components/roles';
import { errorMessage } from '@/lib/errors';
import { useAction } from '@/lib/use-action';
import { extensionSigner, generatedSigner, type Signer } from '@/services/keys/signer';

interface LoginScreenProps {
  role: Role | null;
  onRole: (role: Role) => void;
  onSigner: (signer: Signer) => void;
  onSsh: () => void;
}

export function LoginScreen({ role, onRole, onSigner, onSsh }: LoginScreenProps) {
  const { run, busy, error } = useAction(async () => onSigner(await extensionSigner()), errorMessage);
  const locked = role === null || busy;

  return (
    <Page role={role}>
      <div className="brand">
        <div className="brand-row">
          <Logo size={72} />
          <h1 className="brand-name">ReGBY</h1>
        </div>
        <p className="brand-tagline">Simple Pairing Communications Protocol</p>
      </div>

      <p className="section-label">Please Select</p>
      <div className="role-row">
        {ROLE_ORDER.map((option) => {
          const { label, Icon } = ROLES[option];
          return (
            <button
              key={option}
              type="button"
              className="role-button"
              data-role={option}
              aria-pressed={role === option}
              onClick={() => onRole(option)}
            >
              <Icon size={24} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="stack">
        <button type="button" className="btn" disabled={locked} onClick={() => onSigner(generatedSigner())}>
          Generate KeyPair
        </button>
        <button type="button" className="btn" disabled={locked} onClick={() => void run()}>
          Login with Signer
        </button>
        <button type="button" className="btn" disabled={locked} onClick={onSsh}>
          Login with SSH Key
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {role === null && <p className="note">Select Merchant or Customer to continue.</p>}
    </Page>
  );
}
