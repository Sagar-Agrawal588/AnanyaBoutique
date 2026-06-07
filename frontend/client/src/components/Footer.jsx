"use client";

import { API_BASE_URL, postData } from "@/utils/api";
import useStorefrontContent from "@/hooks/useStorefrontContent";
import {
  buildContactHelpers,
  getEnabledLinks,
} from "@/config/storefrontContent";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  FiCreditCard,
  FiHeadphones,
  FiHeart,
  FiHome,
  FiMail,
  FiPhone,
  FiShield,
  FiStar,
} from "react-icons/fi";
import { FaInstagram, FaWhatsapp } from "react-icons/fa";
import { IoLocationSharp } from "react-icons/io5";
import { BiSupport } from "react-icons/bi";
import BrandLogo from "./brand/BrandLogo";
import {
  brandIdentity,
  brandPillars,
  globalTrustMessages,
} from "@/config/visualIdentity";

const API_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL;

const Footer = () => {
  const { content: storefrontContent } = useStorefrontContent();
  const contactContent = storefrontContent.contact;
  const footerContent = storefrontContent.footer;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [policyLinks, setPolicyLinks] = useState({
    terms: { name: "Terms & Conditions", link: "/policy/terms-and-conditions" },
  });

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");
    try {
      const response = await postData("/api/newsletter/subscribe", {
        email,
        source: "footer",
      });
      if (response.success) {
        setStatus("success");
        setMessage(response.message || "Thank you for subscribing!");
        setEmail("");
        toast.success(response.message || "Thank you for subscribing!");
      } else {
        setStatus("error");
        setMessage(
          response.message || "Failed to subscribe. Please try again.",
        );
        toast.error(
          response.message || "Failed to subscribe. Please try again.",
        );
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setStatus("error");
      setMessage("Failed to subscribe. Please try again.");
      toast.error("Failed to subscribe. Please try again.");
    }
  };

  useEffect(() => {
    const fetchPolicyLinks = async () => {
      try {
        const response = await fetch(`${API_URL}/api/policies/public`);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) return;
        const policyBySlug = data.data.reduce((acc, policy) => {
          acc[policy.slug] = policy;
          return acc;
        }, {});
        setPolicyLinks({
          terms: policyBySlug["terms-and-conditions"]
            ? {
                name: policyBySlug["terms-and-conditions"].title,
                link: `/policy/${policyBySlug["terms-and-conditions"].slug}`,
              }
            : {
                name: "Terms & Conditions",
                link: "/policy/terms-and-conditions",
              },
        });
      } catch (error) {
        /* Silent fallback */
      }
    };
    fetchPolicyLinks();
  }, []);

  const contactHelpers = buildContactHelpers(contactContent);
  const supportLink = contactHelpers.mailtoHref("Ananya Boutique support");
  const supportPhoneHref = contactHelpers.phoneHref;
  const mapHref = contactContent.mapUrl || "#";
  const whatsappHref = contactHelpers.whatsappHref(
    contactContent.whatsappActions?.[0]?.message,
  );
  const footerColumns = Array.isArray(footerContent.linkColumns)
    ? footerContent.linkColumns
    : [];
  const resolveFooterLink = (item) => {
    if (item?.href === "/policy/terms-and-conditions") {
      return {
        name: item.name || policyLinks.terms.name,
        href: policyLinks.terms.link,
      };
    }
    return {
      name: item?.name || item?.label || "",
      href: item?.href || item?.link || "/",
    };
  };

  const featureIcons = [FiShield, FiHome, FiStar, FiHeart, FiHeadphones];
  const features = brandPillars.map((pillar, index) => ({
    icon: (() => {
      const Icon = featureIcons[index] || FiShield;
      return <Icon />;
    })(),
    title: pillar.title,
    desc: pillar.description,
  }));
  features.push(
    {
      icon: <FiCreditCard />,
      title: "Secure Payment",
      desc: "Safe checkout options",
    },
  );

  return (
    <footer
      className="site-footer relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #2a0f24 0%, #130816 58%, #08050a 100%)",
      }}
    >
      {/* Layered footer glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-45"
          style={{
            background:
              "linear-gradient(135deg, rgba(236,72,153,0.22), transparent 34%, rgba(124,58,237,0.2) 74%, transparent)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* ============ FEATURE CARDS ============ */}
        <div className="mx-auto grid max-w-7xl grid-cols-2 justify-center gap-2.5 py-8 sm:grid-cols-3 sm:gap-4 sm:py-14 lg:grid-cols-6">
          {features.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.24, delay: i * 0.04 }}
              whileHover={{ y: -2, transition: { duration: 0.16 } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.12 } }}
              className="group mx-auto flex h-full w-full max-w-[14rem] cursor-default flex-col items-center rounded-[18px] p-3.5 active:bg-white/[0.08] sm:rounded-2xl sm:p-6"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-[22px] text-[#121212] transition-all duration-200 group-hover:shadow-lg sm:h-14 sm:w-14 sm:text-[26px]"
                style={{
                  background:
                    "linear-gradient(135deg, #f9a8d4, #c4b5fd)",
                }}
              >
                {item.icon}
              </div>
              <h3 className="text-[12px] sm:text-[14px] font-bold mt-3 sm:mt-4 text-white text-center">
                {item.title}
              </h3>
              <p className="text-[10px] sm:text-[11px] font-medium text-gray-500 mt-1 text-center">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Separator */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          }}
        />

        {/* ============ MAIN FOOTER CONTENT ============ */}
        <div className="grid grid-cols-1 gap-9 py-10 sm:gap-10 sm:py-14 md:grid-cols-2 lg:grid-cols-4">
          {/* 1. CONTACT */}
          {/* 1. CONTACT */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.28 }}
            className="flex flex-col gap-4 rounded-[24px] border border-white/5 bg-white/[0.025] p-4 sm:gap-5 sm:p-0 md:bg-transparent lg:border-r lg:pr-8"
          >
            <BrandLogo
              variant="footer"
              showText
              imageClassName="h-12 w-12"
              textClassName="text-white"
            />
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white uppercase tracking-[0.15em]">
              {footerContent.contactTitle}
            </h3>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-gray-400">
              {footerContent.description || brandIdentity.supportingMessage}
            </p>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-gray-400">
              {footerContent.founderMessage || globalTrustMessages.founder}
            </p>
            <a
              href={supportLink}
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-gray-400 hover:text-primary transition-colors duration-300"
            >
              <FiMail />
              {contactContent.email}
            </a>
            <a
              href={supportPhoneHref}
              className="inline-flex items-center gap-2 text-[18px] font-extrabold tracking-tight hover:underline transition-colors"
              style={{ color: "var(--primary)" }}
            >
              <FiPhone />
              {contactContent.phone}
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-gray-400 hover:text-primary transition-colors duration-300"
            >
              <FaWhatsapp />
              WhatsApp Support
            </a>
            <a
              href={contactContent.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-gray-400 hover:text-primary transition-colors duration-300"
            >
              <FaInstagram />
              {contactContent.instagramHandle}
            </a>

            {/* Map Card */}
            <Link
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 mt-1 p-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 active:-translate-y-0.5 active:bg-white/[0.08]"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <IoLocationSharp
                className="text-[28px] transition-transform group-hover:scale-110 group-active:scale-110"
                style={{ color: "var(--primary)" }}
              />
              <span className="text-[13px] font-bold text-gray-300 leading-tight">
                View on Map <br />
                <span className="font-normal text-gray-500 group-hover:text-primary group-active:text-primary transition-colors">
                  Get Directions
                </span>
              </span>
            </Link>

            {/* Contact Card */}
            <Link
              href="/contact"
              className="group flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 hover:-translate-y-1 active:-translate-y-0.5 active:bg-white/[0.08]"
              style={{
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <BiSupport
                className="text-[28px] transition-transform group-hover:scale-110 group-active:scale-110"
                style={{ color: "var(--primary)" }}
              />
              <span className="text-[13px] font-bold text-gray-300 leading-tight">
                Contact Us <br />
                <span className="font-normal text-gray-500 group-hover:text-primary group-active:text-primary transition-colors">
                  Open contact page
                </span>
              </span>
            </Link>
          </motion.div>

          {/* 2. PRODUCTS */}
          {/* 2. PRODUCTS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.28, delay: 0.08 }}
          >
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white uppercase tracking-[0.15em] mb-5 sm:mb-7">
              {footerColumns[0]?.title || "Discover"}
            </h3>
            <ul className="space-y-3.5">
              {getEnabledLinks(footerColumns[0]?.links).map(resolveFooterLink).map((item, i) => (
                <li key={i}>
                  <Link
                    href={item.href}
                    className="group flex items-center text-[14px] font-medium text-gray-500 hover:text-primary active:text-primary transition-all duration-300"
                  >
                    <span
                      className="w-0 h-0.5 mr-0 transition-all duration-300 group-hover:w-4 group-hover:mr-2.5 group-active:w-4 group-active:mr-2.5 rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--primary), var(--flavor-hover))",
                      }}
                    ></span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 3. COMPANY */}
          {/* 3. COMPANY */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.28, delay: 0.12 }}
          >
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white uppercase tracking-[0.15em] mb-5 sm:mb-7">
              {footerColumns[1]?.title || "Our Company"}
            </h3>
            <ul className="space-y-3.5">
              {getEnabledLinks(footerColumns[1]?.links).map(resolveFooterLink).map((item, i) => (
                <li key={i}>
                  <Link
                    href={item.href}
                    className="group flex items-center text-[14px] font-medium text-gray-500 hover:text-primary active:text-primary transition-all duration-300"
                  >
                    <span
                      className="w-0 h-0.5 mr-0 transition-all duration-300 group-hover:w-4 group-hover:mr-2.5 group-active:w-4 group-active:mr-2.5 rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--primary), var(--flavor-hover))",
                      }}
                    ></span>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* 4. NEWSLETTER */}
          {/* 4. NEWSLETTER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.28, delay: 0.16 }}
          >
            <h3 className="text-[16px] sm:text-[18px] font-extrabold text-white uppercase tracking-[0.15em] mb-3 sm:mb-4">
              {footerContent.newsletterTitle}
            </h3>
            <p className="text-[12px] sm:text-[13px] text-gray-500 mb-5 sm:mb-6 leading-relaxed">
              {footerContent.newsletterDescription}
            </p>

            <form
              onSubmit={handleSubscribe}
              className="flex flex-col gap-3 w-full"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={status === "loading" || status === "success"}
                className="w-full h-[48px] px-5 rounded-full outline-none text-sm text-white placeholder-gray-600 focus:ring-2 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  focusRingColor: "var(--primary)",
                }}
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className={`h-[48px] w-full rounded-full text-[14px] font-bold tracking-wide transition-all duration-400 active:scale-95 flex items-center justify-center disabled:opacity-80 disabled:cursor-not-allowed ${
                  status === "success"
                    ? ""
                    : "hover:shadow-lg hover:-translate-y-0.5"
                }`}
                style={{
                  background:
                    status === "success"
                      ? "linear-gradient(135deg, #ec4899, #7c3aed)"
                      : "linear-gradient(135deg, #ec4899, #7c3aed)",
                  color: "#ffffff",
                  boxShadow: "0 12px 30px rgba(124, 58, 237, 0.24)",
                }}
              >
                {status === "loading" ? (
                  <span className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                ) : status === "success" ? (
                  "SUBSCRIBED"
                ) : (
                  "JOIN NOW"
                )}
              </button>
            </form>

            {status === "success" && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-primary text-xs mt-3 font-semibold"
              >
                {message || "Thank you for subscribing!"}
              </motion.p>
            )}
            {status === "error" && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[#ff4757] text-xs mt-3 font-semibold"
              >
                {message || "Failed to subscribe. Please try again."}
              </motion.p>
            )}
          </motion.div>
        </div>

        {/* Separator */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
          }}
        />

        {/* ============ BOTTOM BAR ============ */}
        <div className="py-6 sm:py-8 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 sm:gap-6">
          {/* Social Icons */}
          <div className="flex gap-2.5 sm:gap-3">
            {[
              ...(getEnabledLinks(footerContent.socialLinks).length
                ? getEnabledLinks(footerContent.socialLinks).map((link) => ({
                    Icon: FaInstagram,
                    link: link.href,
                    hoverColor: "#E4405F",
                  }))
                : [
                    {
                      Icon: FaInstagram,
                      link: contactContent.instagramUrl,
                      hoverColor: "#E4405F",
                    },
                  ]),
            ].map(({ Icon, link, hoverColor }, i) => (
              <motion.a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                whileHover={{
                  y: -2,
                  color: hoverColor,
                  borderColor: `${hoverColor}40`,
                  transition: { duration: 0.16 },
                }}
                whileTap={{
                  scale: 0.95,
                  color: hoverColor,
                  borderColor: `${hoverColor}40`,
                  boxShadow: `0 4px 15px ${hoverColor}20`,
                }}
                className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] flex items-center justify-center rounded-full text-gray-500 transition-colors duration-300"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Icon size={18} />
              </motion.a>
            ))}
          </div>

          <p className="text-center text-[11px] sm:text-[13px] font-medium text-gray-600">
            &copy; {footerContent.copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
