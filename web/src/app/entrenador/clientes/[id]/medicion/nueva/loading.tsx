export default function Loading() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 p-4">
      <div className="h-9 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
