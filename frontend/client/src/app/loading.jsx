import BrandLogo from "@/components/brand/BrandLogo";

export default function Loading() {
  return (
    <div className="min-h-[60vh] w-full px-4 py-8 md:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-5 animate-pulse">
        <div className="flex justify-center">
          <BrandLogo
            variant="main"
            imageClassName="h-16 w-16 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.14)]"
          />
        </div>
        <div className="h-10 w-2/3 rounded-xl bg-amber-100" />
        <div className="h-40 w-full rounded-2xl bg-orange-50" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-44 rounded-2xl bg-stone-100" />
          <div className="h-44 rounded-2xl bg-stone-100" />
          <div className="h-44 rounded-2xl bg-stone-100" />
        </div>
      </div>
    </div>
  );
}
