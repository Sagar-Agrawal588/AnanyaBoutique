import { recordCrmTouchpoint } from "../services/crm/crmTracking.service.js";

const buildErrorResponse = (res, error) => {
  const statusCode =
    Number(error?.statusCode || 0) >= 400 ? Number(error.statusCode) : 500;

  return res.status(statusCode).json({
    error: statusCode >= 400,
    success: false,
    message: error?.message || "Failed to record CRM touchpoint.",
    ...(error?.details ? { details: error.details } : {}),
  });
};

export const recordPublicCrmTouchpoint = async (req, res) => {
  try {
    const result = await recordCrmTouchpoint(
      {
        ...req.body,
        userId: req.user || req.body?.userId || null,
        sessionId:
          req.body?.sessionId ||
          req.analyticsSessionId ||
          req.cookies?.hog_sid ||
          null,
        pageUrl: req.body?.pageUrl || req.headers?.["x-page-url"] || "",
        referrer: req.body?.referrer || req.headers?.referer || "",
      },
      {
        defaultChannel: "website",
      },
    );

    return res.status(result.created ? 201 : 200).json({
      error: false,
      success: true,
      message: result.created
        ? "CRM touchpoint recorded."
        : "CRM touchpoint already recorded.",
      data: {
        deduped: Boolean(result.deduped),
        contactId: String(result.contact?._id || ""),
        interactionId: String(result.interaction?._id || ""),
      },
    });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};
