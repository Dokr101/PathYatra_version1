import { Skeleton } from './ui'

/**
 * Page-level placeholder for a lazily loaded route. It follows the same
 * container width, rhythm and radius as a real page so the swap is quiet.
 */
export function PageSkeleton({ label = 'Loading page' }: { label?: string }) {
  return (
    <div className="container-page py-12" role="status" aria-live="polite" aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-9 w-full max-w-md" />
      <Skeleton className="mt-3 h-4 w-full max-w-sm" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-52 rounded-3xl" />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
