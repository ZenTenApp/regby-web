import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { ICON_SIZE } from './icon';
import { ROLES, type Role } from './roles';

const FOOTER = <footer className="footer">© 2026 ReGBY by ZenTen · Open Source (MIT) · v{__APP_VERSION__}</footer>;

interface PageProps {
  role: Role;
  /** Closes the card with the footer (login) instead of hanging it below. */
  footerInCard?: boolean;
  children: ReactNode;
}

export function Page({ role, footerInCard = false, children }: PageProps) {
  return (
    <main className="page">
      <section className="card" data-role={role} data-footer-in-card={footerInCard}>
        {children}
        {footerInCard && FOOTER}
      </section>
      {!footerInCard && FOOTER}
    </main>
  );
}

interface ScreenHeaderProps {
  role: Role;
  onBack: () => void;
  /** Holds the screen while work that Back would abandon is running. */
  backDisabled?: boolean;
}

/** Role badge plus the Back button every screen after login carries. */
export function ScreenHeader({ role, onBack, backDisabled = false }: ScreenHeaderProps) {
  const { label, Icon } = ROLES[role];
  return (
    <header className="screen-header">
      <div className="role-badge">
        <span className="role-icon">
          <Icon />
        </span>
        {label}
      </div>
      <BackButton onBack={onBack} disabled={backDisabled} />
    </header>
  );
}

function BackButton({ onBack, disabled }: { onBack: () => void; disabled: boolean }) {
  return (
    <button type="button" className="back" disabled={disabled} onClick={onBack}>
      <ChevronLeft size={ICON_SIZE} />
      Back
    </button>
  );
}

interface ScreenTitleProps {
  title: string;
  subtitle: string;
  centered?: boolean;
}

export function ScreenTitle({ title, subtitle, centered = false }: ScreenTitleProps) {
  const align = centered ? ' centered' : '';
  return (
    <>
      <h1 className={`title${align}`}>{title}</h1>
      <p className={`subtitle${align}`}>{subtitle}</p>
    </>
  );
}
