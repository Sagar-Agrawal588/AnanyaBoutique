import connectDb from "../config/connectDb.js";
import NewsletterModel from "../models/newsletter.model.js";
import OrderModel from "../models/order.model.js";
import SupportTicketModel from "../models/supportTicket.model.js";
import UserModel from "../models/user.model.js";
import { captureCrmTouchpointSafely } from "../services/crm/crmTracking.service.js";
import isPrivilegedAdminRole from "../utils/isPrivilegedAdminRole.js";

const shouldApply = process.argv.includes("--apply");
const limitArg = process.argv.find((arg) =>
  String(arg || "").startsWith("--limit="),
);
const limit = Math.max(Number(limitArg?.split("=")[1] || 0), 0);

const queryLimit = (query) => (limit > 0 ? query.limit(limit) : query);

const logPrefix = shouldApply ? "[apply]" : "[dry-run]";

const captureIfApply = async (payload) => {
  if (!shouldApply) {
    console.log(`${logPrefix} crm touchpoint`, {
      channel: payload.channel,
      eventType: payload.eventType,
      email: payload.email || "",
      userId: payload.userId || "",
      orderId: payload.orderId || "",
      supportTicketId: payload.supportTicketId || "",
      idempotencyKey: payload.idempotencyKey || "",
    });
    return null;
  }

  return captureCrmTouchpointSafely(payload, {
    defaultChannel: "website",
  });
};

const run = async () => {
  await connectDb();

  const [users, newsletters, tickets, orders] = await Promise.all([
    queryLimit(
      UserModel.find({})
        .select("_id name email mobile role email_opt_out notificationSettings createdAt")
        .lean(),
    ),
    queryLimit(
      NewsletterModel.find({})
        .select("email source isActive subscribedAt unsubscribedAt createdAt")
        .lean(),
    ),
    queryLimit(
      SupportTicketModel.find({})
        .select(
          "_id userId name email phone subject message status createdAt created_at_ts updated_at_ts",
        )
        .lean(),
    ),
    queryLimit(
      OrderModel.find({})
        .select(
          "_id user guestDetails billingDetails totalAmt finalAmount payment_status order_status createdAt confirmedAt trackingSessionId affiliateSource influencerCode isSavedOrder",
        )
        .lean(),
    ),
  ]);

  console.log(
    `${logPrefix} backfilling CRM from ${users.length} users, ${newsletters.length} newsletter rows, ${tickets.length} support tickets, ${orders.length} orders`,
  );

  for (const user of users) {
    await captureIfApply({
      channel: "website",
      eventType: "lead_capture",
      userId: user?._id,
      email: user?.email,
      phone: user?.mobile,
      name: user?.name,
      happenedAt: user?.createdAt || new Date(),
      idempotencyKey: `crm-backfill:user:${user?._id}`,
      consent: {
        email:
          typeof user?.email_opt_out === "boolean" ? !user.email_opt_out : null,
        push:
          typeof user?.notificationSettings?.pushNotifications === "boolean"
            ? user.notificationSettings.pushNotifications
            : null,
      },
      metadata: {
        source: "backfill_users",
        role: user?.role || "User",
      },
      ...(isPrivilegedAdminRole(user?.role)
        ? {}
        : { userRole: user?.role || "User" }),
    });
  }

  for (const subscriber of newsletters) {
    await captureIfApply({
      channel: "email",
      eventType: subscriber?.isActive
        ? "newsletter_subscribed"
        : "newsletter_unsubscribed",
      email: subscriber?.email,
      source: subscriber?.source || "other",
      newsletterSource: subscriber?.source || "other",
      happenedAt:
        subscriber?.subscribedAt ||
        subscriber?.unsubscribedAt ||
        subscriber?.createdAt ||
        new Date(),
      idempotencyKey: `crm-backfill:newsletter:${subscriber?.email}:${subscriber?.isActive ? "active" : "inactive"}`,
      consent: {
        email: Boolean(subscriber?.isActive),
      },
      metadata: {
        source: "backfill_newsletter",
      },
    });
  }

  for (const ticket of tickets) {
    await captureIfApply({
      channel: "support",
      eventType: "support_ticket_created",
      userId: ticket?.userId,
      email: ticket?.email,
      phone: ticket?.phone,
      name: ticket?.name,
      supportTicketId: ticket?._id,
      message: `${ticket?.subject || ""}\n${ticket?.message || ""}`.trim(),
      happenedAt:
        ticket?.created_at_ts && Number.isFinite(ticket.created_at_ts)
          ? new Date(ticket.created_at_ts)
          : ticket?.createdAt || new Date(),
      idempotencyKey: `crm-backfill:support:${ticket?._id}:created`,
      metadata: {
        source: "backfill_support",
        ticketStatus: ticket?.status || "OPEN",
      },
    });
  }

  for (const order of orders) {
    const email =
      order?.billingDetails?.email || order?.guestDetails?.email || "";
    const phone =
      order?.billingDetails?.phone ||
      order?.billingDetails?.mobile ||
      order?.guestDetails?.phone ||
      order?.guestDetails?.mobile ||
      "";
    const name =
      order?.billingDetails?.fullName ||
      order?.guestDetails?.name ||
      order?.guestDetails?.full_name ||
      "";
    const eventType =
      String(order?.payment_status || "").trim().toLowerCase() === "paid"
        ? "order_paid"
        : "order_created";

    await captureIfApply({
      channel: "website",
      eventType,
      userId: order?.user,
      email,
      phone,
      name,
      sessionId: order?.trackingSessionId || "",
      orderId: order?._id,
      orderAmount: order?.finalAmount || order?.totalAmt || 0,
      happenedAt: order?.confirmedAt || order?.createdAt || new Date(),
      idempotencyKey: `crm-backfill:order:${order?._id}:${eventType}`,
      metadata: {
        source: "backfill_orders",
        affiliateSource: order?.affiliateSource || null,
        influencerCode: order?.influencerCode || null,
        isSavedOrder: Boolean(order?.isSavedOrder),
      },
    });
  }

  console.log(
    shouldApply
      ? "CRM backfill completed."
      : "Dry run completed. Re-run with --apply to persist CRM contacts.",
  );
  process.exit(0);
};

run().catch((error) => {
  console.error("CRM backfill failed:", error);
  process.exit(1);
});
