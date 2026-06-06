import mongoose from "mongoose";

/**
 * AboutPage Schema
 * Stores the About Us page content - fully editable by admin
 */
const aboutPageSchema = new mongoose.Schema(
  {
    theme: {
      style: {
        type: String,
        default: "mint",
      },
      layout: {
        type: String,
        default: "glass",
      },
    },
    sections: {
      hero: { type: Boolean, default: true },
      standard: { type: Boolean, default: true },
      whyUs: { type: Boolean, default: true },
      values: { type: Boolean, default: true },
      cta: { type: Boolean, default: true },
    },
    // Hero Section
    hero: {
      badge: {
        type: String,
        default: "About Us",
      },
      title: {
        type: String,
        default: "Style without the",
      },
      titleHighlight: {
        type: String,
        default: "noise.",
      },
      description: {
        type: String,
        default:
          "We built Ananya Boutique to answer a simple question: Why is it so hard to find boutique styling that feels clear, wearable, and thoughtfully curated.",
      },
      image: {
        type: String,
        default: "",
      },
    },

    // Our Standard Section
    standard: {
      subtitle: {
        type: String,
        default: "Our Standard",
      },
      title: {
        type: String,
        default: "The Curated Style Philosophy.",
      },
      description: {
        type: String,
        default:
          "The fashion marketplace is crowded with fast trends. We prefer clarity. Ananya Boutique was founded to bridge the gap between curated pieces and everyday style.",
      },
      image: {
        type: String,
        default: "",
      },
      stats: [
        {
          value: { type: String },
          label: { type: String },
        },
      ],
    },

    // Why Us Section
    whyUs: {
      subtitle: {
        type: String,
        default: "Why Choose Us",
      },
      title: {
        type: String,
        default: "What Sets Us Apart",
      },
      features: [
        {
          icon: { type: String },
          title: { type: String },
          description: { type: String },
        },
      ],
    },

    // Values Section
    values: {
      subtitle: {
        type: String,
        default: "Our Values",
      },
      title: {
        type: String,
        default: "What We Stand For",
      },
      items: [
        {
          title: { type: String },
          description: { type: String },
        },
      ],
    },

    // CTA Section
    cta: {
      title: {
        type: String,
        default: "Ready to style your next look?",
      },
      description: {
        type: String,
        default:
          "Join customers who trust Ananya Boutique for thoughtful everyday styling.",
      },
      buttonText: {
        type: String,
        default: "Shop Now",
      },
      buttonLink: {
        type: String,
        default: "/products",
      },
    },

    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Static method to get default content
aboutPageSchema.statics.getDefaultContent = function () {
  return {
    theme: { style: "mint", layout: "glass" },
    sections: {
      hero: true,
      standard: true,
      whyUs: true,
      values: true,
      cta: true,
    },
    hero: {
      badge: "About Us",
      title: "Style without the",
      titleHighlight: "noise.",
      description:
        "We built Ananya Boutique to answer a simple question: Why is it so hard to find boutique styling that feels clear, wearable, and thoughtfully curated.",
      image: "",
    },
    standard: {
      subtitle: "Our Standard",
      title: "The Curated Style Philosophy.",
      description:
        "The fashion marketplace is crowded with fast trends. We prefer clarity. Ananya Boutique was founded to bridge the gap between curated pieces and everyday style.",
      image: "",
      stats: [
        { value: "100%", label: "Curated Pieces" },
        { value: "New", label: "Seasonal Edits" },
        { value: "Easy", label: "Styling" },
        { value: "Care", label: "Checked Quality" },
      ],
    },
    whyUs: {
      subtitle: "Why Choose Us",
      title: "What Sets Us Apart",
      features: [
        {
          icon: "🥜",
          title: "Curated Sourcing",
          description: "Hand-selected boutique pieces from trusted suppliers",
        },
        {
          icon: "🔬",
          title: "Quality Checked",
          description: "Each placeholder collection is reviewed for fit and finish",
        },
        {
          icon: "🌿",
          title: "Clear Styling",
          description: "Simple styling guidance without noisy trend claims",
        },
        {
          icon: "📦",
          title: "Fresh Delivery",
          description: "Packed carefully and shipped directly to you",
        },
      ],
    },
    values: {
      subtitle: "Our Values",
      title: "What We Stand For",
      items: [
        {
          title: "Clarity",
          description:
            "We believe boutique shopping should feel clear, useful, and easy to compare.",
        },
        {
          title: "Quality",
          description: "We never compromise on presentation, fit notes, or collection quality.",
        },
        {
          title: "Style",
          description: "Your everyday confidence is at the heart of everything we do.",
        },
      ],
    },
    cta: {
      title: "Ready to style your next look?",
      description:
        "Join customers who trust Ananya Boutique for thoughtful everyday styling.",
      buttonText: "Shop Now",
      buttonLink: "/products",
    },
  };
};

const AboutPageModel = mongoose.model("AboutPage", aboutPageSchema);

export default AboutPageModel;
