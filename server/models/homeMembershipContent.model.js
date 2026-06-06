import mongoose from "mongoose";

/**
 * HomeMembershipContent Schema
 * Stores the Home page membership section content - fully editable by admin
 * Separate from MembershipPage (the dedicated /membership landing page)
 */
const homeMembershipContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Join Our Ananya Boutique Club",
    },
    subtitle: {
      type: String,
      default:
        "Unlock early access, member-only offers, styling notes, and boutique rewards.",
    },
    benefits: [
      {
        emoji: { type: String, default: "VIP" },
        title: { type: String, default: "Member Savings" },
        description: { type: String, default: "Exclusive boutique offers" },
      },
    ],
    checkItems: [
      {
        text: { type: String, default: "" },
      },
    ],
    ctaButtonText: {
      type: String,
      default: "Explore Plans",
    },
    ctaButtonLink: {
      type: String,
      default: "/membership",
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

homeMembershipContentSchema.statics.getDefaultContent = function () {
  return {
    title: "Join Our Ananya Boutique Club",
    subtitle:
      "Unlock early access, member-only offers, styling notes, and boutique rewards.",
    benefits: [
      {
        emoji: "VIP",
        title: "Member Savings",
        description: "Exclusive boutique offers",
      },
      {
        emoji: "SHIP",
        title: "Free Shipping",
        description: "On all your orders",
      },
      {
        emoji: "CARE",
        title: "24/7 Support",
        description: "Priority styling and order help",
      },
      {
        emoji: "DROP",
        title: "Early Access",
        description: "To new arrivals and festive edits",
      },
    ],
    checkItems: [
      { text: "15% discount on all orders" },
      { text: "Free shipping on every purchase" },
      { text: "Exclusive member-only drops" },
      { text: "Priority customer support" },
      { text: "Styling notes and new collection previews" },
    ],
    ctaButtonText: "Explore Plans",
    ctaButtonLink: "/membership",
  };
};

const HomeMembershipContentModel = mongoose.model(
  "HomeMembershipContent",
  homeMembershipContentSchema,
);

export default HomeMembershipContentModel;
