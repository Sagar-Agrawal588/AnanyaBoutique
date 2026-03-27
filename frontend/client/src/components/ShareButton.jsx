"use client";

import {
  copyProductDetailsToClipboard,
  copyToClipboard,
  shareToSocialMedia,
  shareViaNative,
} from "@/utils/shareUtils";
import { useState } from "react";
import {
  FaFacebookF,
  FaFacebookMessenger,
  FaLink,
  FaLinkedinIn,
  FaRedditAlien,
  FaPinterestP,
  FaSms,
  FaSkype,
  FaTelegramPlane,
  FaWhatsapp,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoClose, IoShareSocial } from "react-icons/io5";
import { MdCheck, MdContentCopy, MdEmail, MdOutlineIosShare } from "react-icons/md";

const SOCIAL_PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: FaFacebookF,
    bgColor: "bg-[#1877f2]",
  },
  {
    key: "twitter",
    label: "X",
    icon: FaXTwitter,
    bgColor: "bg-black",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: FaWhatsapp,
    bgColor: "bg-[#25d366]",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: FaLinkedinIn,
    bgColor: "bg-[#0a66c2]",
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: FaTelegramPlane,
    bgColor: "bg-[#229ed9]",
  },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: FaPinterestP,
    bgColor: "bg-[#e60023]",
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: FaRedditAlien,
    bgColor: "bg-orange-600",
  },
  {
    key: "email",
    label: "Email",
    icon: MdEmail,
    bgColor: "bg-gray-600",
  },
  {
    key: "sms",
    label: "SMS",
    icon: FaSms,
    bgColor: "bg-indigo-600",
  },
  {
    key: "skype",
    label: "Skype",
    icon: FaSkype,
    bgColor: "bg-sky-600",
  },
  {
    key: "messenger",
    label: "Messenger",
    icon: FaFacebookMessenger,
    bgColor: "bg-blue-500",
  },
];

const ShareButton = ({
  productId,
  productName = "Product",
  productDetails,
  className = "",
  showLabel = false,
  variant = "icon",
  iconSizeClass = "h-11 w-11",
  iconGlyphClass = "h-5 w-5",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);

  const resolvedDetails = {
    productId,
    productName,
    ...(productDetails || {}),
  };

  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleShare = (platform) => {
    if (platform === "messenger") {
      shareToSocialMedia("facebook", productId, productName);
      setIsOpen(false);
      return;
    }
    shareToSocialMedia(platform, productId, productName);
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(productId, productName);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyDetails = async () => {
    const success = await copyProductDetailsToClipboard(resolvedDetails);
    if (success) {
      setCopiedDetails(true);
      setTimeout(() => setCopiedDetails(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    const result = await shareViaNative(resolvedDetails);
    if (result?.ok) {
      setIsOpen(false);
    }
  };

  const productPrice =
    typeof resolvedDetails.price === "number"
      ? `Rs ${resolvedDetails.price}`
      : null;

  const renderTrigger = () => {
    if (variant === "button") {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="group inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-[0_12px_28px_-20px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
          title="Share product"
        >
          <IoShareSocial className="h-5 w-5 text-slate-600 transition group-hover:rotate-6" />
          {showLabel ? "Share & Copy" : null}
        </button>
      );
    }

    if (variant === "compact") {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="group rounded-full border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          title="Share product"
        >
          <IoShareSocial className="h-5 w-5 transition group-hover:rotate-6" />
        </button>
      );
    }

    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`group relative ${iconSizeClass} rounded-full bg-white/95 p-0 text-slate-700 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.58)] ring-1 ring-slate-200/90 transition hover:-translate-y-0.5 hover:bg-white`}
        title="Share product"
      >
        <span className="absolute inset-0 rounded-full bg-linear-to-br from-slate-50 to-white" />
        <IoShareSocial className={`relative mx-auto ${iconGlyphClass} transition group-hover:rotate-6`} />
      </button>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {renderTrigger()}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-3 bottom-3 z-50 mx-auto w-auto max-w-155 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_45px_90px_-44px_rgba(15,23,42,0.6)] backdrop-blur-xl sm:inset-auto sm:right-4 sm:top-20 sm:w-155 sm:bottom-auto">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Share Product
                </p>
                <h3 className="mt-1 text-lg font-semibold leading-tight text-slate-900">
                  {productName}
                </h3>
                {productPrice ? (
                  <p className="text-sm text-slate-500">{productPrice}</p>
                ) : null}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                title="Close"
              >
                <IoClose className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {hasNativeShare ? (
                <button
                  onClick={handleNativeShare}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-cyan-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:from-blue-100 hover:to-cyan-100"
                >
                  <MdOutlineIosShare className="h-5 w-5" />
                  Share To Apps
                </button>
              ) : null}

              <button
                onClick={handleCopyLink}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  copiedLink
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {copiedLink ? <MdCheck className="h-5 w-5" /> : <FaLink className="h-4 w-4" />}
                {copiedLink ? "Link Copied" : "Copy Link"}
              </button>

              <button
                onClick={handleCopyDetails}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  copiedDetails
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {copiedDetails ? <MdCheck className="h-5 w-5" /> : <MdContentCopy className="h-5 w-5" />}
                {copiedDetails ? "Details Copied" : "Copy Details"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-linear-to-b from-slate-50 to-white p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Share On Platforms
              </div>

              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, bgColor }) => (
                  <button
                    key={key}
                    onClick={() => handleShare(key)}
                    className="group flex flex-col items-center gap-1.5 rounded-xl border border-transparent p-2 transition hover:border-slate-200 hover:bg-white"
                    title={`Share on ${label}`}
                  >
                    <span className={`${bgColor} inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.7)]`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="line-clamp-1 text-[11px] font-medium text-slate-600 group-hover:text-slate-800">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareButton;
