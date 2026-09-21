export default function Loading() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-5">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <div className="size-5 animate-pulse rounded bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
