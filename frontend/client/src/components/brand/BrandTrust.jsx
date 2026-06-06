import {
  brandIdentity,
  brandPillars,
  founderStoryBadges,
  globalTrustMessages,
} from "@/config/visualIdentity";
import {
  FiCheckCircle,
  FiHeart,
  FiHome,
  FiMessageCircle,
  FiShield,
  FiStar,
  FiUsers,
} from "react-icons/fi";

const pillarIcons = [FiShield, FiHome, FiStar, FiHeart, FiMessageCircle];

export function FounderStoryBadge({
  label = "Founded in 2012",
  className = "",
  compact = false,
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#efd8e4] bg-white/88 font-semibold uppercase tracking-[0.16em] text-[#7c2d62] shadow-sm shadow-[#7c2d62]/5 ${compact ? "px-3 py-1.5 text-[10px]" : "px-4 py-2 text-xs"} ${className}`}
    >
      <FiHeart className="h-3.5 w-3.5 text-[#c02672]" aria-hidden="true" />
      {label}
    </span>
  );
}

export function FounderBadgeGroup({
  badges = founderStoryBadges,
  className = "",
  compact = false,
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {badges.map((badge) => (
        <FounderStoryBadge key={badge} label={badge} compact={compact} />
      ))}
    </div>
  );
}

export function BrandTrustBanner({ className = "" }) {
  return (
    <div
      className={`border-y border-[#f0d7e2] bg-[linear-gradient(90deg,#fff8fb_0%,#fff_44%,#f7f0ff_100%)] px-4 py-2.5 text-center ${className}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7c2d62] sm:flex-row sm:gap-3">
        <span className="inline-flex items-center gap-2">
          <FiShield className="h-4 w-4 text-[#c02672]" aria-hidden="true" />
          {globalTrustMessages.banner}
        </span>
        <span className="hidden h-1 w-1 rounded-full bg-[#d8a7bd] sm:block" />
        <span className="normal-case tracking-normal text-[#6b4b5c]">
          {brandIdentity.supportingMessage}
        </span>
      </div>
    </div>
  );
}

export function BrandTrustStrip({
  messages = globalTrustMessages.messages,
  className = "",
}) {
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}
      aria-label="Ananya Boutique trust messages"
    >
      {messages.map((message) => (
        <div
          key={message}
          className="flex items-center gap-3 rounded-2xl border border-[#f0d7e2] bg-white/82 px-4 py-3 text-sm font-semibold text-[#4a2539] shadow-sm shadow-[#7c2d62]/5"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff1f7] text-[#c02672]">
            <FiCheckCircle className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>{message}</span>
        </div>
      ))}
    </div>
  );
}

export function FounderSignatureSection({ className = "" }) {
  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border border-[#f0d7e2] bg-[linear-gradient(135deg,#fff8fb_0%,#ffffff_48%,#f7f0ff_100%)] p-6 shadow-[0_24px_80px_rgba(124,45,98,0.12)] sm:p-8 ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(192,38,114,0.42),transparent)]" />
      <FounderBadgeGroup compact />
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d174d]">
            Founder Story
          </p>
          <h2 className="mt-3 brand-serif-heading text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl">
            {brandIdentity.founderSignature}
          </h2>
        </div>
        <div>
          <p className="text-base leading-7 text-[#644256]">
            {brandIdentity.founderStory}
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/82 px-4 py-2 text-sm font-semibold text-[#7c2d62]">
            <FiUsers className="h-4 w-4" aria-hidden="true" />
            {brandIdentity.founderRole}
          </p>
        </div>
      </div>
    </section>
  );
}

export function BrandPillarGrid({
  pillars = brandPillars,
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-5 ${className}`}
      aria-label="Ananya Boutique brand pillars"
    >
      {pillars.map((pillar, index) => {
        const Icon = pillarIcons[index] || FiCheckCircle;
        return (
          <article
            key={pillar.id || pillar.title}
            className="rounded-[1.5rem] border border-[#f0d7e2] bg-white/86 p-4 shadow-[0_16px_48px_rgba(124,45,98,0.1)]"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#fff1f7] text-[#c02672]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#2f1325]">
              {pillar.title}
            </h3>
            {!compact ? (
              <p className="mt-2 text-sm leading-6 text-[#6b4b5c]">
                {pillar.description}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
