"use client";

import { useState } from "react";
import { IoShareSocial } from "react-icons/io5";
import {
  FaFacebook,
  FaTwitter,
  FaWhatsapp,
  FaLinkedin,
  FaPinterest,
  FaTelegram,
  FaReddit,
  FaLink,
} from "react-icons/fa";
import { MdEmail, MdCheck } from "react-icons/md";
import { shareToSocialMedia, copyToClipboard } from "@/utils/shareUtils";

const SOCIAL_PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: FaFacebook,
    bgColor: "bg-blue-600",
  },
  {
    key: "twitter",
    label: "Twitter",
    icon: FaTwitter,
    bgColor: "bg-blue-400",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: FaWhatsapp,
    bgColor: "bg-green-500",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: FaLinkedin,
    bgColor: "bg-blue-700",
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: FaTelegram,
    bgColor: "bg-blue-500",
  },
  {
    key: "pinterest",
    label: "Pinterest",
    icon: FaPinterest,
    bgColor: "bg-red-600",
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: FaReddit,
    bgColor: "bg-orange-600",
  },
  {
    key: "email",
    label: "Email",
    icon: MdEmail,
    bgColor: "bg-gray-600",
  },
];

const ShareButton = ({
  productId,
  productName = "Product",
  className = "",
  showLabel = true,
  variant = "icon", // 'icon' | 'button' | 'compact'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = (platform) => {
    shareToSocialMedia(platform, productId, productName);
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(productId, productName);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Share on social media"
        >
          <IoShareSocial className="w-5 h-5 text-gray-700" />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 flex gap-1">
            {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleShare(key)}
                className="p-2 hover:bg-gray-100 rounded transition"
                title={`Share on ${label}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
            <button
              onClick={handleCopyLink}
              className={`p-2 rounded transition ${
                copied ? "bg-green-100" : "hover:bg-gray-100"
              }`}
              title="Copy link"
            >
              {copied ? (
                <MdCheck className="w-4 h-4 text-green-600" />
              ) : (
                <FaLink className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (variant === "button") {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-sm"
        >
          <IoShareSocial className="w-5 h-5" />
          {showLabel && "Share"}
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-50 w-56">
            <div className="text-xs font-semibold text-gray-500 mb-2">
              Share on Social Media
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, bgColor }) => (
                <button
                  key={key}
                  onClick={() => handleShare(key)}
                  className={`${bgColor} text-white p-2 rounded-lg hover:opacity-90 transition flex flex-col items-center gap-1`}
                  title={`Share on ${label}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={handleCopyLink}
                className={`w-full p-2 rounded-lg flex items-center gap-2 transition ${
                  copied
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                {copied ? (
                  <>
                    <MdCheck className="w-5 h-5" />
                    <span className="text-sm font-medium">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <FaLink className="w-5 h-5" />
                    <span className="text-sm font-medium">Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {isOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  // Default icon variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-lg transition"
        title="Share product"
      >
        <IoShareSocial className="w-5 h-5 text-gray-700" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-50 w-48">
          <div className="text-xs font-semibold text-gray-500 mb-2 px-2">
            Share Product
          </div>
          <div className="grid grid-cols-4 gap-1 mb-2">
            {SOCIAL_PLATFORMS.map(({ key, label, icon: Icon, bgColor }) => (
              <button
                key={key}
                onClick={() => handleShare(key)}
                className={`${bgColor} text-white p-2 rounded hover:opacity-90 transition`}
                title={label}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyLink}
            className={`w-full p-2 rounded flex items-center gap-2 text-sm transition ${
              copied
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {copied ? (
              <>
                <MdCheck className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <FaLink className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ShareButton;
