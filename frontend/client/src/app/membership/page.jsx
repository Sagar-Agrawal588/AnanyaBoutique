"use client";

import { API_BASE_URL } from "@/utils/api";
import { parseJsonSafely } from "@/utils/safeJsonFetch";
import cookies from "js-cookie";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BadgePercent,
  Cake,
  Crown,
  Gem,
  Gift,
  Headphones,
  Heart,
  LockKeyhole,
  ShoppingBag,
  Sparkles,
  Star,
  TicketPercent,
  Trophy,
  WandSparkles,
} from "lucide-react";
import BrandArtworkFrame from "@/components/brand/BrandArtworkFrame";
import useStorefrontContent from "@/hooks/useStorefrontContent";

const API_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL;

const getStoredAuthToken = () => {
  const cookieToken = cookies.get("accessToken");
  if (cookieToken) return cookieToken;
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("accessToken") || localStorage.getItem("token") || ""
  );
};

const ensureAccessTokenCookie = (token) => {
  if (!token) return;
  if (!cookies.get("accessToken")) {
    cookies.set("accessToken", token, { expires: 365 });
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const clubBenefits = [
  {
    icon: WandSparkles,
    title: "Early Access",
    description: "Get first access to new collections before public launch.",
  },
  {
    icon: BadgePercent,
    title: "Exclusive Discounts",
    description: "Members receive special pricing and private promotions.",
  },
  {
    icon: Cake,
    title: "Birthday Rewards",
    description: "Celebrate your special day with exclusive gifts and offers.",
  },
  {
    icon: Trophy,
    title: "Fashion Points",
    description: "Earn points on every purchase and redeem them later.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Faster customer support and assistance.",
  },
  {
    icon: LockKeyhole,
    title: "Members-Only Collections",
    description: "Access limited-edition products and exclusive launches.",
  },
];

const howItWorks = [
  {
    step: "Step 1",
    title: "Join Fashion Insider Club",
    text: "Activate your membership through the existing secure checkout.",
  },
  {
    step: "Step 2",
    title: "Shop Your Favorites",
    text: "Browse sarees, suits, kurtis, cosmetics, jewellery, and accessories.",
  },
  {
    step: "Step 3",
    title: "Earn Rewards",
    text: "Collect fashion points and member benefits as you shop.",
  },
  {
    step: "Step 4",
    title: "Unlock Exclusive Perks",
    text: "Enjoy early drops, private offers, priority care, and special gifts.",
  },
];

const membershipTiers = [
  {
    name: "STYLE STARTER",
    label: "Welcome Edit",
    description: "A beautiful first step into the club.",
    benefits: ["Welcome rewards", "Birthday benefits", "Early access"],
  },
  {
    name: "FASHION ICON",
    label: "Most Loved",
    description: "For shoppers who want the full insider feeling.",
    featured: true,
    benefits: ["Increased rewards", "Exclusive discounts", "Priority support"],
  },
  {
    name: "BOUTIQUE ELITE",
    label: "VIP Circle",
    description: "A premium tier for the most devoted boutique customer.",
    benefits: [
      "Highest rewards",
      "VIP experiences",
      "Premium launches",
      "Concierge assistance",
    ],
  },
];

const successStories = [
  {
    name: "Priya S.",
    title: "Early access shopper",
    text: "The club makes every new launch feel personal. I love discovering fresh styles before everyone else.",
  },
  {
    name: "Nisha R.",
    title: "Rewards collector",
    text: "Fashion points and birthday perks make shopping feel thoughtful, not ordinary.",
  },
  {
    name: "Aditi M.",
    title: "Boutique loyalist",
    text: "Priority help and member offers make Ananya Boutique feel like my own style circle.",
  },
];

const dashboardPreview = [
  { label: "Points earned", value: 2450, suffix: "" },
  { label: "Rewards available", value: 6, suffix: "" },
  { label: "Benefits unlocked", value: 12, suffix: "" },
];

const benefitIconMap = {
  sparkles: WandSparkles,
  percent: BadgePercent,
  gift: Gift,
  cake: Cake,
  trophy: Trophy,
  support: Headphones,
  lock: LockKeyhole,
  gem: Gem,
};

const withBenefitIcons = (items = []) =>
  (Array.isArray(items) ? items : []).map((item, index) => ({
    ...item,
    icon:
      item.icon && typeof item.icon !== "string"
        ? item.icon
        : benefitIconMap[item.icon] ||
          [WandSparkles, BadgePercent, Cake, Trophy, Headphones, LockKeyhole][
            index % 6
          ],
  }));

const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

function AnimatedCounter({ value, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    let frameId = 0;
    let started = false;
    const duration = 900;

    const runCounter = () => {
      if (started) return;
      started = true;
      const start = performance.now();

      const tick = (time) => {
        const progress = Math.min((time - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));
        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
        }
      };

      frameId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) runCounter();
      },
      { threshold: 0.35 },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [value]);

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

function SectionHeading({ eyebrow, title, copy, align = "left" }) {
  return (
    <motion.div
      variants={fadeUp}
      className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6b19]">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {copy ? (
        <p className="mt-4 text-base leading-7 text-[#6c4b5d] sm:text-lg">
          {copy}
        </p>
      ) : null}
    </motion.div>
  );
}

function LuxuryArtwork({
  title,
  copy,
  ratio = "wide",
  icon: Icon = Sparkles,
  artworkKey,
  imageUrl = "",
}) {
  const isPortrait = ratio === "portrait";
  const customArtwork = imageUrl
    ? {
        source: imageUrl,
        title,
        copy,
        aspect: isPortrait ? "portrait" : "wide",
      }
    : null;

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="w-full"
    >
      <BrandArtworkFrame
        artwork={customArtwork}
        artworkKey={artworkKey}
        title={title}
        copy={copy}
        aspect={isPortrait ? "portrait" : "wide"}
        icon={Icon}
        label="Fashion Insider Club"
        motionEnabled={false}
      />
    </motion.div>
  );
}

function BenefitCard({ benefit, index }) {
  const Icon = benefit.icon;

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-3xl border border-[#f0d8df] bg-white/85 p-6 shadow-[0_18px_60px_rgba(93,45,74,0.12)] backdrop-blur"
      style={{ transitionDelay: `${index * 20}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-[#ec4899] via-[#a855f7] to-[#d6a84f] transition-transform duration-500 group-hover:scale-x-100" />
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ffe4ef] to-[#eee3ff] text-[#7c2d62] shadow-lg shadow-[#7a335e]/10 transition duration-300 group-hover:-rotate-3 group-hover:scale-105">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[#2f1325]">{benefit.title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#6c4b5d]">
        {benefit.description}
      </p>
    </motion.article>
  );
}

function TierCard({ tier, onJoin }) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_22px_70px_rgba(93,45,74,0.14)] ${
        tier.featured
          ? "border-[#d6a84f]/75 bg-[#2f1325] text-white"
          : "border-[#f0d8df] bg-white/90 text-[#2f1325]"
      }`}
    >
      {tier.featured ? (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f9d77e] via-[#f472b6] to-[#c4b5fd]" />
      ) : null}
      <div
        className={`mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
          tier.featured
            ? "bg-white/10 text-[#f8d88a]"
            : "bg-[#fff4ef] text-[#9d6b19]"
        }`}
      >
        <Crown className="h-4 w-4" aria-hidden="true" />
        {tier.label}
      </div>
      <h3 className="font-serif text-3xl font-semibold">{tier.name}</h3>
      <p
        className={`mt-3 text-sm leading-6 ${
          tier.featured ? "text-white/75" : "text-[#6c4b5d]"
        }`}
      >
        {tier.description}
      </p>
      <ul className="mt-6 space-y-3">
        {tier.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                tier.featured ? "bg-white/12 text-[#f8d88a]" : "bg-[#fff0f7] text-[#a21caf]"
              }`}
            >
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            </span>
            <span className={tier.featured ? "text-white/85" : "text-[#604354]"}>
              {benefit}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onJoin}
        className={`mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition hover:-translate-y-0.5 ${
          tier.featured
            ? "bg-white text-[#2f1325] shadow-xl shadow-black/20 hover:bg-[#fff8ef]"
            : "bg-[#2f1325] text-white shadow-xl shadow-[#2f1325]/15 hover:bg-[#4b1f3a]"
        }`}
      >
        Join The Club
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.article>
  );
}

function RewardsDashboardPreview({
  isMemberActive,
  activePlan,
  items = dashboardPreview,
}) {
  const level = isMemberActive ? "Boutique Elite" : "Fashion Icon";
  const safeItems = Array.isArray(items) && items.length ? items : dashboardPreview;

  return (
    <motion.section
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      id="rewards-preview"
      className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16"
    >
      <LuxuryArtwork
        title="Rewards In Motion"
        copy="Track the little wins that make every boutique order feel rewarding."
        ratio="wide"
        icon={TicketPercent}
        artworkKey="membership.rewards"
      />
      <motion.div
        variants={fadeUp}
        className="rounded-[2rem] border border-[#f0d8df] bg-white/90 p-6 shadow-[0_24px_80px_rgba(93,45,74,0.14)] backdrop-blur sm:p-8"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6b19]">
          Rewards Dashboard Preview
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-[#2f1325] sm:text-4xl">
          Your club benefits, styled like a private wardrobe.
        </h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {safeItems.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-[#f4dce5] bg-gradient-to-br from-white to-[#fff4fa] p-5"
            >
              <p className="font-serif text-3xl font-semibold text-[#2f1325]">
                <AnimatedCounter value={item.value} suffix={item.suffix} />
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9d6b19]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#f4dce5] bg-[#2f1325] p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f8d88a]">
              Membership level
            </p>
            <p className="mt-3 text-2xl font-semibold">{level}</p>
          </div>
          <div className="rounded-3xl border border-[#f4dce5] bg-[#fff8ef] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9d6b19]">
              Active plan
            </p>
            <p className="mt-3 text-2xl font-semibold text-[#2f1325]">
              {activePlan?.name || "Fashion Insider Club"}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.section>
  );
}

export default function MembershipPage() {
  const { content: storefrontContent } = useStorefrontContent();
  const membershipContent = storefrontContent.membership;
  const mediaSlots = storefrontContent.mediaSlots || {};
  const hero = membershipContent.hero || {};
  const benefitsSection = membershipContent.benefits || {};
  const benefitItems = withBenefitIcons(benefitsSection.items || clubBenefits);
  const howItWorksItems =
    Array.isArray(membershipContent.howItWorks) &&
    membershipContent.howItWorks.length
      ? membershipContent.howItWorks
      : howItWorks;
  const tierItems =
    Array.isArray(membershipContent.tiers) && membershipContent.tiers.length
      ? membershipContent.tiers
      : membershipTiers;
  const dashboardItems =
    Array.isArray(membershipContent.dashboard) &&
    membershipContent.dashboard.length
      ? membershipContent.dashboard
      : dashboardPreview;
  const storyItems =
    Array.isArray(membershipContent.testimonials) &&
    membershipContent.testimonials.length
      ? membershipContent.testimonials
      : successStories;
  const vip = membershipContent.vip || {};
  const finalCta = membershipContent.finalCta || {};
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const router = useRouter();

  const fetchMembershipStatus = async (token) => {
    if (!token) {
      setMembershipStatus(null);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/membership/status`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.status === 401) {
        setMembershipStatus(null);
        setIsLoggedIn(false);
        return;
      }
      const data = await parseJsonSafely(res);
      if (data?.success) {
        setMembershipStatus(data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch membership status:", err);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = getStoredAuthToken();
      if (token) {
        ensureAccessTokenCookie(token);
        setIsLoggedIn(true);
        await fetchMembershipStatus(token);
      } else {
        setIsLoggedIn(false);
        setMembershipStatus(null);
      }

      try {
        const res = await fetch(`${API_URL}/api/membership/active`);
        const data = await parseJsonSafely(res);
        if (data?.success) {
          setActivePlan(data.data);
        }
      } catch (err) {
        console.warn("Failed to fetch active plan:", err);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    const handleAuthChanged = async () => {
      const token = getStoredAuthToken();
      const loggedIn = Boolean(token);
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        ensureAccessTokenCookie(token);
        await fetchMembershipStatus(token);
      } else {
        setMembershipStatus(null);
      }
    };

    window.addEventListener("loginSuccess", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);
    window.addEventListener("focus", handleAuthChanged);

    return () => {
      window.removeEventListener("loginSuccess", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
      window.removeEventListener("focus", handleAuthChanged);
    };
  }, []);

  const isMemberActive = useMemo(
    () =>
      Boolean(membershipStatus?.isMember ?? membershipStatus?.membershipActive) &&
      !Boolean(membershipStatus?.isExpired),
    [membershipStatus],
  );

  const membershipExpiryLabel = membershipStatus?.membershipExpiry
    ? new Date(membershipStatus.membershipExpiry).toLocaleDateString()
    : "";

  const handleSubscribe = () => {
    if (!isLoggedIn) {
      router.push("/login?redirect=/membership/checkout");
      return;
    }
    if (isMemberActive) return;
    router.push("/membership/checkout");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fff8f2] via-white to-[#f3e8ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#f4c7d7] border-t-[#7c2d62]" />
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7c2d62]">
            Loading Fashion Insider Club
          </p>
        </div>
      </div>
    );
  }

  const planPrice = formatPrice(activePlan?.price);
  const originalPrice = formatPrice(activePlan?.originalPrice);
  const showOriginalPrice =
    Number(activePlan?.originalPrice) > Number(activePlan?.price);

  return (
    <main className="overflow-hidden bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_32%,#fff3f8_68%,#ffffff_100%)] text-[#2f1325]">
      <section className="relative px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#e8c67a] to-transparent" />
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14"
        >
          <motion.div variants={fadeUp}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#efd8b0] bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#9d6b19] shadow-sm">
              <Crown className="h-4 w-4 text-[#cc7a9b]" aria-hidden="true" />
              {hero.eyebrow || "Luxury Loyalty Program"}
            </div>
            <h1 className="font-serif text-5xl font-semibold leading-tight text-[#2f1325] sm:text-6xl lg:text-7xl">
              {hero.title || "Fashion Insider Club"}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#604354] sm:text-xl">
              {hero.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isMemberActive}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-6 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a] disabled:cursor-default disabled:opacity-80"
              >
                {isMemberActive ? "Club Active" : hero.primaryButtonText || "Join The Club"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#club-benefits"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#efd8b0] bg-white px-6 text-sm font-semibold text-[#8a5a12] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff8f0]"
              >
                {hero.secondaryButtonText || "Explore Benefits"}
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            {isMemberActive ? (
              <div className="mt-7 rounded-3xl border border-[#efd8b0] bg-white/85 p-5 shadow-[0_18px_60px_rgba(93,45,74,0.12)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2f1325]">
                      Your Fashion Insider Club membership is active.
                    </p>
                    {membershipExpiryLabel ? (
                      <p className="mt-1 text-sm text-[#6c4b5d]">
                        Valid until {membershipExpiryLabel}.
                      </p>
                    ) : null}
                  </div>
                  <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#2f1325] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    <Heart className="h-4 w-4 text-[#f8d88a]" aria-hidden="true" />
                    Active Member
                  </span>
                </div>
              </div>
            ) : null}
          </motion.div>

          <LuxuryArtwork
            title={hero.visualTitle || "The Insider Wardrobe"}
            copy={
              hero.visualCopy ||
              "A private style world with early access, rewards, and boutique care."
            }
            ratio="portrait"
            icon={Gem}
            artworkKey="membership.hero"
            imageUrl={mediaSlots?.[hero.mediaSlot]}
          />
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {(membershipContent.stats || []).map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-[#efd8b0]/75 bg-white/85 p-6 text-center shadow-[0_18px_60px_rgba(93,45,74,0.12)]"
            >
              <p className="font-serif text-4xl font-semibold text-[#2f1325]">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9d6b19]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        id="club-benefits"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      >
        <SectionHeading
          eyebrow={benefitsSection.eyebrow || "Membership Benefits"}
          title={
            benefitsSection.title ||
            "A private circle of fashion, rewards, and care"
          }
          copy={
            benefitsSection.copy ||
            "Every benefit is designed to make shopping feel more personal, more rewarding, and more beautifully yours."
          }
          align="center"
        />
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {benefitItems.map((benefit, index) => (
            <BenefitCard
              key={benefit.title}
              benefit={benefit}
              index={index}
            />
          ))}
        </div>
        <div className="mt-8">
          <LuxuryArtwork
            title="Member Benefits Edit"
            copy="Every benefit is curated to make fashion feel more personal."
            ratio="wide"
            icon={Gift}
            artworkKey="membership.tierCards"
          />
        </div>
      </motion.section>

      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      >
        <SectionHeading
          eyebrow="How It Works"
          title="Join once, then let every purchase unlock more"
          copy="The existing membership checkout activates the club. The experience around it now feels like a modern fashion loyalty program."
        />
        <div className="mt-9 grid gap-5 lg:grid-cols-4">
          {howItWorksItems.map((item, index) => (
            <motion.article
              key={item.step}
              variants={fadeUp}
              whileHover={{ y: -5 }}
              className="relative overflow-hidden rounded-3xl border border-[#f0d8df] bg-white/90 p-6 shadow-[0_18px_60px_rgba(93,45,74,0.12)]"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="rounded-full bg-[#fff4ef] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#9d6b19]">
                  {item.step}
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#2f1325] text-white">
                  {index + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#2f1325]">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#6c4b5d]">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        id="membership-pricing"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      >
        <SectionHeading
          eyebrow="Membership Tiers"
          title="Three luxury levels, one elegant club experience"
          copy="The tier presentation is visual and aspirational. Activation still uses the current membership infrastructure."
          align="center"
        />

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {tierItems.map((tier) => (
            <TierCard key={tier.name} tier={tier} onJoin={handleSubscribe} />
          ))}
        </div>

        <motion.div
          variants={fadeUp}
          className="mt-8 rounded-[2rem] border border-[#efd8b0]/85 bg-gradient-to-br from-white via-[#fff8f3] to-[#fae8ff] p-6 text-center shadow-[0_24px_80px_rgba(93,45,74,0.14)] sm:p-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d6b19]">
            Current Active Plan
          </p>
          <h3 className="mt-3 font-serif text-3xl font-semibold text-[#2f1325]">
            {activePlan?.name || "Fashion Insider Club"}
          </h3>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {planPrice ? (
              <span className="font-serif text-5xl font-semibold text-[#2f1325]">
                {planPrice}
              </span>
            ) : (
              <span className="text-base font-semibold text-[#604354]">
                Plan details load from the existing membership API.
              </span>
            )}
            {showOriginalPrice ? (
              <span className="text-lg text-[#9f8795] line-through">
                {originalPrice}
              </span>
            ) : null}
          </div>
          {activePlan?.duration ? (
            <p className="mt-3 text-sm text-[#6c4b5d]">
              Valid for {activePlan.duration} {activePlan.durationUnit}.
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={isMemberActive}
            className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2f1325] px-7 text-sm font-semibold text-white shadow-xl shadow-[#2f1325]/20 transition hover:-translate-y-0.5 hover:bg-[#4b1f3a] disabled:cursor-default disabled:opacity-80"
          >
            {isMemberActive ? "Membership Active" : "Join The Club"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          {!isLoggedIn && !isMemberActive ? (
            <p className="mt-3 text-sm text-[#6c4b5d]">
              Login is required before checkout.
            </p>
          ) : null}
        </motion.div>
      </motion.section>

      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16"
      >
        <motion.div variants={fadeUp} className="flex flex-col justify-center">
          <SectionHeading
            eyebrow={vip.eyebrow || "VIP Experience"}
            title={vip.title || "A member world made for women who love style"}
            copy={
              vip.copy ||
              "Private launches, thoughtful rewards, and boutique attention come together in a softer, more personal loyalty experience."
            }
          />
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {(vip.items || []).map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-[#f0d8df] bg-white/90 p-5 shadow-[0_14px_46px_rgba(93,45,74,0.1)]"
              >
                <p className="flex items-center gap-3 text-sm font-semibold text-[#2f1325]">
                  <Gem className="h-4 w-4 text-[#9d6b19]" aria-hidden="true" />
                  {item}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
        <LuxuryArtwork
          title="VIP Boutique Experience"
          copy="An elevated member world for private launches and thoughtful care."
          ratio="portrait"
          icon={Crown}
          artworkKey="membership.vip"
        />
      </motion.section>

      <RewardsDashboardPreview
        isMemberActive={isMemberActive}
        activePlan={activePlan}
        items={dashboardItems}
      />

      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
      >
        <SectionHeading
          eyebrow="Success Stories"
          title="Member stories, ready for the Ananya community"
          copy="Elegant story cards for real testimonials from Fashion Insider Club members."
          align="center"
        />
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {storyItems.map((story) => (
            <motion.article
              key={story.name}
              variants={fadeUp}
              whileHover={{ y: -5 }}
              className="rounded-3xl border border-[#f0d8df] bg-white/90 p-6 shadow-[0_18px_60px_rgba(93,45,74,0.12)]"
            >
              <div className="mb-5 flex gap-1 text-[#cc7a9b]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
                ))}
              </div>
              <p className="text-sm leading-7 text-[#604354]">"{story.text}"</p>
              <div className="mt-6 border-t border-[#f3dce5] pt-5">
                <p className="font-semibold text-[#2f1325]">{story.name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9d6b19]">
                  {story.title}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          className="mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-[2rem] border border-[#efd8b0]/85 bg-[#2f1325] p-6 text-white shadow-[0_30px_100px_rgba(47,19,37,0.28)] sm:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10"
        >
          <LuxuryArtwork
            title="The Insider Invitation"
            copy="A lifestyle invitation into rewards, confidence, and private fashion moments."
            ratio="wide"
            icon={ShoppingBag}
            artworkKey="membership.finalCta"
          />
          <motion.div variants={fadeUp} className="flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f8d88a]">
              {finalCta.eyebrow || "Your private fashion circle awaits"}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              {finalCta.title || "Step into the Fashion Insider Club."}
            </h2>
            <p className="mt-5 text-base leading-8 text-white/75 sm:text-lg">
              {finalCta.description}
            </p>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isMemberActive}
              className="mt-7 inline-flex h-12 w-fit items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-[#2f1325] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#fff8ef] disabled:cursor-default disabled:opacity-80"
            >
              {isMemberActive ? "Already A Member" : finalCta.buttonText || "Join The Club"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
