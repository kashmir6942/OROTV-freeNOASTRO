export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white font-sans pb-20 animate-pulse">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-50 bg-[#0b0c10]/95 border-b border-white/5 pt-safe-top">
        <div className="flex items-center justify-center h-[50px] relative">
          <div className="h-7 w-24 bg-white/10 rounded"></div>
          <div className="absolute right-4 w-8 h-8 bg-[#333] rounded-full"></div>
        </div>
        
        {/* Tab Scroller Skeleton */}
        <div className="flex overflow-x-auto px-4 gap-6 h-11 items-center scrollbar-hide">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-4 w-20 bg-white/10 rounded"></div>
          ))}
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="p-0">
        {/* Hero Skeleton */}
        <div className="relative w-full aspect-video mb-6 bg-[#1a1d26]"></div>

        {/* Channel Rows Skeleton */}
        {[1, 2, 3].map((category) => (
          <div key={category} className="mb-6">
            <div className="flex justify-between items-baseline px-4 mb-3">
              <div className="h-5 w-32 bg-white/10 rounded"></div>
              <div className="h-3 w-12 bg-white/10 rounded"></div>
            </div>
            <div className="flex overflow-x-auto px-4 gap-3 scrollbar-hide">
              {[1, 2, 3, 4].map((channel) => (
                <div key={channel} className="flex-none w-[140px] flex flex-col gap-2">
                  <div className="w-full aspect-video bg-[#1a1d26] rounded-lg border border-white/5"></div>
                  <div className="px-0.5 space-y-1">
                    <div className="h-3 w-3/4 bg-white/10 rounded"></div>
                    <div className="h-2 w-1/2 bg-white/5 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      {/* Bottom Nav Skeleton */}
      <nav className="fixed bottom-0 left-0 w-full h-[60px] bg-[#0b0c10]/98 border-t border-white/10 flex justify-around items-center z-50 pb-safe-bottom">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 w-[60px]">
            <div className="w-5 h-5 bg-white/10 rounded"></div>
            <div className="h-2 w-8 bg-white/10 rounded"></div>
          </div>
        ))}
      </nav>
    </div>
  )
}
