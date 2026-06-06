"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Gem,
  Heart,
  Home,
  Sparkles,
  Star,
  Store,
  Users,
} from "lucide-react";
import BrandArtworkFrame from "@/components/brand/BrandArtworkFrame";
import {
  BrandPillarGrid,
  FounderSignatureSection,
} from "@/components/brand/BrandTrust";
import { fashionMicrocopy } from "@/config/visualIdentity";

const fadeUp = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const storySections = [
  {
    title: "Every Dream Begins With Courage",
    visualTitle: "The First Dream",
    visualSubtext: "A quiet beginning, a brave heart, and a home full of hope.",
    artworkKey: "story.founder",
    orientation: "portrait",
    icon: Heart,
    paragraphs: [
      "Some businesses begin with investors.",
      "Some begin with funding.",
      "Ours began with a mother, a dream, and the determination to create something meaningful for her family.",
      "Ananya Boutique is not just a store.",
      "It is the result of years of dedication, sacrifice, patience, and belief.",
      "What you see today started as a small dream inside a home and grew one customer, one order, and one smile at a time.",
    ],
  },
  {
    title: "A Dream Born Inside A Home",
    visualTitle: "16 August 2012",
    visualSubtext: "Fashion selected by hand, trust built one customer at a time.",
    artworkKey: "story.homemaker",
    orientation: "wide",
    icon: Home,
    reverse: true,
    paragraphs: [
      "On 16 August 2012, a homemaker with a passion for fashion decided to take a chance on her dream.",
      "Without a large investment, without a team, and while managing her household responsibilities, she began selling sarees, suits, leggings, and ladies' wear.",
      "Every product was selected carefully.",
      "Every customer interaction mattered.",
      "Every sale became motivation to continue.",
      "What started as a small effort slowly became something much larger.",
      "There were challenges.",
      "There were moments of uncertainty.",
      "But there was never a moment when the dream was abandoned.",
    ],
  },
  {
    title: "A Mother Before Everything Else",
    visualTitle: "Built Between Responsibilities",
    visualSubtext: "The work continued before sunrise, after bedtime, and between every duty.",
    artworkKey: "story.homemaker",
    orientation: "portrait",
    icon: Users,
    paragraphs: [
      "Behind Ananya Boutique is a mother raising three children.",
      "Two sons.",
      "One daughter.",
      "While taking care of her family, managing household responsibilities, and fulfilling the role of a homemaker, she continued building her business day after day.",
      "There were no fixed working hours.",
      "No weekends.",
      "No holidays.",
      "Many nights ended after everyone else had gone to sleep.",
      "Many mornings started before sunrise.",
      "The business was built between household chores, family responsibilities, and countless sacrifices.",
      "Yet she continued because she believed that hard work and consistency would eventually create opportunities.",
    ],
  },
  {
    title: "Powered By Family",
    visualTitle: "Strength At Home",
    visualSubtext: "Every small win became a family celebration.",
    artworkKey: "story.family",
    orientation: "wide",
    icon: Sparkles,
    reverse: true,
    paragraphs: [
      "No journey is successful alone.",
      "The encouragement of her husband.",
      "The smiles of her children.",
      "The support of family.",
      "These became the strength behind every difficult day and every small victory.",
      "Every milestone was celebrated together.",
      "Every challenge was faced together.",
      "Family remains the foundation of Ananya Boutique.",
    ],
  },
  {
    title: "Growing Beyond Fashion",
    visualTitle: "25 January 2024",
    visualSubtext: "A new chapter of beauty, accessories, and finishing details.",
    artworkKey: "story.growth",
    orientation: "portrait",
    icon: Gem,
    paragraphs: [
      "For years, customers trusted Ananya Boutique for fashionable and affordable clothing.",
      "That trust inspired growth.",
      "On 25 January 2024, a new chapter began.",
      "Cosmetics and artificial jewellery were added to the business.",
      "This expansion allowed customers to discover fashion, beauty, and accessories in one place.",
      "Yet despite the growth, one thing never changed.",
      "The commitment to quality, affordability, and customer satisfaction.",
    ],
  },
  {
    title: "More Than A Business",
    visualTitle: "A Shared Journey",
    visualSubtext: "Every order supports determination, confidence, and possibility.",
    artworkKey: "story.community",
    orientation: "wide",
    icon: Store,
    reverse: true,
    paragraphs: [
      "Ananya Boutique was never built only for profit.",
      "It was built to create value.",
      "It was built to give women access to affordable fashion.",
      "It was built to prove that dreams can grow even when circumstances are difficult.",
      "Every order supports a story of determination.",
      "Every customer becomes part of the journey.",
      "Every purchase helps a dream continue.",
    ],
  },
  {
    title: "The Journey Continues",
    visualTitle: "Still Being Written",
    visualSubtext: "A growing fashion and beauty destination shaped by every customer.",
    artworkKey: "story.community",
    orientation: "portrait",
    icon: Star,
    paragraphs: [
      "From a small beginning in 2012 to a growing fashion and beauty destination today, the story of Ananya Boutique is still being written.",
      "Every customer who visits.",
      "Every woman who finds confidence through our products.",
      "Every family that supports our journey.",
      "Becomes a part of our story.",
      "Thank you for believing in us.",
      "Thank you for supporting a dream.",
      "Welcome to the Ananya Boutique family.",
    ],
  },
];

const timelineItems = [
  {
    year: "2012",
    title: "Ananya Boutique Founded",
    text: "A homemaker's dream began inside a home on 16 August 2012.",
  },
  {
    year: "2024",
    title: "Cosmetics & Artificial Jewellery Added",
    text: "The boutique expanded into beauty, accessories, and jewellery.",
  },
  {
    year: "Present",
    title: "Growing Online & Offline",
    text: "A family-built brand continues to grow with every customer.",
  },
];

const stats = [
  { value: "13+", label: "Years of Trust" },
  { value: "Growing", label: "Happy Customers" },
  { value: "Fashion + Beauty", label: "Products Available" },
  { value: "Every Day", label: "Orders Delivered" },
];

const quotes = [
  "A dream built inside a home can still become a story that inspires many women.",
  "Every order carries more than a product. It carries belief, effort, and a family's journey.",
];

function StoryArtwork({
  title,
  subtext,
  orientation = "wide",
  Icon = Sparkles,
  artworkKey,
}) {
  const isPortrait = orientation === "portrait";

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={isPortrait ? "mx-auto w-full max-w-[520px]" : "w-full"}
    >
      <BrandArtworkFrame
        artworkKey={artworkKey}
        title={title}
        copy={subtext}
        aspect={isPortrait ? "portrait" : "wide"}
        icon={Icon}
        motionEnabled={false}
      />
    </motion.div>
  );
}

function StorySection({ section, index }) {
  const Icon = section.icon;
  const content = (
    <motion.div
      variants={fadeUp}
      className="flex flex-col justify-center"
    >
      <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#e8c67a]/45 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a5a12] shadow-sm">
        <Icon className="h-4 w-4" aria-hidden="true" />
        Chapter {index + 1}
      </div>
      <h2 className="font-serif text-4xl font-semibold leading-tight text-[#2f1325] sm:text-5xl">
        {section.title}
      </h2>
      <div className="mt-6 space-y-4 text-base leading-8 text-[#604354] sm:text-lg">
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </motion.div>
  );

  const artwork = (
    <StoryArtwork
      title={section.visualTitle}
      subtext={section.visualSubtext}
      orientation={section.orientation}
      Icon={Icon}
      artworkKey={section.artworkKey}
    />
  );

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.22 }}
      className="mx-auto grid max-w-7xl gap-9 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20"
    >
      {section.reverse ? (
        <>
          <div className="lg:order-2">{content}</div>
          <div className="lg:order-1">{artwork}</div>
        </>
      ) : (
        <>
          {content}
          {artwork}
        </>
      )}
    </motion.section>
  );
}

function TimelineSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="rounded-[2rem] border border-[#efd8b0]/75 bg-white/75 p-6 shadow-[0_22px_80px_rgba(93,45,74,0.12)] backdrop-blur sm:p-8 lg:p-10"
      >
        <motion.div variants={fadeUp} className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6b19]">
            Milestones
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold text-[#2f1325] sm:text-4xl">
            A timeline of courage, trust, and growth
          </h2>
        </motion.div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {timelineItems.map((item) => (
            <motion.article
              key={item.year}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-3xl border border-[#f1d7df] bg-gradient-to-br from-white via-[#fff8f4] to-[#fae8ff] p-6 shadow-lg shadow-[#7a335e]/10"
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-full bg-[#2f1325] text-white">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="font-serif text-4xl font-semibold text-[#9d6b19]">
                {item.year}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-[#2f1325]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#6c4b5d]">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            whileHover={{ y: -5 }}
            className="rounded-3xl border border-[#efd8b0]/75 bg-white/85 p-6 text-center shadow-[0_18px_60px_rgba(93,45,74,0.12)]"
          >
            <p className="font-serif text-3xl font-semibold text-[#2f1325] sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9d6b19]">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function QuoteSection({ quote, index }) {
  return (
    <motion.section
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      className="px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-[#efd8b0]/80 bg-[#2f1325] px-6 py-12 text-center shadow-[0_28px_90px_rgba(47,19,37,0.26)] sm:px-10 lg:px-16">
        <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f8d88a]">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Ananya Note {index + 1}
        </div>
        <blockquote className="font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
          "{quote}"
        </blockquote>
      </div>
    </motion.section>
  );
}

export default function AboutUsPage() {
  return (
    <main className="overflow-hidden bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_34%,#fff3f8_70%,#ffffff_100%)] text-[#2f1325]">
      <section className="relative px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8c67a] to-transparent" />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14"
        >
          <motion.div variants={fadeUp}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#efd8b0] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6b19] shadow-sm">
              <Sparkles className="h-4 w-4 text-[#cc7a9b]" aria-hidden="true" />
              Ananya Boutique
            </div>
            <h1 className="font-serif text-6xl font-semibold leading-none text-[#2f1325] sm:text-7xl lg:text-8xl">
              OUR STORY
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-[#604354] sm:text-2xl">
              Behind every product is a dream, a family, and years of determination.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#765d6c]">
              This is a story for every woman who has carried a dream quietly,
              worked for it patiently, and kept going even when the world did not
              see the effort.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
              >
                {fashionMicrocopy.shopCollection}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#efd8b0] bg-white px-6 text-sm font-semibold text-[#8a5a12] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff8f0]"
              >
                Connect With Us
                <Heart className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>

          <StoryArtwork
            title="A Dream That Grew With Love"
            subtext="A founder's journey held in soft colour, quiet strength, and family belief."
            orientation="portrait"
            Icon={Heart}
            artworkKey="story.founder"
          />
        </motion.div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FounderSignatureSection />
          <BrandPillarGrid className="mt-5" />
        </div>
      </section>

      <TimelineSection />
      <StatsSection />
      <QuoteSection quote={quotes[0]} index={0} />

      {storySections.map((section, index) => (
        <StorySection key={section.title} section={section} index={index} />
      ))}

      <QuoteSection quote={quotes[1]} index={1} />

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="mx-auto grid max-w-7xl gap-9 overflow-hidden rounded-[2rem] border border-[#efd8b0]/85 bg-gradient-to-br from-white via-[#fff8f3] to-[#fae8ff] p-6 shadow-[0_28px_100px_rgba(93,45,74,0.16)] sm:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10"
        >
          <StoryArtwork
            title="Welcome To The Family"
            subtext="A warm community frame for women, families, and shared support."
            orientation="wide"
            Icon={Users}
            artworkKey="story.community"
          />
          <motion.div variants={fadeUp} className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6b19]">
              The story continues with you
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#2f1325] sm:text-5xl">
              Every purchase becomes part of this journey.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#604354] sm:text-lg">
              Ananya Boutique is built on family, trust, courage, and the belief
              that women deserve beauty, confidence, and opportunity at every
              stage of life.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a]"
              >
                {fashionMicrocopy.shopProducts}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/membership"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#efd8b0] bg-white px-6 text-sm font-semibold text-[#8a5a12] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff8f0]"
              >
                Join The Family
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
