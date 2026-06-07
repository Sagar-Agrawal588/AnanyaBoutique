"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import ResponsiveMediaImage from "@/components/ResponsiveMediaImage";
import {
  brandDesignTokens,
  getArtwork,
  getArtworkSource,
} from "@/config/visualIdentity";

const paletteClasses = {
  blush: "from-[#fff1f7] via-white to-[#ede2ff]",
  lavender: "from-[#f6f0ff] via-white to-[#ffeaf4]",
  rose: "from-[#ffe8f0] via-white to-[#f3e8ff]",
  gold: "from-[#fff8ef] via-white to-[#f8e8f0]",
  plum: "from-[#2f1325] via-[#4b1f3a] to-[#7c2d62]",
};

const aspectClasses = {
  hero: "min-h-[430px] lg:min-h-[540px]",
  portrait: "aspect-[4/5] min-h-[420px]",
  wide: "aspect-[16/10] min-h-[320px]",
  banner: "aspect-[5/3] min-h-[220px]",
  card: "aspect-[5/6] min-h-[260px]",
  square: "aspect-square min-h-[240px]",
};

export default function BrandArtworkFrame({
  artwork,
  artworkKey,
  title,
  copy,
  aspect,
  icon: Icon = Sparkles,
  className = "",
  motionEnabled = true,
  label = "Ananya Boutique",
  loading = "lazy",
  fetchPriority = "auto",
  children,
}) {
  const resolvedArtwork =
    artwork || (artworkKey ? getArtwork(artworkKey) : null) || {};
  const resolvedTitle = title || resolvedArtwork.title || "Ananya Boutique";
  const resolvedCopy =
    copy ||
    resolvedArtwork.copy ||
    "Premium visual space prepared for Ananya Boutique artwork.";
  const resolvedAspect = aspect || resolvedArtwork.aspect || "wide";
  const palette = resolvedArtwork.palette || "blush";
  const gradient = paletteClasses[palette] || paletteClasses.blush;
  const aspectClass = aspectClasses[resolvedAspect] || aspectClasses.wide;
  const desktopSrc =
    getArtworkSource(resolvedArtwork, "desktop") || resolvedArtwork.source || "";
  const mobileSrc =
    getArtworkSource(resolvedArtwork, "mobile") ||
    resolvedArtwork.mobileSource ||
    desktopSrc;
  const hasSource = Boolean(desktopSrc || mobileSrc);
  const desktopProfile =
    resolvedArtwork.variants?.desktop?.profile ||
    (resolvedAspect === "banner" ? "bannerDesktop" : "heroDesktop");
  const mobileProfile =
    resolvedArtwork.variants?.mobile?.profile ||
    (resolvedAspect === "banner" ? "bannerMobile" : "heroMobile");
  const Wrapper = motionEnabled ? motion.div : "div";
  const wrapperProps = motionEnabled
    ? {
        whileHover: { y: -6, scale: 1.01 },
        transition: { duration: 0.35, ease: "easeOut" },
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative overflow-hidden rounded-[2rem] border border-white/85 bg-gradient-to-br ${gradient} shadow-[0_28px_90px_rgba(93,45,74,0.16)] ${aspectClass} ${className}`}
      style={{ boxShadow: brandDesignTokens.shadows.premium }}
      data-artwork-key={resolvedArtwork.key || artworkKey || ""}
      aria-label={`${resolvedTitle} artwork slot`}
    >
      {hasSource ? (
        <ResponsiveMediaImage
          desktopSrc={desktopSrc}
          mobileSrc={mobileSrc}
          alt={resolvedArtwork.alt || resolvedTitle}
          className="absolute inset-0"
          imgClassName="object-cover"
          desktopProfile={desktopProfile}
          mobileProfile={mobileProfile}
          loading={loading}
          fetchPriority={fetchPriority}
        />
      ) : null}
      {hasSource ? (
        <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-white/10 to-transparent" />
      ) : (
        <>
          <div className="absolute inset-5 rounded-[1.5rem] border border-[#e8c67a]/45" />
          <div className="absolute inset-x-10 top-10 h-px bg-gradient-to-r from-transparent via-[#d6a84f]/70 to-transparent" />
          <div className="absolute inset-x-10 bottom-10 h-px bg-gradient-to-r from-transparent via-[#d6a84f]/55 to-transparent" />
          <div className="absolute left-8 top-8 h-28 w-20 rounded-t-full rounded-b-2xl bg-white/80 shadow-xl shadow-[#7a335e]/10 transition duration-500 group-hover:-translate-y-1" />
          <div className="absolute right-9 top-10 h-36 w-24 rounded-2xl bg-[#f8d7e7]/75 shadow-xl shadow-[#7a335e]/10 transition duration-500 group-hover:translate-y-1" />
          <div className="absolute bottom-12 left-10 h-36 w-28 rounded-[1.5rem] bg-[#eadcf8]/80 shadow-xl shadow-[#7a335e]/10" />
          <div className="absolute bottom-12 right-10 h-44 w-28 rounded-t-full rounded-b-[1.5rem] bg-white/85 shadow-2xl shadow-[#7a335e]/10" />
          <div className="absolute left-1/2 top-1/2 h-[58%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-t-full rounded-b-[2rem] border border-white/80 bg-gradient-to-b from-white via-[#fff1f7] to-[#efe2ff] shadow-[0_24px_70px_rgba(93,45,74,0.18)]" />
        </>
      )}
      <div className="absolute right-7 top-7 grid h-12 w-12 place-items-center rounded-2xl border border-[#e8c67a]/50 bg-white/85 text-[#9d6b19] shadow-lg shadow-[#7a335e]/10">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-xl shadow-[#7a335e]/10 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9d6b19]">
          {label}
        </p>
        <h3 className="mt-2 font-serif text-2xl font-semibold text-[#2f1325]">
          {resolvedTitle}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#6c4b5d]">{resolvedCopy}</p>
      </div>
      {children}
    </Wrapper>
  );
}
