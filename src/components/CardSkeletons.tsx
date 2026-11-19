import { Skeleton } from './ui'

/** Placeholder for a DestinationCard: photo block, title, meta, footer chips. */
export function DestinationCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-white/60">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-5/6" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/** Placeholder for a saved-trip card in Mero Yatra. */
export function TripCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white/60 sm:flex-row">
      <Skeleton className="h-32 w-full rounded-none sm:h-auto sm:w-44" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-2.5 w-1/2" />
        <Skeleton className="mt-auto h-2.5 w-1/3" />
      </div>
    </div>
  )
}

/** Placeholder for one itinerary day, shown while a plan is being generated. */
export function DayCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-white/60 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-11/12" />
        <Skeleton className="h-2.5 w-3/4" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  )
}
