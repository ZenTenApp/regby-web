import { LoaderCircle } from 'lucide-react';

import { ICON_SIZE } from './icon';

export function Spinner() {
  return <LoaderCircle className="spinner" size={ICON_SIZE} />;
}
