export default function PortalLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-10 w-96 max-w-full animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-4 w-[32rem] max-w-full animate-pulse rounded-full bg-slate-100" />
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-4 h-10 w-20 animate-pulse rounded-2xl bg-slate-200" />
            <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-2 h-4 w-[30rem] max-w-full animate-pulse rounded-full bg-slate-100" />

        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
            >
              <div className="h-5 w-2/5 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-slate-100" />
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="h-4 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 animate-pulse rounded-full bg-slate-100" />
                <div className="h-4 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
