"use client";

import { useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiEdit3,
  FiInfo,
  FiLock,
} from "react-icons/fi";

const FRAME_GROUPS = [
  {
    key: "desktop",
    title: "Desktop Frame",
    description:
      "Tune how the desktop hero image fills the fixed 16:9 frame.",
    scaleKey: "desktopImageScale",
    xKey: "desktopImagePositionX",
    yKey: "desktopImagePositionY",
  },
  {
    key: "mobile",
    title: "Mobile Frame",
    description:
      "Tune how the mobile hero image fills the same 16:9 frame on phones.",
    scaleKey: "mobileImageScale",
    xKey: "mobileImagePositionX",
    yKey: "mobileImagePositionY",
  },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const roundScale = (value) => Math.round(Number(value || 1) * 100) / 100;

const getRecommendedScale = (asset, fallbackScale) => {
  const ratio = Number(asset?.dimensions?.aspectRatio || 0);
  const targetRatio = 16 / 9;

  if (!ratio) return fallbackScale;

  const ratioDelta = Math.abs(ratio - targetRatio) / targetRatio;
  if (ratioDelta <= 0.03) return 1;
  if (ratioDelta <= 0.12) return 1.04;
  if (ratioDelta <= 0.22) return 1.08;
  return 1.12;
};

const getRecommendationNote = (asset) => {
  const ratio = Number(asset?.dimensions?.aspectRatio || 0);
  const targetRatio = 16 / 9;

  if (!ratio) {
    return "Upload an image to get a more precise framing suggestion.";
  }

  const ratioDelta = Math.abs(ratio - targetRatio) / targetRatio;
  if (ratioDelta <= 0.03) {
    return "This image is already close to 16:9, so centered framing with minimal zoom is best.";
  }

  if (ratio > targetRatio) {
    return "This image is wider than the frame. Keep focus centered unless the product is clearly off to one side.";
  }

  return "This image is taller than the frame. Keep vertical focus centered unless important content sits near the top or bottom.";
};

const getSuggestedSettings = ({ desktopAsset, mobileAsset }) => ({
  desktopImageScale: getRecommendedScale(desktopAsset, 1.08),
  desktopImagePositionX: 50,
  desktopImagePositionY: 50,
  mobileImageScale: getRecommendedScale(mobileAsset || desktopAsset, 1.04),
  mobileImagePositionX: 50,
  mobileImagePositionY: 50,
});

const HomeSlideFrameControls = ({
  values,
  onChange,
  desktopAsset = null,
  mobileAsset = null,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const suggestedSettings = useMemo(
    () => getSuggestedSettings({ desktopAsset, mobileAsset }),
    [desktopAsset, mobileAsset],
  );

  const updateValue = (key, nextValue) => {
    if (!isEditing) return;
    onChange(key, nextValue);
  };

  const nudgeValue = (key, amount, min, max, isScale = false) => {
    const currentValue = Number(values?.[key] || (isScale ? 1 : 50));
    const nextValue = clamp(currentValue + amount, min, max);
    updateValue(key, isScale ? roundScale(nextValue) : Math.round(nextValue));
  };

  const applySuggestedSettings = () => {
    if (!isEditing) return;
    Object.entries(suggestedSettings).forEach(([key, value]) => {
      onChange(key, value);
    });
  };

  return (
  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-[16px] font-semibold text-slate-800">
          Image Framing
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Use zoom and focus controls so each slide fills the frame cleanly
          without leaving visible side gaps.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowGuidelines((current) => !current)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <FiInfo size={15} />
          Guideline
        </button>
        <button
          type="button"
          onClick={applySuggestedSettings}
          disabled={!isEditing}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <FiCheck size={15} />
          Use suggested settings
        </button>
        <button
          type="button"
          onClick={() => setIsEditing((current) => !current)}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold shadow-sm ${
            isEditing
              ? "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {isEditing ? <FiLock size={15} /> : <FiEdit3 size={15} />}
          {isEditing ? "Lock framing" : "Edit image framing"}
        </button>
      </div>
    </div>

    {showGuidelines ? (
      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">
          Suggested framing keeps both images centered and uses only enough zoom
          for the uploaded aspect ratio.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="font-semibold text-slate-800">Desktop suggestion</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Zoom {Math.round(suggestedSettings.desktopImageScale * 100)}%,
              horizontal 50%, vertical 50%.{" "}
              {getRecommendationNote(desktopAsset)}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Mobile suggestion</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Zoom {Math.round(suggestedSettings.mobileImageScale * 100)}%,
              horizontal 50%, vertical 50%.{" "}
              {getRecommendationNote(mobileAsset || desktopAsset)}
            </p>
          </div>
        </div>
      </div>
    ) : null}

    {!isEditing ? (
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
        <FiLock size={14} />
        Framing sliders are locked to prevent accidental changes.
      </div>
    ) : null}

    <div className="grid gap-5 lg:grid-cols-2">
      {FRAME_GROUPS.map((group) => {
        const scaleValue = Number(values?.[group.scaleKey] || 1);
        const xValue = Number(values?.[group.xKey] || 50);
        const yValue = Number(values?.[group.yKey] || 50);

        return (
          <div
            key={group.key}
            className="rounded-2xl border border-white bg-white p-4 shadow-sm"
          >
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-800">
                {group.title}
              </h4>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {group.description}
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>Zoom</span>
                  <span>{Math.round(scaleValue * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      nudgeValue(group.scaleKey, -0.02, 1, 1.4, true)
                    }
                    disabled={!isEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Decrease ${group.title} zoom by 2 percent`}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="1.4"
                    step="0.01"
                    value={scaleValue}
                    disabled={!isEditing}
                    onChange={(event) =>
                      updateValue(group.scaleKey, Number(event.target.value))
                    }
                    className="w-full accent-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      nudgeValue(group.scaleKey, 0.02, 1, 1.4, true)
                    }
                    disabled={!isEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Increase ${group.title} zoom by 2 percent`}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>Horizontal focus</span>
                  <span>{xValue}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => nudgeValue(group.xKey, -2, 0, 100)}
                    disabled={!isEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move ${group.title} focus left by 2 percent`}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={xValue}
                    disabled={!isEditing}
                    onChange={(event) =>
                      updateValue(group.xKey, Number(event.target.value))
                    }
                    className="w-full accent-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <button
                    type="button"
                    onClick={() => nudgeValue(group.xKey, 2, 0, 100)}
                    disabled={!isEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move ${group.title} focus right by 2 percent`}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </label>

              <label className="block">
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
                  <span>Vertical focus</span>
                  <span>{yValue}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => nudgeValue(group.yKey, -2, 0, 100)}
                    disabled={!isEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move ${group.title} focus up by 2 percent`}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={yValue}
                    disabled={!isEditing}
                    onChange={(event) =>
                      updateValue(group.yKey, Number(event.target.value))
                    }
                    className="w-full accent-blue-600 disabled:cursor-not-allowed disabled:opacity-45"
                  />
                  <button
                    type="button"
                    onClick={() => nudgeValue(group.yKey, 2, 0, 100)}
                    disabled={!isEditing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={`Move ${group.title} focus down by 2 percent`}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};

export default HomeSlideFrameControls;
