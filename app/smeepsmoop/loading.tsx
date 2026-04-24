import { Skeleton } from "@/components/ui/skeleton"

export default function SmeepsmoopLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-blue-500/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-32 h-6" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </div>
        <Skeleton className="w-full h-10 rounded-lg" />
      </header>

      {/* Hero Section Skeleton */}
      <div className="h-96 bg-gradient-to-b from-blue-900/30 to-transparent">
        <div className="p-6 h-full flex flex-col justify-end space-y-4">
          <div className="flex gap-3">
            <Skeleton className="w-16 h-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-24 h-6" />
              <Skeleton className="w-48 h-8" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
          <Skeleton className="w-full h-12 rounded-lg" />
          <div className="flex gap-1 justify-center">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-1 w-2 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="sticky top-16 z-30 bg-slate-950/95 border-b border-blue-500/20 p-4 flex gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Channel Grid Skeleton */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>

      {/* Safe area for bottom nav */}
      <div className="h-24" />
    </div>
  )
}
