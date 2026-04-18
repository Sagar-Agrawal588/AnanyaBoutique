const toTrimmedString = (value, maxLength = 500) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const toBooleanWithFallback = (value, fallback = true) => {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return fallback;
};

const toStringList = (value, { limit = 8, maxLength = 240 } = {}) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => toTrimmedString(entry, maxLength))
    .filter(Boolean)
    .slice(0, limit);
};

const toCards = (value, { limit = 4 } = {}) => {
  if (!Array.isArray(value)) return [];

  return value.slice(0, limit).map((card) => ({
    label: toTrimmedString(card?.label, 80),
    value: toTrimmedString(card?.value, 120),
    helper: toTrimmedString(card?.helper, 220),
  }));
};

export const normalizeProductPageConfig = (value = {}) => {
  const source = value && typeof value === "object" ? value : {};

  return {
    hero: {
      showStoryCard: toBooleanWithFallback(
        source?.hero?.showStoryCard,
        true,
      ),
      showInsightCards: toBooleanWithFallback(
        source?.hero?.showInsightCards,
        true,
      ),
      showDeliveryPreview: toBooleanWithFallback(
        source?.hero?.showDeliveryPreview,
        true,
      ),
      storyEyebrow: toTrimmedString(source?.hero?.storyEyebrow, 80),
      storyTitle: toTrimmedString(source?.hero?.storyTitle, 180),
      storyDescription: toTrimmedString(source?.hero?.storyDescription, 360),
      priceCardEyebrow: toTrimmedString(source?.hero?.priceCardEyebrow, 80),
      priceCardDescription: toTrimmedString(
        source?.hero?.priceCardDescription,
        220,
      ),
      variantCardEyebrow: toTrimmedString(
        source?.hero?.variantCardEyebrow,
        80,
      ),
      variantCardDescription: toTrimmedString(
        source?.hero?.variantCardDescription,
        220,
      ),
      socialProofEyebrow: toTrimmedString(
        source?.hero?.socialProofEyebrow,
        80,
      ),
      socialProofDescription: toTrimmedString(
        source?.hero?.socialProofDescription,
        220,
      ),
    },
    tabs: {
      showDescription: toBooleanWithFallback(
        source?.tabs?.showDescription,
        true,
      ),
      descriptionLabel:
        toTrimmedString(source?.tabs?.descriptionLabel, 60) || "Description",
      showDetails: toBooleanWithFallback(source?.tabs?.showDetails, true),
      detailsLabel:
        toTrimmedString(source?.tabs?.detailsLabel, 60) || "Product Details",
      showShipping: toBooleanWithFallback(source?.tabs?.showShipping, true),
      shippingLabel:
        toTrimmedString(source?.tabs?.shippingLabel, 60) || "Shipping & Trust",
    },
    descriptionSection: {
      show: toBooleanWithFallback(source?.descriptionSection?.show, true),
      showEditorialBanner: toBooleanWithFallback(
        source?.descriptionSection?.showEditorialBanner,
        true,
      ),
      showDescriptionFlow: toBooleanWithFallback(
        source?.descriptionSection?.showDescriptionFlow,
        true,
      ),
      editorialEyebrow: toTrimmedString(
        source?.descriptionSection?.editorialEyebrow,
        80,
      ),
      editorialTitle: toTrimmedString(
        source?.descriptionSection?.editorialTitle,
        180,
      ),
      editorialDescription: toTrimmedString(
        source?.descriptionSection?.editorialDescription,
        360,
      ),
      flowEyebrow: toTrimmedString(
        source?.descriptionSection?.flowEyebrow,
        80,
      ),
      extraParagraphs: toStringList(
        source?.descriptionSection?.extraParagraphs,
        {
          limit: 6,
          maxLength: 500,
        },
      ),
    },
    detailsSection: {
      show: toBooleanWithFallback(source?.detailsSection?.show, true),
      showCards: toBooleanWithFallback(
        source?.detailsSection?.showCards,
        true,
      ),
      showSnapshot: toBooleanWithFallback(
        source?.detailsSection?.showSnapshot,
        true,
      ),
      cards: toCards(source?.detailsSection?.cards),
      snapshotEyebrow: toTrimmedString(
        source?.detailsSection?.snapshotEyebrow,
        80,
      ),
      snapshotItems: toStringList(source?.detailsSection?.snapshotItems, {
        limit: 8,
        maxLength: 240,
      }),
    },
    shippingSection: {
      show: toBooleanWithFallback(source?.shippingSection?.show, true),
      showPoints: toBooleanWithFallback(
        source?.shippingSection?.showPoints,
        true,
      ),
      showReasonsPanel: toBooleanWithFallback(
        source?.shippingSection?.showReasonsPanel,
        true,
      ),
      pointsEyebrow: toTrimmedString(
        source?.shippingSection?.pointsEyebrow,
        80,
      ),
      points: toStringList(source?.shippingSection?.points, {
        limit: 8,
        maxLength: 240,
      }),
      reasonsEyebrow: toTrimmedString(
        source?.shippingSection?.reasonsEyebrow,
        80,
      ),
      reasonsParagraphs: toStringList(
        source?.shippingSection?.reasonsParagraphs,
        {
          limit: 6,
          maxLength: 280,
        },
      ),
    },
    reviewsSection: {
      show: toBooleanWithFallback(source?.reviewsSection?.show, true),
      eyebrow: toTrimmedString(source?.reviewsSection?.eyebrow, 80),
      title: toTrimmedString(source?.reviewsSection?.title, 180),
      emptyState: toTrimmedString(source?.reviewsSection?.emptyState, 280),
    },
    frequentlyBoughtSection: {
      show: toBooleanWithFallback(
        source?.frequentlyBoughtSection?.show,
        true,
      ),
      eyebrow: toTrimmedString(
        source?.frequentlyBoughtSection?.eyebrow,
        80,
      ),
      title: toTrimmedString(source?.frequentlyBoughtSection?.title, 180),
      buttonText: toTrimmedString(
        source?.frequentlyBoughtSection?.buttonText,
        60,
      ),
      emptyState: toTrimmedString(
        source?.frequentlyBoughtSection?.emptyState,
        220,
      ),
    },
    recommendedCombosSection: {
      show: toBooleanWithFallback(
        source?.recommendedCombosSection?.show,
        true,
      ),
      eyebrow: toTrimmedString(
        source?.recommendedCombosSection?.eyebrow,
        80,
      ),
      title: toTrimmedString(source?.recommendedCombosSection?.title, 180),
      linkText: toTrimmedString(
        source?.recommendedCombosSection?.linkText,
        60,
      ),
      emptyState: toTrimmedString(
        source?.recommendedCombosSection?.emptyState,
        220,
      ),
    },
    relatedProductsSection: {
      show: toBooleanWithFallback(
        source?.relatedProductsSection?.show,
        true,
      ),
      eyebrow: toTrimmedString(source?.relatedProductsSection?.eyebrow, 80),
      title: toTrimmedString(source?.relatedProductsSection?.title, 180),
      emptyState: toTrimmedString(
        source?.relatedProductsSection?.emptyState,
        220,
      ),
    },
  };
};
