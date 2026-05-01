"use client";

import Switch from "@mui/material/Switch";

const sectionCardClass = "rounded-xl border border-gray-200 bg-gray-50 p-5";
const inputClass =
  "w-full h-[40px] rounded-md border border-[rgba(0,0,0,0.2)] bg-white px-3 text-[14px] outline-none focus:border-blue-500";
const textAreaClass =
  "w-full rounded-md border border-[rgba(0,0,0,0.2)] bg-white px-3 py-3 text-[14px] outline-none focus:border-blue-500";

const ToggleField = ({ label, checked, onChange, hint }) => (
  <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
      </div>
      <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </div>
  </div>
);

const TextField = ({ label, value, onChange, placeholder }) => (
  <label className="flex flex-col gap-1">
    <span className="text-sm font-medium text-gray-800">{label}</span>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  </label>
);

const TextAreaField = ({ label, value, onChange, placeholder, rows = 3, hint }) => (
  <label className="flex flex-col gap-1">
    <span className="text-sm font-medium text-gray-800">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={textAreaClass}
    />
    {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
  </label>
);

const toLines = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join("\n") : "";

const fromLines = (value) =>
  String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export default function ProductPageSettingsSection({
  productPage,
  setProductPage,
  pageTitle = "Storefront Product Page",
  storefrontPath = "/product/[id]",
  entityLabel = "product",
  lowerSectionLabel = "product",
}) {
  const updateSectionField = (section, field, nextValue) => {
    setProductPage((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: nextValue,
      },
    }));
  };

  const updateCardField = (index, field, nextValue) => {
    setProductPage((current) => {
      const nextCards = [...current.detailsSection.cards];
      nextCards[index] = {
        ...nextCards[index],
        [field]: nextValue,
      };

      return {
        ...current,
        detailsSection: {
          ...current.detailsSection,
          cards: nextCards,
        },
      };
    });
  };

  return (
    <div className="mt-8 space-y-5">
      <div>
        <h3 className="text-[18px] font-semibold text-gray-800">
          {pageTitle}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Control the copy and visibility of the live `{storefrontPath}` page
          from admin. Empty fields keep the default storefront behavior.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Changes here update the real client {entityLabel} page layout,
        including the review section shown below the {lowerSectionLabel}{" "}
        details.
      </div>

      <div className={sectionCardClass}>
        <div className="mb-4">
          <h4 className="text-[16px] font-semibold text-gray-800">
            Hero And Top Blocks
          </h4>
          <p className="text-sm text-gray-500">
            Manage the story card, highlight cards, and delivery preview near
            the buy box.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ToggleField
            label="Show Story Card"
            checked={productPage.hero.showStoryCard}
            onChange={(nextValue) =>
              updateSectionField("hero", "showStoryCard", nextValue)
            }
          />
          <ToggleField
            label="Show Insight Cards"
            checked={productPage.hero.showInsightCards}
            onChange={(nextValue) =>
              updateSectionField("hero", "showInsightCards", nextValue)
            }
          />
          <ToggleField
            label="Show Delivery Preview"
            checked={productPage.hero.showDeliveryPreview}
            onChange={(nextValue) =>
              updateSectionField("hero", "showDeliveryPreview", nextValue)
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TextField
            label="Story Eyebrow"
            value={productPage.hero.storyEyebrow}
            onChange={(nextValue) =>
              updateSectionField("hero", "storyEyebrow", nextValue)
            }
          />
          <TextField
            label="Story Title"
            value={productPage.hero.storyTitle}
            onChange={(nextValue) =>
              updateSectionField("hero", "storyTitle", nextValue)
            }
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Story Description"
            value={productPage.hero.storyDescription}
            onChange={(nextValue) =>
              updateSectionField("hero", "storyDescription", nextValue)
            }
            rows={3}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <TextField
              label="Price Card Eyebrow"
              value={productPage.hero.priceCardEyebrow}
              onChange={(nextValue) =>
                updateSectionField("hero", "priceCardEyebrow", nextValue)
              }
            />
            <TextAreaField
              label="Price Card Description"
              value={productPage.hero.priceCardDescription}
              onChange={(nextValue) =>
                updateSectionField("hero", "priceCardDescription", nextValue)
              }
              rows={3}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <TextField
              label="Variant Card Eyebrow"
              value={productPage.hero.variantCardEyebrow}
              onChange={(nextValue) =>
                updateSectionField("hero", "variantCardEyebrow", nextValue)
              }
            />
            <TextAreaField
              label="Variant Card Description"
              value={productPage.hero.variantCardDescription}
              onChange={(nextValue) =>
                updateSectionField("hero", "variantCardDescription", nextValue)
              }
              rows={3}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <TextField
              label="Social Proof Eyebrow"
              value={productPage.hero.socialProofEyebrow}
              onChange={(nextValue) =>
                updateSectionField("hero", "socialProofEyebrow", nextValue)
              }
            />
            <TextAreaField
              label="Social Proof Description"
              value={productPage.hero.socialProofDescription}
              onChange={(nextValue) =>
                updateSectionField(
                  "hero",
                  "socialProofDescription",
                  nextValue,
                )
              }
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className={sectionCardClass}>
        <div className="mb-4">
          <h4 className="text-[16px] font-semibold text-gray-800">
            Tabs And Description Section
          </h4>
          <p className="text-sm text-gray-500">
            Configure tab labels plus the editorial banner and extra description
            paragraphs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Description Tab"
              checked={productPage.tabs.showDescription}
              onChange={(nextValue) =>
                updateSectionField("tabs", "showDescription", nextValue)
              }
            />
            <TextField
              label="Description Tab Label"
              value={productPage.tabs.descriptionLabel}
              onChange={(nextValue) =>
                updateSectionField("tabs", "descriptionLabel", nextValue)
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Details Tab"
              checked={productPage.tabs.showDetails}
              onChange={(nextValue) =>
                updateSectionField("tabs", "showDetails", nextValue)
              }
            />
            <TextField
              label="Details Tab Label"
              value={productPage.tabs.detailsLabel}
              onChange={(nextValue) =>
                updateSectionField("tabs", "detailsLabel", nextValue)
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Shipping Tab"
              checked={productPage.tabs.showShipping}
              onChange={(nextValue) =>
                updateSectionField("tabs", "showShipping", nextValue)
              }
            />
            <TextField
              label="Shipping Tab Label"
              value={productPage.tabs.shippingLabel}
              onChange={(nextValue) =>
                updateSectionField("tabs", "shippingLabel", nextValue)
              }
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <ToggleField
            label="Show Description Section"
            checked={productPage.descriptionSection.show}
            onChange={(nextValue) =>
              updateSectionField("descriptionSection", "show", nextValue)
            }
          />
          <ToggleField
            label="Show Editorial Banner"
            checked={productPage.descriptionSection.showEditorialBanner}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "showEditorialBanner",
                nextValue,
              )
            }
          />
          <ToggleField
            label="Show Description Flow"
            checked={productPage.descriptionSection.showDescriptionFlow}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "showDescriptionFlow",
                nextValue,
              )
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TextField
            label="Editorial Banner Eyebrow"
            value={productPage.descriptionSection.editorialEyebrow}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "editorialEyebrow",
                nextValue,
              )
            }
          />
          <TextField
            label="Editorial Banner Title"
            value={productPage.descriptionSection.editorialTitle}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "editorialTitle",
                nextValue,
              )
            }
          />
        </div>

        <div className="mt-4">
          <TextAreaField
            label="Editorial Banner Description"
            value={productPage.descriptionSection.editorialDescription}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "editorialDescription",
                nextValue,
              )
            }
            rows={3}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TextField
            label="Description Flow Eyebrow"
            value={productPage.descriptionSection.flowEyebrow}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "flowEyebrow",
                nextValue,
              )
            }
          />
          <TextAreaField
            label="Extra Description Paragraphs"
            value={toLines(productPage.descriptionSection.extraParagraphs)}
            onChange={(nextValue) =>
              updateSectionField(
                "descriptionSection",
                "extraParagraphs",
                fromLines(nextValue),
              )
            }
            rows={6}
            hint="One paragraph per line. Leave blank to use the default generated copy."
          />
        </div>
      </div>

      <div className={sectionCardClass}>
        <div className="mb-4">
          <h4 className="text-[16px] font-semibold text-gray-800">
            Details And Shipping
          </h4>
          <p className="text-sm text-gray-500">
            Adjust cards, snapshot bullets, shipping points, and the supporting
            explanation panel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ToggleField
            label="Show Details Section"
            checked={productPage.detailsSection.show}
            onChange={(nextValue) =>
              updateSectionField("detailsSection", "show", nextValue)
            }
          />
          <ToggleField
            label="Show Detail Cards"
            checked={productPage.detailsSection.showCards}
            onChange={(nextValue) =>
              updateSectionField("detailsSection", "showCards", nextValue)
            }
          />
          <ToggleField
            label="Show Snapshot Panel"
            checked={productPage.detailsSection.showSnapshot}
            onChange={(nextValue) =>
              updateSectionField("detailsSection", "showSnapshot", nextValue)
            }
          />
        </div>

        <div className="mt-5">
          <TextField
            label="Snapshot Eyebrow"
            value={productPage.detailsSection.snapshotEyebrow}
            onChange={(nextValue) =>
              updateSectionField("detailsSection", "snapshotEyebrow", nextValue)
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            {productPage.detailsSection.cards.map((card, index) => (
              <div
                key={`detail-card-${index}`}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <p className="text-sm font-semibold text-gray-800">
                  Detail Card {index + 1}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <TextField
                    label="Label"
                    value={card.label}
                    onChange={(nextValue) =>
                      updateCardField(index, "label", nextValue)
                    }
                  />
                  <TextField
                    label="Value Override"
                    value={card.value}
                    onChange={(nextValue) =>
                      updateCardField(index, "value", nextValue)
                    }
                    placeholder="Leave blank to use live product data"
                  />
                  <TextAreaField
                    label="Helper Text"
                    value={card.helper}
                    onChange={(nextValue) =>
                      updateCardField(index, "helper", nextValue)
                    }
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <TextAreaField
            label="Snapshot Items"
            value={toLines(productPage.detailsSection.snapshotItems)}
            onChange={(nextValue) =>
              updateSectionField(
                "detailsSection",
                "snapshotItems",
                fromLines(nextValue),
              )
            }
            rows={12}
            hint="One bullet per line. Leave blank to use the default snapshot list."
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <ToggleField
            label="Show Shipping Section"
            checked={productPage.shippingSection.show}
            onChange={(nextValue) =>
              updateSectionField("shippingSection", "show", nextValue)
            }
          />
          <ToggleField
            label="Show Shipping Points"
            checked={productPage.shippingSection.showPoints}
            onChange={(nextValue) =>
              updateSectionField("shippingSection", "showPoints", nextValue)
            }
          />
          <ToggleField
            label="Show Reasons Panel"
            checked={productPage.shippingSection.showReasonsPanel}
            onChange={(nextValue) =>
              updateSectionField("shippingSection", "showReasonsPanel", nextValue)
            }
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <TextField
              label="Shipping Points Eyebrow"
              value={productPage.shippingSection.pointsEyebrow}
              onChange={(nextValue) =>
                updateSectionField("shippingSection", "pointsEyebrow", nextValue)
              }
            />
            <TextAreaField
              label="Shipping Points"
              value={toLines(productPage.shippingSection.points)}
              onChange={(nextValue) =>
                updateSectionField(
                  "shippingSection",
                  "points",
                  fromLines(nextValue),
                )
              }
              rows={6}
              hint="One shipping or trust point per line."
            />
          </div>

          <div className="space-y-4">
            <TextField
              label="Reasons Panel Eyebrow"
              value={productPage.shippingSection.reasonsEyebrow}
              onChange={(nextValue) =>
                updateSectionField(
                  "shippingSection",
                  "reasonsEyebrow",
                  nextValue,
                )
              }
            />
            <TextAreaField
              label="Reasons Panel Paragraphs"
              value={toLines(productPage.shippingSection.reasonsParagraphs)}
              onChange={(nextValue) =>
                updateSectionField(
                  "shippingSection",
                  "reasonsParagraphs",
                  fromLines(nextValue),
                )
              }
              rows={6}
              hint="One paragraph per line."
            />
          </div>
        </div>
      </div>

      <div className={sectionCardClass}>
        <div className="mb-4">
          <h4 className="text-[16px] font-semibold text-gray-800">
            Reviews And Recommendation Sections
          </h4>
          <p className="text-sm text-gray-500">
            Choose which lower sections are visible and adjust their headings,
            empty states, and action labels.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Reviews Below Product"
              checked={productPage.reviewsSection.show}
              onChange={(nextValue) =>
                updateSectionField("reviewsSection", "show", nextValue)
              }
            />
            <TextField
              label="Reviews Eyebrow"
              value={productPage.reviewsSection.eyebrow}
              onChange={(nextValue) =>
                updateSectionField("reviewsSection", "eyebrow", nextValue)
              }
            />
            <TextField
              label="Reviews Title"
              value={productPage.reviewsSection.title}
              onChange={(nextValue) =>
                updateSectionField("reviewsSection", "title", nextValue)
              }
            />
            <TextAreaField
              label="Reviews Empty State"
              value={productPage.reviewsSection.emptyState}
              onChange={(nextValue) =>
                updateSectionField("reviewsSection", "emptyState", nextValue)
              }
              rows={3}
            />
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Frequently Bought Together"
              checked={productPage.frequentlyBoughtSection.show}
              onChange={(nextValue) =>
                updateSectionField(
                  "frequentlyBoughtSection",
                  "show",
                  nextValue,
                )
              }
            />
            <TextField
              label="FBT Eyebrow"
              value={productPage.frequentlyBoughtSection.eyebrow}
              onChange={(nextValue) =>
                updateSectionField(
                  "frequentlyBoughtSection",
                  "eyebrow",
                  nextValue,
                )
              }
            />
            <TextField
              label="FBT Title"
              value={productPage.frequentlyBoughtSection.title}
              onChange={(nextValue) =>
                updateSectionField(
                  "frequentlyBoughtSection",
                  "title",
                  nextValue,
                )
              }
            />
            <TextField
              label="FBT Button Text"
              value={productPage.frequentlyBoughtSection.buttonText}
              onChange={(nextValue) =>
                updateSectionField(
                  "frequentlyBoughtSection",
                  "buttonText",
                  nextValue,
                )
              }
            />
            <TextAreaField
              label="FBT Empty State"
              value={productPage.frequentlyBoughtSection.emptyState}
              onChange={(nextValue) =>
                updateSectionField(
                  "frequentlyBoughtSection",
                  "emptyState",
                  nextValue,
                )
              }
              rows={3}
            />
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Recommended Combos"
              checked={productPage.recommendedCombosSection.show}
              onChange={(nextValue) =>
                updateSectionField(
                  "recommendedCombosSection",
                  "show",
                  nextValue,
                )
              }
            />
            <TextField
              label="Combos Eyebrow"
              value={productPage.recommendedCombosSection.eyebrow}
              onChange={(nextValue) =>
                updateSectionField(
                  "recommendedCombosSection",
                  "eyebrow",
                  nextValue,
                )
              }
            />
            <TextField
              label="Combos Title"
              value={productPage.recommendedCombosSection.title}
              onChange={(nextValue) =>
                updateSectionField(
                  "recommendedCombosSection",
                  "title",
                  nextValue,
                )
              }
            />
            <TextField
              label="Combos Link Text"
              value={productPage.recommendedCombosSection.linkText}
              onChange={(nextValue) =>
                updateSectionField(
                  "recommendedCombosSection",
                  "linkText",
                  nextValue,
                )
              }
            />
            <TextAreaField
              label="Combos Empty State"
              value={productPage.recommendedCombosSection.emptyState}
              onChange={(nextValue) =>
                updateSectionField(
                  "recommendedCombosSection",
                  "emptyState",
                  nextValue,
                )
              }
              rows={3}
            />
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
            <ToggleField
              label="Show Related Products"
              checked={productPage.relatedProductsSection.show}
              onChange={(nextValue) =>
                updateSectionField(
                  "relatedProductsSection",
                  "show",
                  nextValue,
                )
              }
            />
            <TextField
              label="Related Eyebrow"
              value={productPage.relatedProductsSection.eyebrow}
              onChange={(nextValue) =>
                updateSectionField(
                  "relatedProductsSection",
                  "eyebrow",
                  nextValue,
                )
              }
            />
            <TextField
              label="Related Title"
              value={productPage.relatedProductsSection.title}
              onChange={(nextValue) =>
                updateSectionField(
                  "relatedProductsSection",
                  "title",
                  nextValue,
                )
              }
            />
            <TextAreaField
              label="Related Empty State"
              value={productPage.relatedProductsSection.emptyState}
              onChange={(nextValue) =>
                updateSectionField(
                  "relatedProductsSection",
                  "emptyState",
                  nextValue,
                )
              }
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
