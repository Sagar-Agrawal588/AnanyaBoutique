export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 md:p-6">
      <div className="space-y-4 animate-pulse">
        <div className="h-12 w-full rounded-xl bg-white shadow-sm" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-24 rounded-xl bg-white shadow-sm" />
          <div className="h-24 rounded-xl bg-white shadow-sm" />
          <div className="h-24 rounded-xl bg-white shadow-sm" />
          <div className="h-24 rounded-xl bg-white shadow-sm" />
        </div>
        <div className="h-72 rounded-xl bg-white shadow-sm" />
      </div>
    </div>
  );
}
