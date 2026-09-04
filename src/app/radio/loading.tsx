export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-24 rounded bg-muted animate-pulse" />
      <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
      <div className="h-32 w-full rounded-xl bg-muted animate-pulse" />
    </div>
  );
}
