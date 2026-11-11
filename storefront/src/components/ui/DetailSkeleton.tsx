export function DetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-4 sm:py-6 animate-pulse">
      <div className="h-3.5 w-52 rounded bg-[#f5eff2] mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6 lg:gap-10">
        <div className="aspect-square rounded-[20px] bg-[#f5eff2]" />
        <div className="space-y-4">
          <div className="h-56 rounded-[20px] border border-[#eae5e9] bg-[#fcf9fb]" />
          <div className="h-64 rounded-[18px] border border-[#eae5e9] bg-[#fcf9fb]" />
          <div className="h-40 rounded-[18px] border border-[#eae5e9] bg-[#fcf9fb]" />
        </div>
      </div>
    </div>
  );
}

