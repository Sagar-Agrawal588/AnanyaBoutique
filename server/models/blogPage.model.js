import mongoose from "mongoose";

/**
 * BlogPage Schema
 * Stores the Blogs landing page configuration (theme/layout/visibility) - editable by admin
 */
const blogPageSchema = new mongoose.Schema(
  {
    theme: {
      style: {
        type: String,
        default: "mint",
      },
      layout: {
        type: String,
        default: "magazine",
      },
    },
    sections: {
      hero: { type: Boolean, default: true },
      featured: { type: Boolean, default: true },
      grid: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true },
    },
    hero: {
      badge: {
        type: String,
        default: "Style Journal",
      },
      title: {
        type: String,
        default: "The Journal",
      },
      description: {
        type: String,
        default:
          "Styling notes, collection updates, and boutique guidance for everyday and occasion-ready looks.",
      },
    },
    newsletter: {
      title: {
        type: String,
        default: "Don't Miss Our Latest Articles",
      },
      description: {
        type: String,
        default:
          "Subscribe to get styling notes, collection updates, and boutique offers delivered to your inbox.",
      },
      inputPlaceholder: {
        type: String,
        default: "Enter your email address",
      },
      buttonText: {
        type: String,
        default: "Subscribe",
      },
      note: {
        type: String,
        default: "We respect your privacy. Unsubscribe at any time.",
      },
    },
    article: {
      bannerStartColor: {
        type: String,
        default: "#f97316",
      },
      bannerEndColor: {
        type: String,
        default: "#ec4899",
      },
      fontFamily: {
        type: String,
        default: "modern-sans",
      },
    },
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

blogPageSchema.statics.getDefaultContent = function () {
  return {
    theme: { style: "mint", layout: "magazine" },
    sections: {
      hero: true,
      featured: true,
      grid: true,
      newsletter: true,
    },
    hero: {
      badge: "Style Journal",
      title: "The Journal",
      description:
        "Styling notes, collection updates, and boutique guidance for everyday and occasion-ready looks.",
    },
    newsletter: {
      title: "Don't Miss Our Latest Articles",
      description:
        "Subscribe to get styling notes, collection updates, and boutique offers delivered to your inbox.",
      inputPlaceholder: "Enter your email address",
      buttonText: "Subscribe",
      note: "We respect your privacy. Unsubscribe at any time.",
    },
    article: {
      bannerStartColor: "#f97316",
      bannerEndColor: "#ec4899",
      fontFamily: "modern-sans",
    },
  };
};

const BlogPageModel = mongoose.model("BlogPage", blogPageSchema);

export default BlogPageModel;

