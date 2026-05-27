import { redirect } from "next/navigation";

export default async function LegacyProductRoute({ params }) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug.join("/") : String(rawSlug || "");

  redirect(slug ? `/product/${encodeURIComponent(slug)}` : "/products");
}
