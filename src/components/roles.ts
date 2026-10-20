import { Store, UserRound, type LucideIcon } from 'lucide-react';

export type Role = 'merchant' | 'customer';

/** Everything that differs between the two roles, so screens never branch on it. */
export const ROLES: Record<Role, { label: string; Icon: LucideIcon }> = {
  merchant: { label: 'Merchant', Icon: Store },
  customer: { label: 'Customer', Icon: UserRound },
};

export const ROLE_ORDER: readonly Role[] = ['merchant', 'customer'];
