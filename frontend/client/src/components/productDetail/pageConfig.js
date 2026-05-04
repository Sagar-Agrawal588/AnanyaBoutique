const toTrimmedString = (value) => String(value || "").trim();

const toBooleanWithFallback = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

const toStringList = (value) =>
  Array.isArray(value)
    ? value.map((entry) => toTrimmedString(entry)).filter(Boolean)
    : [];

const toCards = (value) =>
  Array.isArray(value)
    ? value.map((card) => ({
      }))
    : [];

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
      storyEyebrow: toTrimmedString(source?.hero?.storyEyebrow),
      storyTitle: toTrimmedString(source?.hero?.storyTitle),
      storyDescription: toTrimmedString(source?.hero?.storyDescription),
      priceCardEyebrow: toTrimmedString(source?.hero?.priceCardEyebrow),
      priceCardDescription: toTrimmedString(
        source?.hero?.priceCardDescription,
      ),
      variantCardEyebrow: toTrimmedString(source?.hero?.variantCardEyebrow),
      variantCardDescription: toTrimmedString(
        source?.hero?.variantCardDescription,
      ),
      socialProofEyebrow: toTrimmedString(source?.hero?.socialProofEyebrow),
      socialProofDescription: toTrimmedString(
        source?.hero?.socialProofDescription,
      ),
    },
    tabs: {
      showDescription: toBooleanWithFallback(
        source?.tabs?.showDescription,
        true,
      ),
      descriptionLabel: toTrimmedString(source?.tabs?.descriptionLabel),
      showDetails: toBooleanWithFallback(source?.tabs?.showDetails, true),
      detailsLabel: toTrimmedString(source?.tabs?.detailsLabel),
      showShipping: toBooleanWithFallback(source?.tabs?.showShipping, true),
      shippingLabel: toTrimmedString(source?.tabs?.shippingLabel),
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
      ),
      editorialTitle: toTrimmedString(
        source?.descriptionSection?.editorialTitle,
      ),
      editorialDescription: toTrimmedString(
        source?.descriptionSection?.editorialDescription,
      ),
      featuredBannerImage: toTrimmedString(
        source?.descriptionSection?.featuredBannerImage,
      ),
      showFeaturedBannerImage: toBooleanWithFallback(
        source?.descriptionSection?.showFeaturedBannerImage,
        true,
      ),
      flowEyebrow: toTrimmedString(source?.descriptionSection?.flowEyebrow),
      extraParagraphs: toStringList(source?.descriptionSection?.extraParagraphs),
    },
    detailsSection: {
      show: toBooleanWithFallback(source?.detailsSection?.show, true),
      showCards: toBooleanWithFallback(
        source?.detailsSection?.showCards,
        true,
      ),
      cards: toCards(source?.detailsSection?.cards),
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
      pointsEyebrow: toTrimmedString(source?.shippingSection?.pointsEyebrow),
      points: toStringList(source?.shippingSection?.points),
      reasonsEyebrow: toTrimmedString(
        source?.shippingSection?.reasonsEyebrow,
      ),
      reasonsParagraphs: toStringList(source?.shippingSection?.reasonsParagraphs),
    },
    reviewsSection: {
      show: toBooleanWithFallback(source?.reviewsSection?.show, true),
    },
    frequentlyBoughtSection: {
      show: toBooleanWithFallback(
        source?.frequentlyBoughtSection?.show,
        true,
      ),
      emptyState: "",
    },
    recommendedCombosSection: {
      show: toBooleanWithFallback(
        source?.recommendedCombosSection?.show,
        true,
      ),
      emptyState: "",
    },
  };
};

export const mergeTextOverride = (customText, fallbackValue) =>
  toTrimmedString(customText) || fallbackValue;

export const mergeCardCopyWithDefaults = (defaultCards = [], overrideCards = []) =>
  defaultCards.map((card) => ({ ...card }));

export const mergeCardsWithDefaults = mergeCardCopyWithDefaults;

export const mergeListWithDefaults = (overrideItems = [], fallbackItems = []) =>
  overrideItems.length > 0 ? overrideItems : fallbackItems;
