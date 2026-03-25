import {
  initializeEmailService,
  invalidateEmailTemplateOverrideCache,
  renderEmailTemplate,
  sendEmail as sendEmailObjectApi,
  sendTemplatedEmail,
} from "../services/EmailService.js";

export {
  initializeEmailService,
  invalidateEmailTemplateOverrideCache,
  renderEmailTemplate,
  sendTemplatedEmail,
};

// Backward-compatible and modern signatures:
// - sendEmail({ to, subject, text, html, context, from })
// - sendEmail(to, subject, text, html, options)
export const sendEmail = async (...args) => {
  if (
    args.length === 1 &&
    args[0] &&
    typeof args[0] === "object" &&
    !Array.isArray(args[0])
  ) {
    return sendEmailObjectApi(args[0]);
  }

  const [to, subject, text, html, options = {}] = args;
  return sendEmailObjectApi({
    to,
    subject,
    text,
    html,
    context: options?.context || "legacy",
    from: options?.from || null,
    attachments: Array.isArray(options?.attachments) ? options.attachments : [],
    headers:
      options?.headers && typeof options.headers === "object"
        ? options.headers
        : {},
  });
};
