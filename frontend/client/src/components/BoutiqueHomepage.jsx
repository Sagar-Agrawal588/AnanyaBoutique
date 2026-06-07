"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Gem,
  Heart,
  Home,
  Instagram,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  WandSparkles,
} from "lucide-react";
import {
  artworkRegistry,
} from "@/config/visualIdentity";
import {
  DEFAULT_STOREFRONT_CONTENT,
  buildContactHelpers,
} from "@/config/storefrontContent";
import BrandArtworkFrame from "./brand/BrandArtworkFrame";
import ProductItem from "./ProductItem";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const sectionViewport = { once: true, amount: 0.22 };

const founderBadges = [
  { label: "Founded 2012", Icon: Sparkles },
  { label: "Family-Owned", Icon: Home },
  { label: "Mother Entrepreneur", Icon: Heart },
  { label: "Trusted Boutique", Icon: ShieldCheck },
];

const trustCards = [
  {
    title: "Trusted Since 2012",
    copy: "Years of dedication, repeat customers, and patient boutique growth.",
    Icon: ShieldCheck,
  },
  {
    title: "Fashion Selected With Care",
    copy: "Every piece is chosen with a homemaker's eye for beauty and use.",
    Icon: Sparkles,
  },
  {
    title: "Affordable Elegance",
    copy: "Styles that feel special without feeling out of reach.",
    Icon: Gem,
  },
  {
    title: "Personal WhatsApp Assistance",
    copy: "Warm product guidance and order help when customers need it.",
    Icon: MessageCircle,
  },
  {
    title: "Family-Owned Business",
    copy: "A real family business shaped by courage, care, and responsibility.",
    Icon: Home,
  },
  {
    title: "Customer-First Support",
    copy: "Support that remembers there is a person behind every order.",
    Icon: Users,
  },
];

const timelineItems = [
  {
    year: "2012",
    title: "Ananya Boutique Founded",
    copy: "A homemaker started with fashion, courage, and a dream inside a home.",
  },
  {
    year: "2024",
    title: "Beauty & Jewellery Added",
    copy: "The boutique expanded into finishing touches customers could style together.",
  },
  {
    year: "Present",
    title: "Growing Online & Offline",
    copy: "The dream continues through every saree, order, and customer smile.",
  },
];

const dreamSupports = [
  "A mother",
  "A family business",
  "A woman entrepreneur",
  "A dream that started at home",
];

const promiseCards = [
  "Quality Products",
  "Affordable Prices",
  "Trusted Support",
  "Curated Fashion",
  "Secure Shopping",
  "Customer Satisfaction",
];

const instagramCards = [
  "New arrivals",
  "Saree moments",
  "Jewellery details",
  "Beauty picks",
  "Behind the boutique",
  "Customer love",
];

const demoTestimonials = [
  {
    name: "Priya S.",
    text: "The saree looked elegant, the price felt fair, and the support felt personal.",
  },
  {
    name: "Neha R.",
    text: "I loved that this felt like buying from a real boutique, not a faceless store.",
  },
  {
    name: "Pooja K.",
    text: "The collection feels feminine and practical. I found something for daily wear and a function.",
  },
  {
    name: "Anjali M.",
    text: "Their WhatsApp help made choosing colours and styles so much easier.",
  },
  {
    name: "Ritika A.",
    text: "Affordable, graceful, and trustworthy. It feels good supporting a woman-led business.",
  },
  {
    name: "Kavya T.",
    text: "Every piece felt selected with care. The boutique story makes the purchase more meaningful.",
  },
];

const badgeIconCycle = [Sparkles, Home, Heart, ShieldCheck];
const trustIconCycle = [ShieldCheck, Sparkles, Gem, MessageCircle, Home, Users];

const toBadge = (badge, index = 0) => {
  if (badge && typeof badge === "object") {
    return {
      label: badge.label || badge.title || "",
      Icon: badge.Icon || badgeIconCycle[index % badgeIconCycle.length],
    };
  }
  return {
    label: String(badge || "").trim(),
    Icon: badgeIconCycle[index % badgeIconCycle.length],
  };
};

const toBadges = (items, fallback = founderBadges) => {
  const source = Array.isArray(items) && items.length ? items : fallback;
  return source.map(toBadge).filter((badge) => badge.label);
};

const toTrustCards = (items) => {
  const source = Array.isArray(items) && items.length ? items : trustCards;
  return source.map((card, index) => ({
    title: card.title || "",
    copy: card.copy || card.description || "",
    Icon: card.Icon || trustIconCycle[index % trustIconCycle.length],
  }));
};

const getSlotArtwork = (mediaSlots, slot, fallbackArtwork, title, copy) => {
  const source = slot ? String(mediaSlots?.[slot] || "").trim() : "";
  if (!source) return fallbackArtwork;
  return {
    ...(fallbackArtwork || {}),
    source,
    title: title || fallbackArtwork?.title,
    copy: copy || fallbackArtwork?.copy,
  };
};

const getWhatsappHref = (contact, message) =>
  buildContactHelpers(contact).whatsappHref(message);

function AnimatedBadge({ badge, index }) {
  const Icon = badge.Icon;
  return (
    <motion.span
      variants={fadeUp}
      whileHover={{ y: -4, scale: 1.03 }}
      animate={{ y: [0, -3, 0] }}
      transition={{
        y: {
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: index * 0.18,
        },
        scale: { duration: 0.18 },
      }}
      className="inline-flex items-center gap-2 rounded-full border border-[#f0d7e2] bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7c2d62] shadow-[0_12px_35px_rgba(124,45,98,0.11)]"
    >
      <Icon className="h-3.5 w-3.5 text-[#c02672]" aria-hidden="true" />
      {badge.label}
    </motion.span>
  );
}

function SectionHeading({ eyebrow, title, copy, centered = false }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`${centered ? "mx-auto text-center" : ""} max-w-3xl`}
    >
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="brand-story-heading text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {copy ? (
        <p className="mt-4 text-base leading-7 text-[#6b4b5c] sm:text-lg">
          {copy}
        </p>
      ) : null}
    </motion.div>
  );
}

function BoutiqueVisual({ compact = false, content, mediaSlots }) {
  const fallbackArtwork = compact
    ? artworkRegistry.homepage.heroMobile
    : artworkRegistry.homepage.heroDesktop;

  return (
    <BrandArtworkFrame
      artwork={getSlotArtwork(
        mediaSlots,
        content?.mediaSlot,
        fallbackArtwork,
        content?.title,
        content?.subtitle,
      )}
      aspect={compact ? "portrait" : "hero"}
      icon={Sparkles}
      label="Ananya Boutique"
    />
  );
}

function FounderStorySection({ content, mediaSlots, contact }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.founder,
    ...(content || {}),
  };
  const badges = toBadges(section.badges);
  const whatsappHref = getWhatsappHref(
    contact,
    "Hi Ananya Boutique, I would like to chat about your collection.",
  );

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="mx-auto grid w-full max-w-7xl gap-7 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16"
    >
      <motion.div variants={fadeUp}>
        <BrandArtworkFrame
          artwork={getSlotArtwork(
            mediaSlots,
            section.mediaSlot,
            artworkRegistry.homepage.founderPortrait,
            section.title,
            section.paragraphs?.[0],
          )}
          aspect="portrait"
          icon={Heart}
          className="min-h-[380px] sm:min-h-[460px]"
          label="Founder Story"
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex flex-col justify-center rounded-[1.6rem] border border-[#f0d7e2] bg-white/86 p-5 shadow-[0_24px_80px_rgba(124,45,98,0.12)] sm:rounded-[2rem] sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
          {section.eyebrow}
        </p>
        <h2 className="mt-3 brand-story-heading text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl lg:text-5xl">
          {section.title}
        </h2>
        <div className="mt-5 space-y-4 text-base leading-8 text-[#604354]">
          {(section.paragraphs || []).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <motion.div
          variants={stagger}
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Founder story badges"
        >
          {badges.map((badge, index) => (
            <AnimatedBadge key={badge.label} badge={badge} index={index} />
          ))}
        </motion.div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href={section.primaryButtonHref || "/about-us"}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a] sm:rounded-full"
          >
            {section.primaryButtonText}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#f0d7e2] bg-white px-6 text-sm font-semibold text-[#7c2d62] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff1f7] sm:rounded-full"
          >
            {section.secondaryButtonText}
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </motion.div>
    </motion.section>
  );
}

function TrustSection({ content }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.trust,
    ...(content || {}),
  };
  const cards = toTrustCards(section.cards);

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <SectionHeading
        centered
        eyebrow={section.eyebrow}
        title={section.title}
        copy={section.copy}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.Icon;
          return (
            <motion.article
              key={card.title}
              variants={fadeUp}
              whileHover={{ y: -8, scale: 1.015 }}
              className="group rounded-[1.75rem] border border-[#f0d7e2] bg-white/88 p-5 shadow-[0_18px_58px_rgba(124,45,98,0.11)] transition"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#fff1f7] text-[#c02672] transition group-hover:bg-[#2f1325] group-hover:text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#2f1325]">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6b4b5c]">
                {card.copy}
              </p>
            </motion.article>
          );
        })}
      </div>
    </motion.section>
  );
}

function JourneyTimelineSection({ content }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.timeline,
    ...(content || {}),
  };
  const items = Array.isArray(section.items) && section.items.length
    ? section.items
    : timelineItems;

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          centered
          eyebrow={section.eyebrow}
          title={section.title}
          copy={section.copy}
        />
        <div className="relative mt-10 grid gap-5 lg:grid-cols-3">
          <div className="pointer-events-none absolute left-6 top-8 hidden h-px w-[calc(100%-3rem)] bg-[linear-gradient(90deg,#c02672,#e8c67a,#7c3aed)] lg:block" />
          {items.map((item, index) => (
            <motion.article
              key={item.year}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="relative rounded-[1.75rem] border border-[#f0d7e2] bg-white/90 p-6 shadow-[0_18px_58px_rgba(124,45,98,0.1)]"
            >
              <div className="mb-5 inline-grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-[#2f1325] text-sm font-bold text-white shadow-[0_14px_38px_rgba(47,19,37,0.2)]">
                {index + 1}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
                {item.year}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-[#2f1325]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#6b4b5c]">
                {item.copy}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function DreamSupportSection({ content }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.dream,
    ...(content || {}),
  };
  const supports = Array.isArray(section.supports) && section.supports.length
    ? section.supports
    : dreamSupports;

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[2rem] border border-[#f0d7e2] bg-[linear-gradient(135deg,#2f1325_0%,#4b1f3a_55%,#7c2d62_100%)] p-6 text-white shadow-[0_30px_100px_rgba(47,19,37,0.28)] sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10">
        <motion.div variants={fadeUp} className="flex flex-col justify-center">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10">
            <Quote className="h-5 w-5 text-[#f8d88a]" aria-hidden="true" />
          </div>
          <h2 className="brand-story-heading text-4xl font-semibold leading-tight sm:text-5xl">
            {section.title}
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
            {section.copy}
          </p>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8d88a]">
            {section.supportLabel}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {supports.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
              >
                <CheckCircle className="h-4 w-4 text-[#f8d88a]" />
                {item}
              </div>
            ))}
          </div>
          <blockquote className="mt-8 max-w-3xl border-l-2 border-[#f8d88a] pl-5 brand-story-heading text-2xl font-semibold leading-snug text-white sm:text-3xl">
            &quot;{section.quote}&quot;
          </blockquote>
        </motion.div>
        <motion.div variants={fadeUp}>
          <BrandArtworkFrame
            artwork={artworkRegistry.homepage.dreamSection}
            aspect="wide"
            icon={Heart}
            className="min-h-[360px]"
            label="The Dream"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}

function PromiseSection({ content }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.promise,
    ...(content || {}),
  };
  const items = Array.isArray(section.items) && section.items.length
    ? section.items
    : promiseCards;

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <SectionHeading
        centered
        eyebrow={section.eyebrow}
        title={section.title}
        copy={section.copy}
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((promise, index) => (
          <motion.article
            key={promise}
            variants={fadeUp}
            whileHover={{ y: -6 }}
            className="rounded-[1.5rem] border border-[#f0d7e2] bg-white/88 p-5 shadow-[0_18px_58px_rgba(124,45,98,0.1)]"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fff1f7] text-[#c02672]">
                <CheckCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9d174d]">
                  Promise {index + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-[#2f1325]">
                  {promise}
                </h3>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

function ProductShowcaseSection({
  title,
  copy,
  products = [],
  viewAllLink = "/products",
}) {
  const safeProducts = Array.isArray(products)
    ? products.filter((product) => product && product.isExclusive !== true).slice(0, 8)
    : [];

  if (!safeProducts.length) return null;

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      variants={stagger}
      className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Collection" title={title} copy={copy} />
          <motion.div variants={fadeUp}>
            <Link
              href={viewAllLink}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e7bfd0] bg-white px-5 text-sm font-semibold text-[#7c2d62] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff1f7]"
            >
              Explore Collection
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>

        <motion.div
          variants={stagger}
          className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
        >
          {safeProducts.map((product) => (
            <motion.div key={product._id || product.id} variants={fadeUp}>
              <ProductItem
                id={product._id || product.id}
                name={product.name}
                brand={product.brand || "Ananya Boutique"}
                price={product.price}
                originalPrice={product.originalPrice}
                discount={product.discount}
                rating={product.rating}
                image={product.thumbnail || product.images?.[0]}
                product={product}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}

function InstagramShowcaseSection({ content, mediaSlots, contact }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.instagram,
    ...(content || {}),
  };
  const cards = Array.isArray(section.placeholders) && section.placeholders.length
    ? section.placeholders
    : instagramCards;
  const instagramUrl =
    contact?.instagramUrl || DEFAULT_STOREFRONT_CONTENT.contact.instagramUrl;

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <motion.div variants={fadeUp}>
            <BrandArtworkFrame
              artwork={getSlotArtwork(
                mediaSlots,
                section.mediaSlot,
                artworkRegistry.homepage.instagramShowcase,
                section.title,
                section.copy,
              )}
              aspect="wide"
              icon={Instagram}
              className="min-h-[340px]"
              label="Instagram"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
              {section.eyebrow}
            </p>
            <h2 className="mt-3 brand-story-heading text-4xl font-semibold leading-tight text-[#2f1325] sm:text-5xl">
              {section.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6b4b5c]">
              {section.copy}
            </p>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
            >
              {section.buttonText}
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </a>
          </motion.div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((label, index) => (
            <motion.div
              key={label}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              className="aspect-square overflow-hidden rounded-[1.5rem] border border-[#f0d7e2] bg-[linear-gradient(135deg,#fff1f7,#ffffff,#f3e8ff)] p-3 shadow-[0_16px_48px_rgba(124,45,98,0.1)]"
            >
              <div className="flex h-full flex-col justify-between rounded-[1.1rem] border border-white/80 bg-white/54 p-3">
                <Instagram className="h-5 w-5 text-[#c02672]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d174d]">
                    Moment {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#2f1325]">
                    {label}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function CustomerLoveSection({ content }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.testimonials,
    ...(content || {}),
  };
  const items = Array.isArray(section.items) && section.items.length
    ? section.items
    : demoTestimonials;

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <SectionHeading
        eyebrow={section.eyebrow}
        title={section.title}
        copy={section.copy}
      />
      <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-4">
        <div className="flex snap-x snap-mandatory gap-4">
          {items.map((testimonial) => (
            <motion.article
              key={testimonial.name}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="min-w-[280px] snap-start rounded-[1.75rem] border border-[#f0d7e2] bg-white/90 p-6 shadow-[0_18px_58px_rgba(124,45,98,0.11)] sm:min-w-[340px]"
            >
              <div className="mb-5 flex gap-1 text-[#c02672]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className="h-4 w-4 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-base leading-7 text-[#604354]">
                &quot;{testimonial.text}&quot;
              </p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f1325]">
                {testimonial.name}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function FinalCtaSection({ content, contact }) {
  const section = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.finalCta,
    ...(content || {}),
  };
  const lines = Array.isArray(section.lines) && section.lines.length
    ? section.lines
    : DEFAULT_STOREFRONT_CONTENT.homepage.finalCta.lines;
  const whatsappHref = getWhatsappHref(
    contact,
    "Hi Ananya Boutique, I would like to chat about your collection.",
  );

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16"
    >
      <div className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[2rem] border border-[#f0d7e2] bg-[linear-gradient(135deg,#fff8fb_0%,#ffffff_48%,#f7f0ff_100%)] p-6 shadow-[0_30px_100px_rgba(124,45,98,0.16)] sm:p-8 lg:grid-cols-[1fr_0.95fr] lg:p-10">
        <motion.div variants={fadeUp} className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
            {section.eyebrow}
          </p>
          <h2 className="mt-3 brand-story-heading text-4xl font-semibold leading-tight text-[#2f1325] sm:text-5xl">
            {section.title}
          </h2>
          <div className="mt-5 max-w-2xl space-y-2 text-base leading-8 text-[#604354] sm:text-lg">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={section.primaryButtonHref || "/products"}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
            >
              {section.primaryButtonText}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#f0d7e2] bg-white px-6 text-sm font-semibold text-[#7c2d62] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff1f7]"
            >
              {section.secondaryButtonText}
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </motion.div>
        <motion.div variants={fadeUp}>
          <BrandArtworkFrame
            artwork={artworkRegistry.homepage.finalCta}
            aspect="wide"
            icon={Heart}
            className="min-h-[340px]"
            label="The Family"
          />
        </motion.div>
      </div>
    </motion.section>
  );
}

export default function BoutiqueHomepage({
  featuredProducts = [],
  newArrivals = [],
  bestSellers = [],
  content,
  contact,
  mediaSlots,
}) {
  const homeContent = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage,
    ...(content || {}),
  };
  const contactContent = {
    ...DEFAULT_STOREFRONT_CONTENT.contact,
    ...(contact || {}),
  };
  const hero = {
    ...DEFAULT_STOREFRONT_CONTENT.homepage.hero,
    ...(homeContent.hero || {}),
  };
  const heroBadges = toBadges(hero.trustPills);

  return (
    <div className="overflow-hidden bg-[linear-gradient(180deg,#fff9fc_0%,#ffffff_28%,#fbf7ff_68%,#ffffff_100%)] text-slate-950">
      <section className="relative px-4 pb-10 pt-7 sm:px-6 sm:pt-12 lg:px-8 lg:pb-16">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.03fr_0.97fr]">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl"
          >
            <motion.div
              variants={fadeUp}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-800 shadow-sm"
            >
              <WandSparkles
                className="h-4 w-4 text-pink-600"
                aria-hidden="true"
              />
              {hero.eyebrow}
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="brand-story-heading text-[3.25rem] font-semibold leading-[0.94] text-slate-950 sm:text-6xl sm:leading-tight lg:text-7xl"
            >
              {hero.title}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg"
            >
              {hero.subtitle}
            </motion.p>
            <motion.div variants={stagger} className="mt-6 flex flex-wrap gap-2">
              {heroBadges.map((badge, index) => (
                <AnimatedBadge key={badge.label} badge={badge} index={index} />
              ))}
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href={hero.primaryButtonHref || "/products"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-6 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-purple-900 sm:rounded-full"
              >
                {hero.primaryButtonText}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href={hero.secondaryButtonHref || "/about-us"}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-purple-200 bg-white px-6 text-sm font-semibold text-purple-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-purple-50 sm:rounded-full"
              >
                {hero.secondaryButtonText}
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden"
          >
            <BoutiqueVisual compact content={hero} mediaSlots={mediaSlots} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <BoutiqueVisual content={hero} mediaSlots={mediaSlots} />
          </motion.div>
        </div>
      </section>

      <FounderStorySection
        content={homeContent.founder}
        mediaSlots={mediaSlots}
        contact={contactContent}
      />
      <TrustSection content={homeContent.trust} />
      <JourneyTimelineSection content={homeContent.timeline} />
      <DreamSupportSection content={homeContent.dream} />
      <PromiseSection content={homeContent.promise} />
      <ProductShowcaseSection
        title="Featured Boutique Picks"
        copy="Hand-selected products ready for the homepage collection."
        products={featuredProducts}
        viewAllLink="/products"
      />
      <ProductShowcaseSection
        title="New Arrivals"
        copy="Fresh styles recently added to the Ananya Boutique catalog."
        products={newArrivals}
        viewAllLink="/products?newArrivals=true"
      />
      <ProductShowcaseSection
        title="Best Sellers"
        copy="Customer-loved pieces curated for quick discovery."
        products={bestSellers}
        viewAllLink="/products?bestSeller=true"
      />
      <InstagramShowcaseSection
        content={homeContent.instagram}
        mediaSlots={mediaSlots}
        contact={contactContent}
      />
      <CustomerLoveSection content={homeContent.testimonials} />
      <FinalCtaSection content={homeContent.finalCta} contact={contactContent} />
    </div>
  );
}
