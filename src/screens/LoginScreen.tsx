/**
 * First screen: pick a role (mandatory), then how to get a key. The key
 * buttons stay disabled until a role is picked, since the role decides where
 * a successful login lands.
 */
import type { CSSProperties } from 'react';

import { Page } from '@/components/Layout';
import { Logo } from '@/components/Logo';
import { ICON_SIZE } from '@/components/icon';
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
        <Logo />
      </div>

      <p className="section-label">Please Select</p>
      <div
        className="role-row"
        role="radiogroup"
        aria-label="Role"
        data-picked={role !== null || undefined}
        style={{ '--count': ROLE_ORDER.length, '--thumb': role === null ? 0 : ROLE_ORDER.indexOf(role) } as CSSProperties}
      >
        {ROLE_ORDER.map((option) => {
          const { label, Icon } = ROLES[option];
          return (
            <button
              key={option}
              type="button"
              role="radio"
              className="role-button"
              aria-checked={role === option}
              onClick={() => onRole(option)}
            >
              <Icon size={ICON_SIZE} />
              {label}
            </button>
          );
        })}
      </div>
      {/* Reserved line, so picking a role does not shift the buttons up. */}
      <p className="role-hint" aria-live="polite">{role === null ? 'Please select from Merchant or Customer.' : ''}</p>

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
    </Page>
  );
}
