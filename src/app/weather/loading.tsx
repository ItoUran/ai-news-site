export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-32 rounded bg-muted animate-pulse" />
      <div className="h-10 w-56 rounded bg-muted animate-pulse" />
      <div className="h-64 w-full rounded-xl bg-muted animate-pulse" />
    </div>
  );
}
