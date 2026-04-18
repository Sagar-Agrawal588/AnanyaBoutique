const DEFAULT_PRODUCT_PAGE_CONFIG = {
  hero: {
    showStoryCard: true,
    showInsightCards: true,
    showDeliveryPreview: true,
    storyEyebrow: "Product Story",
    storyTitle:
      "A sharper product story with the important actions closer to the decision point.",
    storyDescription:
      "The refreshed detail page keeps key content blocks feeling editorial without hiding purchase controls, ratings, or delivery context.",
    priceCardEyebrow: "Price Focus",
    priceCardDescription:
      "Clean, high-contrast pricing with supporting variant context.",
    variantCardEyebrow: "Variant View",
    variantCardDescription:
      "Easy-to-scan options that stay near the CTA block.",
    socialProofEyebrow: "Social Proof",
    socialProofDescription:
      "Reviews move closer to the content shoppers read before buying.",
  },
  tabs: {
    showDescription: true,
    descriptionLabel: "Description",
    showDetails: true,
    detailsLabel: "Product Details",
    showShipping: true,
    shippingLabel: "Shipping & Trust",
  },
  descriptionSection: {
    show: true,
    showEditorialBanner: true,
    showDescriptionFlow: true,
    editorialEyebrow: "Featured Overview",
    editorialTitle:
      "A stronger product story can live right beside the product without overwhelming the transaction.",
    editorialDescription:
      "This section gives longer-form content a more intentional home, helping the product feel more premium while keeping the purchase path above it calm and focused.",
    flowEyebrow: "Description Flow",
    extraParagraphs: [],
  },
  detailsSection: {
    show: true,
    showCards: true,
    showSnapshot: true,
    cards: [
      {
        label: "Category",
        value: "",
        helper: "Live product taxonomy",
      },
      {
        label: "Selected Pack",
        value: "",
        helper: "Variant-aware display",
      },
      {
        label: "Customer Reviews",
        value: "",
        helper: "Visible social proof",
      },
      {
        label: "Availability",
        value: "",
        helper: "Real-time stock signal",
      },
    ],
    snapshotEyebrow: "Snapshot",
    snapshotItems: [],
  },
  shippingSection: {
    show: true,
    showPoints: true,
    showReasonsPanel: true,
    pointsEyebrow: "Shipping & Trust",
    points: [],
    reasonsEyebrow: "Why This Feels Better",
    reasonsParagraphs: [
      "The refreshed structure keeps support information within reach without drowning the buyer in a wall of plain text.",
      "Trust markers, delivery context, and review content now sit in a more natural sequence after the hero instead of feeling detached from the decision point.",
      "The result is a calmer, more premium product page that still stays conversion-focused.",
    ],
  },
  reviewsSection: {
    show: true,
    eyebrow: "Review Section",
    title: "Reviews below the story, closer to the buy decision",
    emptyState:
      "No reviews yet. This upgraded layout is ready for real review content as soon as customer feedback is available.",
  },
  frequentlyBoughtSection: {
    show: true,
    eyebrow: "Frequently Bought Together",
    title: "Helpful add-ons close to the primary product",
    buttonText: "Add All To Cart",
    emptyState: "No suggestions available yet.",
  },
  recommendedCombosSection: {
    show: true,
    eyebrow: "Recommended Combos",
    title: "Bundle options that support the same buying flow",
    linkText: "View all combos",
    emptyState: "No recommended combos available right now.",
  },
  relatedProductsSection: {
    show: true,
    eyebrow: "Related Products",
    title: "More products in the same browsing mood",
    emptyState: "No related products available right now.",
  },
};

const cloneConfig = (value) => JSON.parse(JSON.stringify(value));

const mergeCards = (overrides = []) =>
  DEFAULT_PRODUCT_PAGE_CONFIG.detailsSection.cards.map((card, index) => ({
    ...card,
    ...(Array.isArray(overrides) ? overrides[index] || {} : {}),
  }));

export const createDefaultProductPageConfig = () =>
  cloneConfig(DEFAULT_PRODUCT_PAGE_CONFIG);

export const mergeProductPageConfig = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};
  const defaults = createDefaultProductPageConfig();

  return {
    ...defaults,
    hero: {
      ...defaults.hero,
      ...(source.hero || {}),
    },
    tabs: {
      ...defaults.tabs,
      ...(source.tabs || {}),
    },
    descriptionSection: {
      ...defaults.descriptionSection,
      ...(source.descriptionSection || {}),
      extraParagraphs: Array.isArray(source?.descriptionSection?.extraParagraphs)
        ? source.descriptionSection.extraParagraphs
        : defaults.descriptionSection.extraParagraphs,
    },
    detailsSection: {
      ...defaults.detailsSection,
      ...(source.detailsSection || {}),
      cards: mergeCards(source?.detailsSection?.cards),
      snapshotItems: Array.isArray(source?.detailsSection?.snapshotItems)
        ? source.detailsSection.snapshotItems
        : defaults.detailsSection.snapshotItems,
    },
    shippingSection: {
      ...defaults.shippingSection,
      ...(source.shippingSection || {}),
      points: Array.isArray(source?.shippingSection?.points)
        ? source.shippingSection.points
        : defaults.shippingSection.points,
      reasonsParagraphs: Array.isArray(
        source?.shippingSection?.reasonsParagraphs,
      )
        ? source.shippingSection.reasonsParagraphs
        : defaults.shippingSection.reasonsParagraphs,
    },
    reviewsSection: {
      ...defaults.reviewsSection,
      ...(source.reviewsSection || {}),
    },
    frequentlyBoughtSection: {
      ...defaults.frequentlyBoughtSection,
      ...(source.frequentlyBoughtSection || {}),
    },
    recommendedCombosSection: {
      ...defaults.recommendedCombosSection,
      ...(source.recommendedCombosSection || {}),
    },
    relatedProductsSection: {
      ...defaults.relatedProductsSection,
      ...(source.relatedProductsSection || {}),
    },
  };
};
