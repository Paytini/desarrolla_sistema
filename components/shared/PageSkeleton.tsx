function SkeletonBox({ className }: { className: string }) {
  return <div className={`rounded bg-gray-200 ${className}`} />
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 border-l-4 border-gray-200 pl-4">
          <SkeletonBox className="h-3 w-24" />
          <SkeletonBox className="h-8 w-56" />
          <SkeletonBox className="h-4 w-80" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-3 w-20" />
              <SkeletonBox className="size-9 rounded-xl" />
            </div>
            <SkeletonBox className="h-7 w-14" />
            <SkeletonBox className="h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-5 space-y-4">
        <SkeletonBox className="h-5 w-36" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
              <SkeletonBox className="size-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <SkeletonBox className="h-4 w-1/3" />
                <SkeletonBox className="h-3 w-1/2" />
              </div>
              <SkeletonBox className="h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
