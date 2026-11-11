export default function CategoryLoading() {
  return (
    <div className="max-w-[1200px] mx-auto px-3.5 sm:px-6 py-5 sm:py-7 space-y-8 animate-pulse">
      <div className="h-3.5 w-44 rounded bg-[#f5eff2]" />
      <div className="h-40 sm:h-48 rounded-[22px] bg-[#fcf2f6]" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
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

