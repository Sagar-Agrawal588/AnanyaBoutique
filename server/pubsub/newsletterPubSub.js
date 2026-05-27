import { PubSub } from "@google-cloud/pubsub";

const TOPIC_NAME = process.env.NEWSLETTER_PUBSUB_TOPIC || "newsletter-broadcasts";

const getPubSubClient = () => {
  try {
    const client = new PubSub();
    return client;
  } catch (err) {
    console.error("Failed to create PubSub client:", err?.message || err);
    return null;
  }
};

export const publishNewsletterJob = async (payload) => {
  const client = getPubSubClient();
  if (!client) throw new Error("PubSub client not available");

  const dataBuffer = Buffer.from(JSON.stringify(payload));
  const topic = client.topic(TOPIC_NAME);
  const messageId = await topic.publishMessage({ data: dataBuffer });
  return { messageId };
};

export default { publishNewsletterJob };
