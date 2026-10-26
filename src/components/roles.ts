import type { ComponentType, SVGProps } from 'react';

// Figma's own glyphs, exported in canvas coordinates: each viewBox frames its
// path, and both share one box size so their relative scale matches the design.
import PersonIcon from '@/assets/icons/person.svg?react';
import StorefrontIcon from '@/assets/icons/storefront.svg?react';

export type Role = 'merchant' | 'customer';

/** Everything that differs between the two roles, so screens never branch on it. */
export const ROLES: Record<Role, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  merchant: { label: 'Merchant', Icon: StorefrontIcon },
  customer: { label: 'Customer', Icon: PersonIcon },
};

export const ROLE_ORDER: readonly Role[] = ['merchant', 'customer'];
