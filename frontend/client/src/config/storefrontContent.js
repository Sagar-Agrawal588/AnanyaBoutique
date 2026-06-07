const clone = (value) => {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const DEFAULT_STOREFRONT_CONTENT = {
  contact: {
    phone: "+91 6396789311",
    whatsapp: "+91 6396789311",
    email: "sagaragrawal.588@gmail.com",
    address: "Ananya Boutique",
    mapUrl: "https://share.google/9gTvwlEIKp6hVZDbk",
    businessHours: "Monday - Saturday, 10:00 AM - 8:00 PM",
    instagramUrl: "https://www.instagram.com/ananya___boutique",
    instagramHandle: "@ananya___boutique",
    instagramTitle: "Follow Our Journey",
    instagramContent:
      "Discover new arrivals, styling inspiration, boutique updates, customer stories, and behind-the-scenes moments from Ananya Boutique.",
    trustSignals: [
      "Trust Since 2012",
      "Family-Owned Boutique",
      "Affordable Fashion",
      "Women-Centric Style",
      "Personal Customer Care",
    ],
    whatsappActions: [
      {
        label: "Chat on WhatsApp",
        message: "Hi Ananya Boutique, I would like to chat on WhatsApp.",
      },
      {
        label: "Get Styling Advice",
        message: "Hi Ananya Boutique, I would like styling advice.",
      },
      {
        label: "Product Assistance",
        message: "Hi Ananya Boutique, I need product assistance.",
      },
      {
        label: "Order Support",
        message: "Hi Ananya Boutique, I need help with my order.",
      },
    ],
  },
  header: {
    navItems: [
      { name: "Home", href: "/", icon: "home", enabled: true },
      { name: "Discover Style", href: "/products", icon: "shopping", enabled: true },
      { name: "Membership", href: "/membership", icon: "gem", enabled: true },
      { name: "Blogs", href: "/blogs", icon: "journal", enabled: true },
      { name: "About Us", href: "/about-us", icon: "sparkle", enabled: true },
    ],
    featuredLinks: [
      { name: "New Arrivals", href: "/products?newArrivals=true", enabled: true },
      { name: "Best Sellers", href: "/products?bestSeller=true", enabled: true },
    ],
  },
  footer: {
    contactTitle: "Contact Us",
    description:
      "Fashion, beauty, and accessories curated with love since 2012.",
    founderMessage:
      "Every order supports a family-owned boutique dream built with care.",
    newsletterTitle: "Join the boutique family",
    newsletterDescription:
      "Get thoughtful styling notes, new arrivals, and boutique offers selected with care.",
    copyrightText: "2026 Ananya Boutique. All rights reserved.",
    linkColumns: [
      {
        title: "Discover",
        links: [
          { name: "Special Offers", href: "/products?priceDrop=true", enabled: true },
          { name: "New Arrivals", href: "/products?newArrivals=true", enabled: true },
          { name: "Loved Most", href: "/products?bestSeller=true", enabled: true },
          { name: "Discover Your Style", href: "/products", enabled: true },
        ],
      },
      {
        title: "Our Company",
        links: [
          { name: "Collaborator Portal", href: "/affiliate/login", enabled: true },
          { name: "Shipping Policy", href: "/shipping-policy", enabled: true },
          { name: "Secure payment", href: "/secure-payment", enabled: true },
          { name: "Privacy Policy", href: "/privacy-policy", enabled: true },
          { name: "Terms & Conditions", href: "/policy/terms-and-conditions", enabled: true },
          { name: "Return Policy", href: "/return-policy", enabled: true },
          { name: "Cancellation Policy", href: "/cancellation", enabled: true },
          { name: "About Us", href: "/about-us", enabled: true },
          { name: "Contact us", href: "/contact", enabled: true },
          { name: "Our Blogs", href: "/blogs", enabled: true },
        ],
      },
    ],
    socialLinks: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/ananya___boutique",
        type: "instagram",
        enabled: true,
      },
    ],
  },
  homepage: {
    hero: {
      eyebrow: "Founder-Led Fashion Boutique",
      title: "Discover Your Style",
      subtitle:
        "Fashion selected with love, trust, and years of dedication. Discover sarees, suits, kurtis, cosmetics, jewellery and fashion essentials curated with elegance and affordability.",
      primaryButtonText: "Shop Collection",
      primaryButtonHref: "/products",
      secondaryButtonText: "Meet Our Story",
      secondaryButtonHref: "/about-us",
      trustPills: [
        "Founded 2012",
        "Family-Owned",
        "Trusted Boutique",
        "Curated With Love",
      ],
      mediaSlot: "homepageHero",
    },
    founder: {
      eyebrow: "Real founder. Real family. Real story.",
      title: "Meet The Woman Behind Ananya Boutique",
      paragraphs: [
        "In 2012, a homemaker with a passion for fashion decided to take a chance on a dream.",
        "While raising three children and managing her family, she began building a boutique one customer at a time.",
        "Today that dream continues through every saree, every order, and every smile from our customers.",
      ],
      badges: ["Founded 2012", "Family-Owned", "Mother Entrepreneur", "Trusted Boutique"],
      primaryButtonText: "Read Our Story",
      primaryButtonHref: "/about-us",
      secondaryButtonText: "Chat On WhatsApp",
      mediaSlot: "founderStory",
    },
    trust: {
      eyebrow: "Trusted since 2012",
      title: "Why Women Trust Ananya Boutique",
      copy:
        "The boutique grew because women returned, recommended, and trusted the care behind every order.",
      cards: [
        {
          title: "Trusted Since 2012",
          copy: "Years of dedication, repeat customers, and patient boutique growth.",
        },
        {
          title: "Fashion Selected With Care",
          copy: "Every piece is chosen with a homemaker's eye for beauty and use.",
        },
        {
          title: "Affordable Elegance",
          copy: "Styles that feel special without feeling out of reach.",
        },
        {
          title: "Personal WhatsApp Assistance",
          copy: "Warm product guidance and order help when customers need it.",
        },
      ],
    },
    timeline: {
      eyebrow: "Our journey",
      title: "A Journey Built With Love",
      copy: "A simple timeline of a dream that kept growing through care and customer trust.",
      items: [
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
      ],
    },
    dream: {
      title: "Every Order Supports A Dream",
      copy:
        "When you shop at Ananya Boutique, you're not buying from a large corporation.",
      supportLabel: "You're supporting:",
      supports: [
        "A mother",
        "A family business",
        "A woman entrepreneur",
        "A dream that started at home",
      ],
      quote:
        "Every saree, every order, and every message from a customer keeps this dream alive.",
    },
    promise: {
      eyebrow: "Our promise",
      title: "The Boutique Promise",
      copy: "A clear promise for every customer who chooses Ananya Boutique.",
      items: [
        "Quality Products",
        "Affordable Prices",
        "Trusted Support",
        "Curated Fashion",
        "Secure Shopping",
        "Customer Satisfaction",
      ],
    },
    instagram: {
      eyebrow: "Instagram showcase",
      title: "Follow Our Journey",
      copy:
        "Follow new arrivals, styling moments, customer stories, and the everyday work behind Ananya Boutique.",
      buttonText: "Follow @ananya___boutique",
      placeholders: [
        "New arrivals",
        "Saree moments",
        "Jewellery details",
        "Beauty picks",
        "Behind the boutique",
        "Customer love",
      ],
      mediaSlot: "instagramShowcase",
    },
    testimonials: {
      eyebrow: "Customer love",
      title: "Customer Love",
      copy:
        "Kind words from our boutique family, written to match the warm, fashion-focused voice of Ananya Boutique.",
      items: [
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
      ],
    },
    finalCta: {
      eyebrow: "Ananya Boutique family",
      title: "Join The Ananya Boutique Family",
      lines: [
        "Fashion chosen with love.",
        "A boutique built with trust.",
        "A dream that continues because of customers like you.",
      ],
      primaryButtonText: "Shop Collection",
      primaryButtonHref: "/products",
      secondaryButtonText: "WhatsApp Us",
    },
    banners: [],
  },
  about: {
    hero: {
      eyebrow: "Ananya Boutique",
      title: "OUR STORY",
      subtitle:
        "Behind every product is a dream, a family, and years of determination.",
      description:
        "This is a story for every woman who has carried a dream quietly, worked for it patiently, and kept going even when the world did not see the effort.",
      primaryButtonText: "Shop Collection",
      primaryButtonHref: "/products",
      secondaryButtonText: "Connect With Us",
      secondaryButtonHref: "/contact",
      visualTitle: "A Dream That Grew With Love",
      visualSubtext:
        "A founder's journey held in soft colour, quiet strength, and family belief.",
      mediaSlot: "aboutHero",
    },
    timeline: [
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
    ],
    stats: [
      { value: "13+", label: "Years of Trust" },
      { value: "Growing", label: "Happy Customers" },
      { value: "Fashion + Beauty", label: "Products Available" },
      { value: "Every Day", label: "Orders Delivered" },
    ],
    quotes: [
      "A dream built inside a home can still become a story that inspires many women.",
      "Every order carries more than a product. It carries belief, effort, and a family's journey.",
    ],
    storySections: [
      {
        title: "Every Dream Begins With Courage",
        visualTitle: "The First Dream",
        visualSubtext: "A quiet beginning, a brave heart, and a home full of hope.",
        artworkKey: "story.founder",
        orientation: "portrait",
        paragraphs: [
          "Some businesses begin with investors.",
          "Some begin with funding.",
          "Ours began with a mother, a dream, and the determination to create something meaningful for her family.",
          "Ananya Boutique is not just a store.",
        ],
      },
      {
        title: "A Dream Born Inside A Home",
        visualTitle: "16 August 2012",
        visualSubtext: "Fashion selected by hand, trust built one customer at a time.",
        artworkKey: "story.homemaker",
        orientation: "wide",
        reverse: true,
        paragraphs: [
          "On 16 August 2012, a homemaker with a passion for fashion decided to take a chance on her dream.",
          "Without a large investment, without a team, and while managing her household responsibilities, she began selling sarees, suits, leggings, and ladies' wear.",
          "Every product was selected carefully.",
          "Every customer interaction mattered.",
        ],
      },
    ],
    cta: {
      eyebrow: "The story continues with you",
      title: "Every purchase becomes part of this journey.",
      description:
        "Ananya Boutique is built on family, trust, courage, and the belief that women deserve beauty, confidence, and opportunity at every stage of life.",
      primaryButtonText: "Shop Products",
      primaryButtonHref: "/products",
      secondaryButtonText: "Join The Family",
      secondaryButtonHref: "/membership",
      visualTitle: "Welcome To The Family",
      visualSubtext:
        "A warm community frame for women, families, and shared support.",
    },
  },
  membership: {
    hero: {
      eyebrow: "Luxury Loyalty Program",
      title: "Fashion Insider Club",
      description:
        "Unlock exclusive fashion experiences, rewards, and member-only benefits designed for women who love style.",
      primaryButtonText: "Join The Club",
      secondaryButtonText: "Explore Benefits",
      visualTitle: "The Insider Wardrobe",
      visualCopy:
        "A private style world with early access, rewards, and boutique care.",
      mediaSlot: "membershipHero",
    },
    stats: [
      { label: "Luxury Benefits", value: 6, suffix: "" },
      { label: "Style Tiers", value: 3, suffix: "" },
      { label: "Years of Trust", value: 13, suffix: "+" },
      { label: "Priority Support", value: 24, suffix: "h" },
    ],
    benefits: {
      eyebrow: "Membership Benefits",
      title: "A private circle of fashion, rewards, and care",
      copy:
        "Every benefit is designed to make shopping feel more personal, more rewarding, and more beautifully yours.",
      items: [
        {
          icon: "sparkles",
          title: "Early Access",
          description: "Get first access to new collections before public launch.",
        },
        {
          icon: "percent",
          title: "Exclusive Discounts",
          description: "Members receive special pricing and private promotions.",
        },
        {
          icon: "gift",
          title: "Birthday Rewards",
          description: "Celebrate your special day with exclusive gifts and offers.",
        },
      ],
    },
    howItWorks: [
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
    ],
    tiers: [
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
        benefits: ["Highest rewards", "VIP experiences", "Premium launches"],
      },
    ],
    vip: {
      eyebrow: "VIP Experience",
      title: "A member world made for women who love style",
      copy:
        "Private launches, thoughtful rewards, and boutique attention come together in a softer, more personal loyalty experience.",
      items: [
        "Private collection previews",
        "Birthday styling gifts",
        "Priority customer care",
        "Member-only fashion notes",
      ],
    },
    dashboard: [
      { label: "Points earned", value: 2450, suffix: "" },
      { label: "Rewards available", value: 6, suffix: "" },
      { label: "Benefits unlocked", value: 12, suffix: "" },
    ],
    testimonials: [
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
    ],
    finalCta: {
      eyebrow: "Your private fashion circle awaits",
      title: "Step into the Fashion Insider Club.",
      description:
        "Join for early access, exclusive discounts, birthday rewards, fashion points, priority support, and member-only collections.",
      buttonText: "Join The Club",
    },
  },
  mediaSlots: {
    homepageHero: "",
    founderStory: "",
    categoryBanners: {},
    membershipHero: "",
    contactHero: "",
    blogHero: "",
    openGraphImages: {},
  },
};

export const deepMergeStorefrontContent = (base, overrides) => {
  if (Array.isArray(base)) {
    return Array.isArray(overrides) ? clone(overrides) : clone(base);
  }

  if (!isPlainObject(base)) {
    return overrides == null || overrides === "" ? base : overrides;
  }

  const source = isPlainObject(overrides) ? overrides : {};
  const result = clone(base);

  Object.keys(source).forEach((key) => {
    if (isPlainObject(base[key])) {
      result[key] = deepMergeStorefrontContent(base[key], source[key]);
      return;
    }
    if (Array.isArray(base[key])) {
      result[key] = Array.isArray(source[key]) ? clone(source[key]) : clone(base[key]);
      return;
    }
    result[key] = source[key] == null ? base[key] : source[key];
  });

  return result;
};

export const normalizeStorefrontContent = (value) => {
  const raw = value?.value && isPlainObject(value.value) ? value.value : value;
  return deepMergeStorefrontContent(DEFAULT_STOREFRONT_CONTENT, raw || {});
};

export const getEnabledLinks = (items = []) =>
  (Array.isArray(items) ? items : []).filter((item) => item?.enabled !== false);

export const normalizePhoneDigits = (value = "") =>
  String(value || "").replace(/[^\d]/g, "");

export const buildContactHelpers = (contact = DEFAULT_STOREFRONT_CONTENT.contact) => {
  const phone = contact.phone || DEFAULT_STOREFRONT_CONTENT.contact.phone;
  const email = contact.email || DEFAULT_STOREFRONT_CONTENT.contact.email;
  const whatsapp = contact.whatsapp || phone;
  const whatsappNumber = normalizePhoneDigits(whatsapp);

  return {
    phone,
    email,
    whatsapp,
    whatsappNumber,
    phoneHref: `tel:+${normalizePhoneDigits(phone)}`,
    mailtoHref: (subject = "") =>
      `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`,
    whatsappHref: (message = "") =>
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message || contact.whatsappActions?.[0]?.message || "Hi Ananya Boutique",
      )}`,
  };
};
