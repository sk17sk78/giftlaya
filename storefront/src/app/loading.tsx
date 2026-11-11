export default function HomeLoading() {
  return (
    <div className="max-w-[1152px] mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="w-full aspect-[16/9] sm:aspect-[32/10] rounded-2xl bg-[#f7eef2]" />

      {/* Category Tiles Skeleton */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-[18px] bg-[#f5eff2]" />
            <div className="h-3 w-3/4 mx-auto rounded bg-[#f5eff2]" />
          </div>
        ))}
      </div>

      {/* Product Row Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-[17px] border border-[#f0e8ed] p-3 space-y-2.5 bg-white">
            <div className="aspect-square rounded-xl bg-[#f5eff2]" />
            <div className="h-3.5 w-4/5 rounded bg-[#f5eff2]" />
            <div className="h-4 w-1/2 rounded bg-[#f5eff2]" />
          </div>
        ))}
      </div>
    </div>
  );
}

