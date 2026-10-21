/**
 * Screen flow and the signed-in session. One signer and one relay client per
 * session; leaving the post-login screens signs out and drops both.
 *
 *   login ─┬─ ssh ─┐
 *          └───────┴─ merchant-compose ─ merchant-code
 *                  └─ customer-redeem ─ customer-content
 */
import { useCallback, useState } from 'react';

import type { Role } from '@/components/roles';
import type { Signer } from '@/services/keys/signer';
import { RegbyClient, type MintedCode } from '@/services/regby/client';
import { CustomerContentScreen } from '@/screens/CustomerContentScreen';
import { CustomerRedeemScreen } from '@/screens/CustomerRedeemScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { MerchantCodeScreen } from '@/screens/MerchantCodeScreen';
import { MerchantComposeScreen } from '@/screens/MerchantComposeScreen';
import { SshKeyScreen } from '@/screens/SshKeyScreen';

type Screen =
  | { kind: 'login' }
  | { kind: 'ssh' }
  | { kind: 'merchant-compose' }
  | { kind: 'merchant-code'; minted: MintedCode; content: string }
  | { kind: 'customer-redeem' }
  // `from` is null for a scanned QR: the text came off the merchant's screen,
  // not through the broker, so there is no signed sender.
  | { kind: 'customer-content'; content: string; from: string | null };

interface Session {
  signer: Signer;
  client: RegbyClient;
}

const HOME: Record<Role, Screen> = {
  merchant: { kind: 'merchant-compose' },
  customer: { kind: 'customer-redeem' },
};

export function App() {
  const [role, setRole] = useState<Role>('merchant');
  const [screen, setScreen] = useState<Screen>({ kind: 'login' });
  const [session, setSession] = useState<Session | null>(null);
  const [draft, setDraft] = useState('');

  const signIn = useCallback(
    (signer: Signer) => {
      setSession({ signer, client: new RegbyClient(signer) });
      setScreen(HOME[role]);
    },
    [role],
  );

  const signOut = useCallback(() => {
    session?.client.close();
    session?.signer.dispose();
    setSession(null);
    setDraft('');
    setScreen({ kind: 'login' });
  }, [session]);

  const mint = useCallback(
    async (content: string) => {
      if (!session) return;
      const minted = await session.client.mint(content);
      setScreen({ kind: 'merchant-code', minted, content });
    },
    [session],
  );

  const redeem = useCallback(
    async (code: string) => {
      if (!session) return;
      const { content, from } = await session.client.redeem(code);
      setScreen({ kind: 'customer-content', content, from });
    },
    [session],
  );

  switch (screen.kind) {
    case 'login':
      return (
        <LoginScreen
          role={role}
          onRole={setRole}
          onSigner={signIn}
          onSsh={() => setScreen({ kind: 'ssh' })}
        />
      );
    case 'ssh':
      return <SshKeyScreen role={role} onBack={() => setScreen({ kind: 'login' })} onSigner={signIn} />;
    case 'merchant-compose':
      return <MerchantComposeScreen draft={draft} onDraft={setDraft} onGenerate={mint} onBack={signOut} />;
    case 'merchant-code':
      return (
        <MerchantCodeScreen
          minted={screen.minted}
          content={screen.content}
          onRegenerate={() => {
            // The old code is expired; stop listening for it before re-minting.
            screen.minted.stop();
            return mint(screen.content);
          }}
          onBack={() => {
            screen.minted.stop();
            setScreen({ kind: 'merchant-compose' });
          }}
        />
      );
    case 'customer-redeem':
      return (
        <CustomerRedeemScreen
          onRedeem={redeem}
          onScanned={(content) => setScreen({ kind: 'customer-content', content, from: null })}
          onBack={signOut}
        />
      );
    case 'customer-content':
      return (
        <CustomerContentScreen
          content={screen.content}
          from={screen.from}
          onBack={() => setScreen({ kind: 'customer-redeem' })}
        />
      );
  }
}
