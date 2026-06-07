"use client";

import BlogMediaAsset from "@/components/BlogMediaAsset";
import ResponsiveMediaImage from "@/components/ResponsiveMediaImage";
import BrandArtworkFrame from "@/components/brand/BrandArtworkFrame";
import { contactConfig } from "@/config/siteConfig";
import useStorefrontContent from "@/hooks/useStorefrontContent";
import {
  getArtwork,
  getArtworkSource,
} from "@/config/visualIdentity";
import { fetchDataFromApi, postData } from "@/utils/api";
import { extractImageCandidatesFromBlogHtml } from "@/utils/blogHtml";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Gem,
  Heart,
  Instagram,
  Mail,
  PenLine,
  Quote,
  Sparkles,
  UserRound,
} from "lucide-react";

const DEFAULT_PAGE = {
  theme: { style: "journal", layout: "magazine" },
  sections: { hero: true, featured: true, grid: true, newsletter: true },
  hero: {
    badge: "Ananya Boutique Editorial",
    title: "The Journal",
    description:
      "Fashion inspiration, styling guides, boutique stories, and curated advice from Ananya Boutique.",
  },
  newsletter: {
    title: "Join The Boutique Family",
    description:
      "Receive styling advice, fashion inspiration, exclusive previews, and boutique updates.",
    inputPlaceholder: "Enter your email address",
    buttonText: "Join Now",
    note: "We respect your privacy. Unsubscribe at any time.",
  },
  article: {
    bannerStartColor: "#2f1325",
    bannerEndColor: "#7c2d62",
    fontFamily: "modern-sans",
  },
};

const FEATURED_TOPICS = [
  {
    title: "Saree Styling",
    copy: "Drapes, colors, and graceful finishing notes.",
    palette: "from-[#fff1f7] via-white to-[#efe8ff]",
    artworkKey: "categories.sarees",
  },
  {
    title: "Suit Collection",
    copy: "Coordinated looks for visits, work, and occasions.",
    palette: "from-[#f2ecff] via-white to-[#ffeaf2]",
    artworkKey: "categories.suits",
  },
  {
    title: "Kurti Trends",
    copy: "Everyday silhouettes with boutique detail.",
    palette: "from-[#ffeaf2] via-white to-[#eaf6ef]",
    artworkKey: "categories.kurtis",
  },
  {
    title: "Jewellery Styling",
    copy: "Statement details and delicate accents.",
    palette: "from-[#fff6dc] via-white to-[#ffeaf1]",
    artworkKey: "categories.artificial-jewellery",
  },
  {
    title: "Beauty & Cosmetics",
    copy: "Finishing touches for a polished glow.",
    palette: "from-[#fff0ef] via-white to-[#f2ecff]",
    artworkKey: "categories.cosmetics",
  },
  {
    title: "Boutique Stories",
    copy: "The people, care, and memories behind the collection.",
    palette: "from-[#fff8ef] via-white to-[#f0e8ff]",
    artworkKey: "story.homemaker",
  },
];

const STYLE_GUIDES = [
  {
    title: "Wedding Styling Guide",
    copy: "Elegant layers, jewellery pairings, and celebration-ready choices.",
    label: "Occasion Edit",
    palette: "from-[#fff4dc] via-white to-[#ffe8f0]",
  },
  {
    title: "Festive Fashion Guide",
    copy: "Color, comfort, and festive sparkle chosen with balance.",
    label: "Seasonal Edit",
    palette: "from-[#f3ecff] via-white to-[#fff1f7]",
  },
  {
    title: "Everyday Elegance Guide",
    copy: "Easy styling ideas for confidence in daily dressing.",
    label: "Daily Style",
    palette: "from-[#eaf6ef] via-white to-[#fff4dc]",
  },
];

const INSTAGRAM_PLACEHOLDERS = [
  "New Arrivals",
  "Styling Notes",
  "Saree Moments",
  "Jewellery Details",
  "Beauty Picks",
  "Boutique Stories",
];

const BLOG_MEDIA_VARIANTS = {
  hero: {
    shell: "relative min-h-[360px] overflow-hidden bg-[#f8f0f4] p-3 sm:min-h-[460px]",
    frame:
      "relative h-full min-h-[330px] w-full overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_22px_60px_rgba(47,19,37,0.13)]",
    media: "h-full w-full object-cover transition-transform duration-500",
  },
  featured: {
    shell: "relative aspect-[16/10] overflow-hidden bg-[#f8f0f4] p-3",
    frame:
      "relative h-full w-full overflow-hidden rounded-lg border border-white/80 bg-white shadow-[0_18px_50px_rgba(47,19,37,0.12)]",
    media: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
  },
  grid: {
    shell: "relative aspect-[4/5] overflow-hidden bg-[#f8f0f4] p-2",
    frame:
      "relative h-full w-full overflow-hidden rounded-md border border-white/80 bg-white shadow-[0_14px_35px_rgba(47,19,37,0.1)]",
    media: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]",
  },
};

const fadeUp = {
  hidden: { opacity: 1, y: 0 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const sectionViewport = { once: true, amount: 0.18 };

const formatDate = (dateString) => {
  try {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

const getBlogText = (blog = {}) =>
  String(
    blog.excerpt ||
      blog.description ||
      blog.content ||
      String(blog.contentHtml || "").replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

const getReadingTime = (blog = {}) => {
  const source = `${blog.title || ""} ${getBlogText(blog)}`;
  const words = source.split(/\s+/).filter(Boolean).length;
  return Math.max(Math.ceil(words / 180), 1);
};

const getAuthorName = (blog = {}) => blog.author || blog.createdBy || "Ananya Boutique";

const getBlogCategory = (blog = {}) => blog.category || blog.topic || "Fashion Journal";

function BlogMediaFallback({ title = "", className = "" }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#fff8f1_0%,#ffffff_48%,#f1ecff_100%)] p-6 text-center ${className}`}
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9d6b19]">
          Journal Cover
        </p>
        <p className="mt-3 line-clamp-3 text-sm font-black text-[#2f1325]">
          {title || "Ananya Boutique"}
        </p>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, copy, centered = false }) {
  return (
    <motion.div
      variants={fadeUp}
      className={`${centered ? "mx-auto text-center" : ""} max-w-3xl`}
    >
      {eyebrow ? (
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d6b19]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="brand-story-heading mt-2 text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {copy ? (
        <p className="mt-4 text-base font-medium leading-7 text-[#6c4b5d] sm:text-lg">
          {copy}
        </p>
      ) : null}
    </motion.div>
  );
}

function EditorialArtwork({ artwork, artworkKey, label = "Artwork Placeholder" }) {
  return (
    <BrandArtworkFrame
      artwork={artwork}
      artworkKey={artworkKey}
      aspect="wide"
      icon={Sparkles}
      label={label}
      motionEnabled={false}
      className="rounded-lg shadow-[0_24px_70px_rgba(47,19,37,0.15)]"
    />
  );
}

function TopicArtwork({ palette, artworkKey }) {
  const artwork = getArtwork(artworkKey);
  const desktopSrc = getArtworkSource(artwork, "desktop");
  const mobileSrc = getArtworkSource(artwork, "mobile") || desktopSrc;

  if (desktopSrc || mobileSrc) {
    return (
      <div
        className={`relative aspect-[16/11] overflow-hidden bg-gradient-to-br ${palette}`}
        data-artwork-key={artwork?.key || artworkKey || ""}
      >
        <ResponsiveMediaImage
          desktopSrc={desktopSrc}
          mobileSrc={mobileSrc}
          alt={artwork?.alt || artwork?.title || "Featured topic artwork"}
          className="absolute inset-0"
          imgClassName="transition duration-500 group-hover:scale-[1.04]"
          desktopProfile={artwork?.variants?.desktop?.profile || "card"}
          mobileProfile={artwork?.variants?.mobile?.profile || "card"}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[16/11] overflow-hidden bg-gradient-to-br ${palette}`}
      data-artwork-key={artwork?.key || artworkKey || ""}
    >
      <span className="absolute inset-4 rounded-lg border border-white/75" />
      <span className="absolute left-6 top-6 h-24 w-16 rounded-t-full rounded-b-lg bg-white/82 shadow-lg transition duration-500 group-hover:-translate-y-1" />
      <span className="absolute bottom-6 left-12 h-28 w-24 rounded-lg bg-[#f8d7e7]/80 shadow-lg transition duration-500 group-hover:translate-x-1" />
      <span className="absolute right-8 top-8 h-32 w-24 rounded-t-full rounded-b-lg bg-white/88 shadow-xl transition duration-500 group-hover:translate-y-1" />
      <span className="absolute bottom-8 right-14 h-16 w-16 rounded-lg border border-[#d8b46b]/45 bg-[#fff8e8]/90 shadow-lg" />
    </div>
  );
}

function FeaturedArticleCard({ blog, resolveBlogHref }) {
  if (!blog) {
    return (
      <div className="rounded-lg border border-[#eadfe6] bg-white/92 p-5 shadow-[0_18px_50px_rgba(47,19,37,0.1)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9d6b19]">
          Featured Article
        </p>
        <h2 className="brand-story-heading mt-3 text-3xl font-semibold text-[#2f1325]">
          Stories From The Boutique
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-[#6c4b5d]">
          Editorial stories and styling advice will appear here as the journal grows.
        </p>
      </div>
    );
  }

  return (
    <Link href={resolveBlogHref(blog)} className="block">
      <article className="group rounded-lg border border-[#eadfe6] bg-white/94 p-5 shadow-[0_18px_50px_rgba(47,19,37,0.1)] transition hover:-translate-y-1 hover:border-[#d8b46b] hover:shadow-[0_26px_70px_rgba(47,19,37,0.15)]">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ead3df] bg-[#fff8fb] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#6b244d]">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Featured Article
          </span>
          <span className="text-xs font-bold text-[#9b7b8d]">
            {getReadingTime(blog)} min read
          </span>
        </div>
        <h2 className="brand-story-heading mt-4 line-clamp-3 text-3xl font-semibold leading-tight text-[#2f1325] transition group-hover:text-[#7c2d62]">
          {blog.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-[#6c4b5d]">
          {getBlogText(blog)}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-[#eadfe6] pt-4">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#9d6b19]">
            {getBlogCategory(blog)}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-black text-[#2f1325]">
            Read
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </article>
    </Link>
  );
}

function BlogCard({ blog, resolveBlogHref, renderBlogMediaSurface, featured = false }) {
  const readingTime = getReadingTime(blog);
  const author = getAuthorName(blog);
  const category = getBlogCategory(blog);

  return (
    <Link href={resolveBlogHref(blog)} className="block h-full">
      <motion.article
        variants={fadeUp}
        whileHover={{ y: -6 }}
        className={`group flex h-full flex-col overflow-hidden rounded-lg border border-[#eadfe6] bg-white shadow-[0_16px_45px_rgba(47,19,37,0.08)] transition hover:border-[#d8b46b] hover:shadow-[0_24px_65px_rgba(47,19,37,0.13)] ${
          featured ? "lg:grid lg:grid-cols-[0.95fr_1.05fr]" : ""
        }`}
      >
        <div className="relative">
          {renderBlogMediaSurface(blog, featured ? "featured" : "grid")}
          <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b244d] shadow-sm">
            {category}
          </span>
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#2f1325] shadow-sm">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {readingTime} min
          </span>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[#9b7b8d]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(blog.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              {author}
            </span>
          </div>

          <h3
            className={`brand-story-heading mt-4 line-clamp-3 font-semibold leading-tight text-[#2f1325] transition group-hover:text-[#7c2d62] ${
              featured ? "text-3xl sm:text-4xl" : "text-2xl"
            }`}
          >
            {blog.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-[#6c4b5d]">
            {getBlogText(blog)}
          </p>

          <div className="mt-auto flex items-center justify-between border-t border-[#eadfe6] pt-5">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#9d6b19]">
              <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
              Editorial
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-black text-[#2f1325]">
              Read Article
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}

function NewsletterForm({
  pageConfig,
  newsletterEmail,
  newsletterStatus,
  newsletterMessage,
  handleNewsletterEmailChange,
  handleNewsletterSubmit,
}) {
  return (
    <form onSubmit={handleNewsletterSubmit} className="mt-7 max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="email"
          value={newsletterEmail}
          onChange={handleNewsletterEmailChange}
          placeholder={
            pageConfig?.newsletter?.inputPlaceholder ||
            DEFAULT_PAGE.newsletter.inputPlaceholder
          }
          required
          disabled={newsletterStatus === "loading" || newsletterStatus === "success"}
          className="h-12 rounded-lg border border-[#ead3df] bg-white px-4 text-sm font-bold text-[#2f1325] outline-none transition placeholder:text-[#a68c9d] focus:border-[#7c2d62] focus:ring-4 focus:ring-[#f8d7e7]/55"
        />
        <button
          type="submit"
          disabled={newsletterStatus === "loading" || newsletterStatus === "success"}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#2f1325] px-6 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_18px_40px_rgba(47,19,37,0.22)] transition hover:-translate-y-0.5 hover:bg-[#4b1f3a] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {newsletterStatus === "loading"
            ? "Joining..."
            : newsletterStatus === "success"
              ? "Joined"
              : pageConfig?.newsletter?.buttonText || DEFAULT_PAGE.newsletter.buttonText}
        </button>
      </div>
      {pageConfig?.newsletter?.note ? (
        <p className="mt-3 text-xs font-medium text-[#8a7180]">
          {pageConfig.newsletter.note}
        </p>
      ) : null}
      {newsletterMessage ? (
        <p
          className={`mt-3 text-sm font-bold ${
            newsletterStatus === "success" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {newsletterMessage}
        </p>
      ) : null}
    </form>
  );
}

export default function BlogPage() {
  const { content: storefrontContent } = useStorefrontContent();
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [pageConfig, setPageConfig] = useState(DEFAULT_PAGE);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState(null);
  const [newsletterMessage, setNewsletterMessage] = useState("");

  const sections = pageConfig?.sections || DEFAULT_PAGE.sections;
  const showHero = sections.hero !== false;
  const showFeatured = sections.featured !== false;
  const showGrid = sections.grid !== false;
  const showNewsletter = sections.newsletter !== false;

  const featuredBlog = blogs.length > 0 ? blogs[0] : null;
  const otherBlogs = blogs.slice(1);

  const heroTitle = DEFAULT_PAGE.hero.title;
  const heroDescription = DEFAULT_PAGE.hero.description;
  const heroBadge = DEFAULT_PAGE.hero.badge;
  const blogHeroImage = storefrontContent.mediaSlots?.blogHero || "";
  const newsletterTitle = DEFAULT_PAGE.newsletter.title;
  const newsletterDescription = DEFAULT_PAGE.newsletter.description;

  const resolveBlogHref = (blog) => `/blogs/${blog.slug || blog._id}`;
  const getBlogPreviewImage = (blog) => {
    if (blog?.image) return blog.image;
    return extractImageCandidatesFromBlogHtml(blog?.contentHtml || "")?.[0] || "";
  };
  const renderBlogMedia = (blog, className = "") => {
    const previewImage = getBlogPreviewImage(blog);
    if (blog?.videoUrl) {
      return (
        <video
          src={blog.videoUrl}
          controls
          playsInline
          poster={previewImage || undefined}
          preload="metadata"
          className={className}
        />
      );
    }

    if (previewImage) {
      return (
        <BlogMediaAsset
          src={previewImage}
          alt={blog.title}
          className={className}
          fallback={<BlogMediaFallback title={blog.title} className={className} />}
        />
      );
    }

    return <BlogMediaFallback title={blog?.title} className={className} />;
  };
  const renderBlogMediaSurface = (blog, variant = "grid") => {
    const styles = BLOG_MEDIA_VARIANTS[variant] || BLOG_MEDIA_VARIANTS.grid;
    const mediaTone = blog?.videoUrl ? "bg-black" : "bg-white";

    return (
      <div className={styles.shell}>
        <div className={`${styles.frame} ${mediaTone}`}>
          {renderBlogMedia(blog, `${styles.media} ${mediaTone}`)}
        </div>
      </div>
    );
  };

  const visibleBlogs = useMemo(
    () => blogs.filter((blog) => blog && (blog._id || blog.slug)),
    [blogs],
  );

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sanitizeEmail = (email) =>
    email
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim()
      .toLowerCase();

  const handleNewsletterEmailChange = (event) => {
    setNewsletterEmail(event.target.value);
    if (newsletterStatus === "error") {
      setNewsletterStatus(null);
      setNewsletterMessage("");
    }
  };

  const handleNewsletterSubmit = async (event) => {
    event.preventDefault();
    const emailValue = sanitizeEmail(newsletterEmail);
    if (!emailValue) {
      setNewsletterStatus("error");
      setNewsletterMessage("Please enter your email address.");
      toast.error("Please enter your email address.");
      return;
    }
    if (!isValidEmail(emailValue)) {
      setNewsletterStatus("error");
      setNewsletterMessage("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }
    setNewsletterStatus("loading");
    setNewsletterMessage("");
    try {
      const response = await postData("/api/newsletter/subscribe", {
        email: emailValue,
        source: "blogs",
      });
      if (response?.success) {
        setNewsletterStatus("success");
        setNewsletterMessage(response.message || "Thank you for subscribing!");
        setNewsletterEmail("");
        toast.success(response.message || "Thank you for subscribing!");
      } else {
        setNewsletterStatus("error");
        setNewsletterMessage(
          response?.message || "Failed to subscribe. Please try again.",
        );
        toast.error(response?.message || "Failed to subscribe. Please try again.");
      }
    } catch (error) {
      console.error("Blog newsletter subscription error:", error);
      setNewsletterStatus("error");
      setNewsletterMessage("Failed to subscribe. Please try again.");
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  useEffect(() => {
    const fetchPage = async () => {
      const response = await fetchDataFromApi("/api/blogs/page/public", {
        skipCache: true,
      });

      if (response?.error || !response?.data) {
        return;
      }

      setPageConfig({
        ...DEFAULT_PAGE,
        ...response.data,
        theme: { ...DEFAULT_PAGE.theme, ...(response.data.theme || {}) },
        sections: {
          ...DEFAULT_PAGE.sections,
          ...(response.data.sections || {}),
        },
        hero: { ...DEFAULT_PAGE.hero, ...(response.data.hero || {}) },
        newsletter: {
          ...DEFAULT_PAGE.newsletter,
          ...(response.data.newsletter || {}),
        },
        article: {
          ...DEFAULT_PAGE.article,
          ...(response.data.article || {}),
        },
      });
    };

    fetchPage().catch((error) => {
      console.error("BlogPage config fetch error:", error);
    });
  }, []);

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setBlogsLoading(true);
        const response = await fetchDataFromApi("/api/blogs", {
          skipCache: true,
        });
        if (response?.success && Array.isArray(response?.data)) {
          setBlogs(response.data);
        }
      } catch (error) {
        console.error("Blog list fetch error:", error);
      } finally {
        setBlogsLoading(false);
      }
    };

    loadBlogs();

    const handleBlogUpdate = () => {
      loadBlogs();
    };

    window.addEventListener("blogUpdated", handleBlogUpdate);
    return () => window.removeEventListener("blogUpdated", handleBlogUpdate);
  }, []);

  return (
    <main className="min-h-screen bg-[#fffdfb] text-[#2f1325]">
      {showHero ? (
        <section className="border-b border-[#eadfe6] bg-[linear-gradient(135deg,#fff8f1_0%,#fffdfb_42%,#f3ecff_100%)]">
          <div className="container mx-auto grid gap-8 px-4 py-10 sm:py-12 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:py-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-3xl"
            >
              <motion.span
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-[#ead3df] bg-white/82 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#6b244d] shadow-sm"
              >
                <PenLine className="h-3.5 w-3.5 text-[#9d6b19]" aria-hidden="true" />
                {heroBadge}
              </motion.span>
              <motion.h1
                variants={fadeUp}
                className="brand-story-heading mt-6 text-5xl font-semibold leading-[0.95] text-[#2f1325] sm:text-6xl lg:text-7xl"
              >
                {heroTitle}
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-2xl text-base font-medium leading-7 text-[#6c4b5d] sm:text-lg"
              >
                {heroDescription}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8">
                <FeaturedArticleCard
                  blog={showFeatured ? featuredBlog : null}
                  resolveBlogHref={resolveBlogHref}
                />
              </motion.div>
            </motion.div>

            <EditorialArtwork
              artwork={
                blogHeroImage
                  ? {
                      source: blogHeroImage,
                      title: heroTitle,
                      copy: heroDescription,
                      aspect: "wide",
                    }
                  : undefined
              }
              artworkKey="blog.hero"
              label="Journal Hero"
            />
          </div>
        </section>
      ) : null}

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
        className="bg-white"
      >
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="grid gap-5 border-y border-[#eadfe6] py-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <motion.div variants={fadeUp}>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9d6b19]">
                Editor&apos;s Note
              </p>
              <h2 className="brand-story-heading mt-2 text-3xl font-semibold leading-tight text-[#2f1325] sm:text-4xl">
                A note from the boutique
              </h2>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-4">
              <p className="text-base font-medium leading-8 text-[#60485a] sm:text-lg">
                For over a decade, Ananya Boutique has helped women discover styles that make them feel confident, elegant, and comfortable.
              </p>
              <p className="text-base font-medium leading-8 text-[#60485a] sm:text-lg">
                The Journal is where we share inspiration, fashion guidance, seasonal trends, and stories behind the collections we love.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
        className="bg-[#fffdfb]"
      >
        <div className="container mx-auto px-4 py-10 sm:py-12">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Featured Topics"
              title="Curated fashion conversations"
              copy="Explore editorial themes across styling, beauty, jewellery, and boutique stories."
            />
            <a
              href="#journal-stories"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#ead3df] bg-white px-4 text-sm font-black text-[#6b244d] transition hover:border-[#d8b46b]"
            >
              Browse Stories
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="mb-6">
            <EditorialArtwork
              artworkKey="blog.featuredTopics"
              label="Featured Topics"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TOPICS.map((topic) => (
              <motion.a
                key={topic.title}
                variants={fadeUp}
                href="#journal-stories"
                className="group overflow-hidden rounded-lg border border-[#eadfe6] bg-white shadow-[0_16px_45px_rgba(47,19,37,0.08)] transition hover:-translate-y-1 hover:border-[#d8b46b] hover:shadow-[0_24px_60px_rgba(47,19,37,0.13)]"
              >
                <TopicArtwork
                  palette={topic.palette}
                  artworkKey={topic.artworkKey}
                />
                <div className="p-4">
                  <h3 className="text-lg font-black text-[#2f1325]">
                    {topic.title}
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#806574]">
                    {topic.copy}
                  </p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </motion.section>

      {showGrid ? (
        <section
          id="journal-stories"
          className="scroll-mt-[calc(var(--header-height,118px)+28px)] border-y border-[#eadfe6] bg-[linear-gradient(180deg,#fff8fb_0%,#ffffff_100%)]"
        >
          <div className="container mx-auto px-4 py-10 sm:py-14">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={sectionViewport}
              variants={staggerContainer}
              className="mb-7"
            >
              <SectionHeading
                eyebrow="Latest Articles"
                title="Editorial style notes"
                copy="Premium guides, collection stories, and boutique advice from Ananya Boutique."
              />
            </motion.div>

            {blogsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="aspect-[4/5] animate-pulse rounded-lg bg-[#efe8e1]"
                  />
                ))}
              </div>
            ) : visibleBlogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#d9c8d2] bg-white px-5 py-16 text-center shadow-sm">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-[#fff1f7] text-[#7c2d62]">
                  <BookOpen className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-black text-[#2f1325]">
                  No journal stories yet
                </h3>
                <p className="mt-2 text-[#6c4b5d]">
                  New fashion stories will appear here soon.
                </p>
              </div>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={sectionViewport}
                variants={staggerContainer}
                className="space-y-5"
              >
                {showFeatured && featuredBlog ? (
                  <BlogCard
                    blog={featuredBlog}
                    resolveBlogHref={resolveBlogHref}
                    renderBlogMediaSurface={renderBlogMediaSurface}
                    featured
                  />
                ) : null}

                {otherBlogs.length > 0 ? (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {otherBlogs.map((blog) => (
                      <BlogCard
                        key={blog._id || blog.slug}
                        blog={blog}
                        resolveBlogHref={resolveBlogHref}
                        renderBlogMediaSurface={renderBlogMediaSurface}
                      />
                    ))}
                  </div>
                ) : null}
              </motion.div>
            )}
          </div>
        </section>
      ) : null}

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
        className="bg-white"
      >
        <div className="container mx-auto grid gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <motion.div variants={fadeUp}>
            <SectionHeading
              eyebrow="Founder Insights"
              title="Lessons From A Boutique Built With Love"
              copy="Ananya Boutique grew through patience, trust, and a homemaker's courage to serve women with honesty. Every collection carries that same belief: style should feel personal, graceful, useful, and chosen with care."
            />
            <div className="mt-6 rounded-lg border border-[#eadfe6] bg-[#fff8fb] p-5">
              <Quote className="h-6 w-6 text-[#9d6b19]" aria-hidden="true" />
              <p className="mt-3 text-base font-semibold leading-7 text-[#60485a]">
                The best fashion advice begins with listening: to comfort, to confidence, to family moments, and to the woman wearing the outfit.
              </p>
            </div>
          </motion.div>
          <motion.div variants={fadeUp}>
            <EditorialArtwork
              artworkKey="blog.founderInsights"
              label="Founder Artwork"
            />
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
        className="bg-[#fffdfb]"
      >
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Style Guides"
              title="Guides for every fashion moment"
              copy="Reference cards for future editorial guides and seasonal content."
            />
          </div>

          <div className="mb-6">
            <EditorialArtwork artworkKey="blog.styleGuides" label="Style Guides" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {STYLE_GUIDES.map((guide) => (
              <motion.article
                key={guide.title}
                variants={fadeUp}
                className={`group overflow-hidden rounded-lg border border-[#eadfe6] bg-gradient-to-br ${guide.palette} shadow-[0_16px_45px_rgba(47,19,37,0.08)] transition hover:-translate-y-1 hover:border-[#d8b46b] hover:shadow-[0_24px_60px_rgba(47,19,37,0.13)]`}
              >
                <div className="relative min-h-[280px] p-5">
                  <span className="absolute inset-4 rounded-lg border border-white/80" />
                  <span className="absolute right-7 top-7 rounded-full border border-white/80 bg-white/84 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#6b244d]">
                    {guide.label}
                  </span>
                  <div className="absolute bottom-5 left-5 right-5">
                    <Gem className="h-7 w-7 text-[#9d6b19]" aria-hidden="true" />
                    <h3 className="brand-story-heading mt-4 text-3xl font-semibold leading-tight text-[#2f1325]">
                      {guide.title}
                    </h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#60485a]">
                      {guide.copy}
                    </p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </motion.section>

      {showNewsletter ? (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
          className="border-y border-[#eadfe6] bg-[linear-gradient(135deg,#fff8f1_0%,#ffffff_46%,#f3ecff_100%)]"
        >
          <div className="container mx-auto grid gap-8 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_0.75fr] lg:items-center">
            <motion.div variants={fadeUp}>
              <SectionHeading
                eyebrow="Newsletter"
                title={newsletterTitle}
                copy={newsletterDescription}
              />
              <NewsletterForm
                pageConfig={pageConfig}
                newsletterEmail={newsletterEmail}
                newsletterStatus={newsletterStatus}
                newsletterMessage={newsletterMessage}
                handleNewsletterEmailChange={handleNewsletterEmailChange}
                handleNewsletterSubmit={handleNewsletterSubmit}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <div className="rounded-lg border border-[#eadfe6] bg-white/86 p-5 shadow-[0_18px_50px_rgba(47,19,37,0.1)]">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Styling Advice",
                    "Fashion Inspiration",
                    "Exclusive Previews",
                    "Boutique Updates",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-lg border border-[#eadfe6] bg-[#fff8fb] p-4 text-sm font-black text-[#2f1325]"
                    >
                      <Heart className="mb-3 h-5 w-5 text-[#9d6b19]" aria-hidden="true" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>
      ) : null}

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        variants={staggerContainer}
        className="bg-white"
      >
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              eyebrow="Instagram"
              title="Follow Our Journey"
              copy="See new arrivals, styling inspiration, boutique updates, and behind-the-scenes moments."
            />
            <a
              href={contactConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#ead3df] bg-[#fff8fb] px-4 text-sm font-black text-[#6b244d] transition hover:border-[#d8b46b] hover:bg-white"
            >
              <Instagram className="h-4 w-4" aria-hidden="true" />
              {contactConfig.instagramHandle}
            </a>
          </div>

          <div className="mb-6">
            <EditorialArtwork
              artworkKey="blog.instagramShowcase"
              label="Instagram Showcase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {INSTAGRAM_PLACEHOLDERS.map((item, index) => (
              <motion.a
                key={item}
                variants={fadeUp}
                href={contactConfig.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-[#eadfe6] bg-[linear-gradient(135deg,#fff8f1_0%,#fff_48%,#f1ecff_100%)] shadow-[0_14px_35px_rgba(47,19,37,0.08)]"
              >
                <span className="absolute inset-3 rounded-lg border border-white/80" />
                <span className="absolute left-5 top-5 h-16 w-12 rounded-t-full rounded-b-lg bg-white/88 shadow-md transition group-hover:-translate-y-1" />
                <span className="absolute bottom-6 right-5 h-20 w-14 rounded-lg bg-[#f8d7e7]/80 shadow-md transition group-hover:translate-y-1" />
                <span className="absolute inset-x-3 bottom-3 rounded-md bg-white/88 px-3 py-2 text-xs font-black text-[#2f1325] shadow-sm">
                  {String(index + 1).padStart(2, "0")} / {item}
                </span>
              </motion.a>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="bg-[linear-gradient(135deg,#2f1325_0%,#4b1f3a_58%,#7c2d62_100%)] text-white">
        <div className="container mx-auto grid gap-6 px-4 py-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e8c67a]">
              Ananya Boutique
            </p>
            <h2 className="brand-story-heading mt-3 text-4xl font-semibold text-white sm:text-5xl">
              Fashion Is More Than Clothing
            </h2>
            <div className="mt-4 space-y-1 text-base font-medium leading-7 text-white/84 sm:text-lg">
              <p>It is confidence.</p>
              <p>It is self-expression.</p>
              <p>It is the story we tell without speaking.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/products"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black uppercase tracking-[0.14em] text-[#2f1325] transition hover:-translate-y-0.5 hover:bg-[#fff8e8]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Explore Collection
            </Link>
            <a
              href={contactConfig.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-white/20"
            >
              <Instagram className="h-4 w-4" aria-hidden="true" />
              Follow Instagram
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
