import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { ROLES, type Role } from './roles';

export function Page({ role, children }: { role: Role | null; children: ReactNode }) {
  return (
    <main className="page">
      <section className="card" data-role={role ?? undefined}>
        {children}
      </section>
      <footer className="footer">©Copyright ZenTen 2025-2026</footer>
    </main>
  );
}

/** Role badge plus the Back button every screen after login carries. */
export function ScreenHeader({ role, onBack }: { role: Role; onBack: () => void }) {
  const { label, Icon } = ROLES[role];
  return (
    <header className="screen-header">
      <div className="role-badge">
        <span className="role-icon">
          <Icon size={26} strokeWidth={2} />
        </span>
        {label}
      </div>
      <BackButton onBack={onBack} />
    </header>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="back" onClick={onBack}>
      <ChevronLeft size={20} />
      Back
    </button>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <h1 className="title">{title}</h1>
      <p className="subtitle">{subtitle}</p>
    </>
  );
}
