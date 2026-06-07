"use client";

import { API_BASE_URL } from "@/utils/api";
import { sanitizeHTML } from "@/utils/sanitize";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_URL = API_BASE_URL.endsWith("/api")
  ? API_BASE_URL.slice(0, -4)
  : API_BASE_URL;

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const plainTextToHtml = (value) =>
  String(value || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");

const buildSafeHtml = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const html = /<\/?[a-z][\s\S]*>/i.test(raw) ? raw : plainTextToHtml(raw);
  return sanitizeHTML(html);
};

export default function PolicyContentPage({
  slug,
  fallbackTitle,
  fallbackContent,
  eyebrow = "Policy",
}) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadPolicy = async () => {
      try {
        const response = await fetch(`${API_URL}/api/policies/public/${slug}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (active && data?.success) {
          setPolicy(data.data);
        }
      } catch {
        // Fallback content keeps legal pages available before CMS entries exist.
      } finally {
        if (active) setLoading(false);
      }
    };

    if (slug) loadPolicy();

    return () => {
      active = false;
    };
  }, [slug]);

  const title = policy?.title || fallbackTitle;
  const content = policy?.content || fallbackContent;
  const html = useMemo(() => buildSafeHtml(content), [content]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12">
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {eyebrow}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {loading ? "Loading latest policy..." : "Ananya Boutique"}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <article
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
