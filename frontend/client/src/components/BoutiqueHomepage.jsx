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
  brandIdentity,
  fashionMicrocopy,
} from "@/config/visualIdentity";
import { contactConfig, getWhatsAppHref } from "@/config/siteConfig";
import BrandArtworkFrame from "./brand/BrandArtworkFrame";

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

const whatsappHref = getWhatsAppHref(
  "Hi Ananya Boutique, I would like to chat about your collection.",
);

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

function BoutiqueVisual({ compact = false }) {
  return (
    <BrandArtworkFrame
      artwork={
        compact
          ? artworkRegistry.homepage.heroMobile
          : artworkRegistry.homepage.heroDesktop
      }
      aspect={compact ? "portrait" : "hero"}
      icon={Sparkles}
      label="Ananya Boutique"
    />
  );
}

function FounderStorySection() {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16"
    >
      <motion.div variants={fadeUp}>
        <BrandArtworkFrame
          artwork={artworkRegistry.homepage.founderPortrait}
          aspect="portrait"
          icon={Heart}
          className="min-h-[460px]"
          label="Founder Story"
        />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex flex-col justify-center rounded-[2rem] border border-[#f0d7e2] bg-white/86 p-6 shadow-[0_24px_80px_rgba(124,45,98,0.12)] sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
          Real founder. Real family. Real story.
        </p>
        <h2 className="mt-3 brand-story-heading text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl lg:text-5xl">
          Meet The Woman Behind Ananya Boutique
        </h2>
        <div className="mt-5 space-y-4 text-base leading-8 text-[#604354]">
          <p>
            In 2012, a homemaker with a passion for fashion decided to take a
            chance on a dream.
          </p>
          <p>
            While raising three children and managing her family, she began
            building a boutique one customer at a time.
          </p>
          <p>
            Today that dream continues through every saree, every order, and
            every smile from our customers.
          </p>
        </div>

        <motion.div
          variants={stagger}
          className="mt-6 flex flex-wrap gap-2"
          aria-label="Founder story badges"
        >
          {founderBadges.map((badge, index) => (
            <AnimatedBadge key={badge.label} badge={badge} index={index} />
          ))}
        </motion.div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/about-us"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
          >
            Read Our Story
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#f0d7e2] bg-white px-6 text-sm font-semibold text-[#7c2d62] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff1f7]"
          >
            Chat On WhatsApp
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </motion.div>
    </motion.section>
  );
}

function TrustSection() {
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
        eyebrow="Trusted since 2012"
        title="Why Women Trust Ananya Boutique"
        copy="The boutique grew because women returned, recommended, and trusted the care behind every order."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trustCards.map((card) => {
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

function JourneyTimelineSection() {
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
          eyebrow="Our journey"
          title="A Journey Built With Love"
          copy="A simple timeline of a dream that kept growing through care and customer trust."
        />
        <div className="relative mt-10 grid gap-5 lg:grid-cols-3">
          <div className="pointer-events-none absolute left-6 top-8 hidden h-px w-[calc(100%-3rem)] bg-[linear-gradient(90deg,#c02672,#e8c67a,#7c3aed)] lg:block" />
          {timelineItems.map((item, index) => (
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

function DreamSupportSection() {
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
            Every Order Supports A Dream
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
            When you shop at Ananya Boutique, you&apos;re not buying from a
            large corporation.
          </p>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#f8d88a]">
            You&apos;re supporting:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {dreamSupports.map((item) => (
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
            &quot;Every saree, every order, and every message from a customer
            keeps this dream alive.&quot;
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

function PromiseSection() {
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
        eyebrow="Our promise"
        title="The Boutique Promise"
        copy="A clear promise for every customer who chooses Ananya Boutique."
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promiseCards.map((promise, index) => (
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

function InstagramShowcaseSection() {
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
              artwork={artworkRegistry.homepage.instagramShowcase}
              aspect="wide"
              icon={Instagram}
              className="min-h-[340px]"
              label="Instagram"
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
              Instagram showcase
            </p>
            <h2 className="mt-3 brand-story-heading text-4xl font-semibold leading-tight text-[#2f1325] sm:text-5xl">
              Follow Our Journey
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#6b4b5c]">
              Follow new arrivals, styling moments, customer stories, and the
              everyday work behind Ananya Boutique.
            </p>
            <a
              href={contactConfig.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
            >
              Follow @ananya___boutique
              <Instagram className="h-4 w-4" aria-hidden="true" />
            </a>
          </motion.div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {instagramCards.map((label, index) => (
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

function CustomerLoveSection() {
  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      <SectionHeading
        eyebrow="Customer love"
        title="Customer Love"
        copy="Kind words from our boutique family, written to match the warm, fashion-focused voice of Ananya Boutique."
      />
      <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-4">
        <div className="flex snap-x snap-mandatory gap-4">
          {demoTestimonials.map((testimonial) => (
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

function FinalCtaSection() {
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
            Ananya Boutique family
          </p>
          <h2 className="mt-3 brand-story-heading text-4xl font-semibold leading-tight text-[#2f1325] sm:text-5xl">
            Join The Ananya Boutique Family
          </h2>
          <div className="mt-5 max-w-2xl space-y-2 text-base leading-8 text-[#604354] sm:text-lg">
            <p>Fashion chosen with love.</p>
            <p>A boutique built with trust.</p>
            <p>
              A dream that continues because of customers like you.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
            >
              Shop Collection
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#f0d7e2] bg-white px-6 text-sm font-semibold text-[#7c2d62] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff1f7]"
            >
              WhatsApp Us
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

export default function BoutiqueHomepage() {
  return (
    <div className="overflow-hidden bg-[linear-gradient(180deg,#fff9fc_0%,#ffffff_28%,#fbf7ff_68%,#ffffff_100%)] text-slate-950">
      <section className="relative px-4 pb-10 pt-8 sm:px-6 sm:pt-12 lg:px-8 lg:pb-16">
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
              Founder-Led Fashion Boutique
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="brand-story-heading text-5xl font-semibold leading-tight text-slate-950 sm:text-6xl lg:text-7xl"
            >
              {brandIdentity.coreMessage}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg"
            >
              {brandIdentity.supportingMessage} Discover sarees, suits,
              kurtis, cosmetics, jewellery and fashion essentials curated with
              elegance and affordability.
            </motion.p>
            <motion.div variants={stagger} className="mt-6 flex flex-wrap gap-2">
              {founderBadges.map((badge, index) => (
                <AnimatedBadge key={badge.label} badge={badge} index={index} />
              ))}
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-purple-900"
              >
                {fashionMicrocopy.shopCollection}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/about-us"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-purple-200 bg-white px-6 text-sm font-semibold text-purple-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-purple-50"
              >
                Meet Our Story
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
            <BoutiqueVisual compact />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block"
          >
            <BoutiqueVisual />
          </motion.div>
        </div>
      </section>

      <FounderStorySection />
      <TrustSection />
      <JourneyTimelineSection />
      <DreamSupportSection />
      <PromiseSection />
      <InstagramShowcaseSection />
      <CustomerLoveSection />
      <FinalCtaSection />
    </div>
  );
}
