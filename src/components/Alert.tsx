import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { ICON_SIZE } from '@/components/icon';

interface AlertProps {
  title: string;
  children: ReactNode;
}

/**
 * A warning the user must not miss, for an exchange that may not be what it
 * seems, such as text the broker changed. Louder than an `.error` line:
 * boxed, titled, and announced by screen readers.
 */
export function Alert({ title, children }: AlertProps) {
  return (
    <div className="alert" role="alert">
      <TriangleAlert size={ICON_SIZE} aria-hidden />
      <div>
        <p className="alert-title">{title}</p>
        <p className="alert-body">{children}</p>
      </div>
    </div>
  );
}
