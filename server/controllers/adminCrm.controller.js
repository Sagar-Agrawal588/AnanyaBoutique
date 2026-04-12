import {
  getCrmContactTimeline,
  getCrmContacts,
  getCrmOverview,
  updateCrmContactAdmin,
} from "../services/crm/crmInsights.service.js";

const buildErrorResponse = (res, error) => {
  const statusCode =
    Number(error?.statusCode || 0) >= 400 ? Number(error.statusCode) : 500;

  return res.status(statusCode).json({
    error: statusCode >= 400,
    success: false,
    message: error?.message || "CRM request failed.",
    ...(error?.details ? { details: error.details } : {}),
  });
};

export const getAdminCrmOverview = async (_req, res) => {
  try {
    const data = await getCrmOverview();
    return res.status(200).json({
      error: false,
      success: true,
      data,
    });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

export const getAdminCrmContacts = async (req, res) => {
  try {
    const data = await getCrmContacts(req.query);
    return res.status(200).json({
      error: false,
      success: true,
      data,
    });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

export const getAdminCrmContactTimeline = async (req, res) => {
  try {
    const data = await getCrmContactTimeline(req.params.contactId, req.query);
    return res.status(200).json({
      error: false,
      success: true,
      data,
    });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};

export const patchAdminCrmContact = async (req, res) => {
  try {
    const contact = await updateCrmContactAdmin(req.params.contactId, req.body);
    return res.status(200).json({
      error: false,
      success: true,
      message: "CRM contact updated successfully.",
      data: {
        contact,
      },
    });
  } catch (error) {
    return buildErrorResponse(res, error);
  }
};
