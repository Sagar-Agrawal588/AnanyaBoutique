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
        label: toTrimmedString(card?.label),
        value: toTrimmedString(card?.value),
        helper: toTrimmedString(card?.helper),
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
      flowEyebrow: toTrimmedString(source?.descriptionSection?.flowEyebrow),
      extraParagraphs: toStringList(source?.descriptionSection?.extraParagraphs),
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
      snapshotEyebrow: toTrimmedString(source?.detailsSection?.snapshotEyebrow),
      snapshotItems: toStringList(source?.detailsSection?.snapshotItems),
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
      eyebrow: toTrimmedString(source?.reviewsSection?.eyebrow),
      title: toTrimmedString(source?.reviewsSection?.title),
      emptyState: toTrimmedString(source?.reviewsSection?.emptyState),
    },
    frequentlyBoughtSection: {
      show: toBooleanWithFallback(
        source?.frequentlyBoughtSection?.show,
        true,
      ),
      eyebrow: toTrimmedString(source?.frequentlyBoughtSection?.eyebrow),
      title: toTrimmedString(source?.frequentlyBoughtSection?.title),
      buttonText: toTrimmedString(source?.frequentlyBoughtSection?.buttonText),
      emptyState: toTrimmedString(
        source?.frequentlyBoughtSection?.emptyState,
      ),
    },
    recommendedCombosSection: {
      show: toBooleanWithFallback(
        source?.recommendedCombosSection?.show,
        true,
      ),
      eyebrow: toTrimmedString(source?.recommendedCombosSection?.eyebrow),
      title: toTrimmedString(source?.recommendedCombosSection?.title),
      linkText: toTrimmedString(source?.recommendedCombosSection?.linkText),
      emptyState: toTrimmedString(
        source?.recommendedCombosSection?.emptyState,
      ),
    },
    relatedProductsSection: {
      show: toBooleanWithFallback(
        source?.relatedProductsSection?.show,
        true,
      ),
      eyebrow: toTrimmedString(source?.relatedProductsSection?.eyebrow),
      title: toTrimmedString(source?.relatedProductsSection?.title),
      emptyState: toTrimmedString(source?.relatedProductsSection?.emptyState),
    },
  };
};

export const mergeTextOverride = (overrideValue, fallbackValue) =>
  toTrimmedString(overrideValue) || fallbackValue;

export const mergeCardsWithDefaults = (defaultCards = [], overrideCards = []) =>
  defaultCards.map((card, index) => {
    const override = overrideCards[index] || {};
    return {
      label: mergeTextOverride(override.label, card.label),
      value: mergeTextOverride(override.value, card.value),
      helper: mergeTextOverride(override.helper, card.helper),
    };
  });

export const mergeListWithDefaults = (overrideItems = [], fallbackItems = []) =>
  overrideItems.length > 0 ? overrideItems : fallbackItems;
