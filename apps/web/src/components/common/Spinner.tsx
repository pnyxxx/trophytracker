import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className={cn('h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent', className)}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}
