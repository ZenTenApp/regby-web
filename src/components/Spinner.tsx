import { LoaderCircle } from 'lucide-react';

export function Spinner({ size }: { size: number }) {
  return <LoaderCircle className="spinner" size={size} />;
}
