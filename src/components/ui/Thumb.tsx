import React from 'react';
import { Building2, Package, Store } from 'lucide-react';

const ICONS = { facility: Building2, store: Store, product: Package } as const;

/**
 * An image that costs nothing until it is near the screen (`lazy`), decodes off
 * the main thread, and falls back to an icon when the record has no picture —
 * or the picture fails to load.
 */
export const Thumb: React.FC<{
  src?: string | null;
  alt: string;
  kind: keyof typeof ICONS;
  className?: string;
  fit?: 'cover' | 'contain';
  /** Above the fold: fetched at once instead of waiting to scroll near (the first cards of a list). */
  priority?: boolean;
}> = ({ src, alt, kind, className = '', fit = 'cover', priority = false }) => {
  const [failed, setFailed] = React.useState(false);
  const Icon = ICONS[kind];

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`} role="img" aria-label={alt}>
        <Icon className="w-1/3 h-1/3 max-w-10 max-h-10" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
      className={`${fit === 'cover' ? 'object-cover' : 'object-contain bg-white'} ${className}`}
    />
  );
};
