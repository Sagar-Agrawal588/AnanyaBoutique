import Image from "next/image";
import Link from "next/link";
import { getBrandSocialImage } from "@/config/brandAssets";
import { DEFAULT_HOME_SLIDES } from "@/utils/mediaDefaults";

const siteUrl = String(
  process.env.NEXT_PUBLIC_SITE_URL || "https://ananyaboutique.com",
)
  .trim()
  .replace(/^["']|["']$/g, "")
  .replace(/\/+$/, "");

const pagePath = "/style-guide";
const pageUrl = `${siteUrl}${pagePath}`;
const heroImage = DEFAULT_HOME_SLIDES[0];
const publisherLogo = getBrandSocialImage("openGraphImage");

export const metadata = {
  title: "Boutique Style Guide | Ananya Boutique",
  description:
    "Explore boutique styling ideas, occasion-ready looks, accessories, and curated shopping guidance from Ananya Boutique.",
  keywords: [
    "boutique style guide",
    "ethnic wear",
    "occasion styling",
    "fashion accessories",
    "Ananya Boutique",
  ],
  alternates: {
    canonical: pageUrl,
  },
  openGraph: {
    title: "Boutique Style Guide | Ananya Boutique",
    description:
      "A practical guide to choosing boutique looks, accessories, and occasion edits from Ananya Boutique.",
    url: pageUrl,
    type: "article",
    locale: "en_IN",
    siteName: "Ananya Boutique",
    images: [
      {
        url: heroImage,
        width: 1365,
        height: 768,
        alt: "Ananya Boutique curated style guide",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Boutique Style Guide | Ananya Boutique",
    description:
      "Styling notes, outfit ideas, and shopping guidance for boutique buyers.",
    images: [heroImage],
  },
};

const quickFacts = [
  {
    title: "Start with the occasion",
    body:
      "Choose pieces around where they will be worn: everyday styling, festive gatherings, gifting, or evening events.",
  },
  {
    title: "Balance outfit and accessories",
    body:
      "Pair statement pieces with simple finishing details, or let jewellery and clutches lift a minimal look.",
  },
  {
    title: "Build flexible edits",
    body:
      "Look for silhouettes, colors, and accents that can move between casual plans and special occasions.",
  },
];

const styleIdeas = [
  "Use a kurta set as a base and add a clutch for a polished evening look.",
  "Pair pearl accents with simpler necklines when you want a refined finish.",
  "Keep one versatile co-ord ready for errands, brunch, and travel days.",
  "Use occasion edits when you want a complete look without starting from scratch.",
];

const faqItems = [
  {
    question: "What should I look for in a boutique outfit?",
    answer:
      "Start with the occasion, fit, fabric feel, and styling details. Choose pieces that feel comfortable, versatile, and easy to pair.",
  },
  {
    question: "How should I choose accessories?",
    answer:
      "Use accessories to finish the mood of the outfit. A clutch, earrings, or subtle accent can make a simple look feel intentional.",
  },
  {
    question: "Where can I browse Ananya Boutique products and offers?",
    answer:
      "You can explore the main product catalog, combo deals, membership benefits, and blog content directly from the Ananya Boutique site.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "Boutique Style Guide",
      description:
        "A practical Ananya Boutique guide covering styling ideas, accessories, and curated shopping options.",
      image: `${siteUrl}${heroImage}`,
      author: {
        "@type": "Organization",
        name: "Ananya Boutique",
      },
      publisher: {
        "@type": "Organization",
        name: "Ananya Boutique",
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}${publisherLogo.src}`,
        },
      },
      mainEntityOfPage: pageUrl,
      datePublished: "2026-04-28",
      dateModified: "2026-06-06",
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
  ],
};

export default function StyleGuidePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#fffaf7_0%,_#ffffff_45%,_#f7f3ff_100%)] text-stone-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-16 lg:pt-16">
          <div>
            <p className="inline-flex rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700 shadow-sm">
              Ananya Boutique guide
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-stone-950 sm:text-5xl lg:text-6xl">
              Boutique styling ideas for everyday elegance and occasion-ready looks.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-700 sm:text-lg">
              Use this temporary guide to browse styling ideas, compare outfit
              categories, and move into Ananya Boutique collections with a clear
              sense of what fits your next moment.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm font-medium">
              <Link
                href="/products"
                className="rounded-full bg-stone-950 px-5 py-3 text-white transition hover:bg-stone-800"
              >
                Browse products
              </Link>
              <Link
                href="/combo-deals"
                className="rounded-full border border-stone-300 bg-white/85 px-5 py-3 text-stone-800 transition hover:border-stone-400"
              >
                View combo deals
              </Link>
              <Link
                href="/membership"
                className="rounded-full border border-stone-300 bg-white/85 px-5 py-3 text-stone-800 transition hover:border-stone-400"
              >
                Check membership
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-3 shadow-[0_25px_70px_rgba(68,44,12,0.12)] backdrop-blur">
              <div className="relative aspect-[16/11] overflow-hidden rounded-[1.5rem]">
                <Image
                  src={heroImage}
                  alt="Ananya Boutique curated style guide"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {quickFacts.map((fact) => (
            <article
              key={fact.title}
              className="rounded-[1.75rem] border border-stone-200/70 bg-white/85 p-6 shadow-sm backdrop-blur"
            >
              <h2 className="text-lg font-bold text-stone-900">{fact.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-700">
                {fact.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-[2rem] border border-stone-200/70 bg-white/90 p-7 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            Styling ideas
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
            Simple ways to build a boutique look
          </h2>
          <ul className="mt-6 grid gap-3 text-sm leading-7 text-stone-700 md:grid-cols-2">
            {styleIdeas.map((idea) => (
              <li
                key={idea}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                {idea}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-[2rem] border border-stone-200/70 bg-white/90 p-7 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
            Common questions around boutique styling
          </h2>
          <div className="mt-6 space-y-4">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50 px-5 py-4"
              >
                <h3 className="text-base font-bold text-stone-900">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-stone-700">
                  {item.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
