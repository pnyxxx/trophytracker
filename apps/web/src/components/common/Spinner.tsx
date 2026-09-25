import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn('h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent', className)}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Spinner />
      <p className="tt-kicker text-dust-400">Chargement…</p>
    </div>
  );
}
