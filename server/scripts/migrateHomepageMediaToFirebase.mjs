import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(".env") });

const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();

if (!mongoUri) {
  throw new Error("Missing MONGO_URI/MONGODB_URI in server/.env");
}

const homepageMediaMap = {
  homeSlides: [
    {
      title: "Pure Peanut Goodness",
      url: "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-1.webp?alt=media&token=65e6ee68-27f4-4421-837e-7e1543cf92e5",
    },
    {
      title: "New: Chocolate Peanut Butter",
      url: "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-2.webp?alt=media&token=a03fee1f-c1a9-4d77-af0a-49829ac48fb6",
    },
    {
      title: "Fuel Your Workout",
      url: "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fhome-slide-default-3.webp?alt=media&token=033b528f-b621-40eb-a07e-85e82b58164d",
    },
  ],
  banners: [
    {
      title: "Free Delivery",
      url: "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fbanner-default-1.webp?alt=media&token=42c36dc4-fed0-4d78-a67c-73a9a2174064",
    },
    {
      title: "Subscribe & Save 10%",
      url: "https://firebasestorage.googleapis.com/v0/b/studio-8452116634-cdb59.firebasestorage.app/o/buyonegram%2Fsystem%2Fbanner-default-2.webp?alt=media&token=639fa7fc-a2c3-4207-b6de-d59fadd24862",
    },
  ],
};

await mongoose.connect(mongoUri);

try {
  const db = mongoose.connection.db;
  const homeSlidesCollection = db.collection("homeslides");
  const bannersCollection = db.collection("banners");

  const updates = {
    homeSlides: [],
    banners: [],
  };

  for (const item of homepageMediaMap.homeSlides) {
    const result = await homeSlidesCollection.updateOne(
      { title: item.title },
      { $set: { image: item.url } },
    );
    updates.homeSlides.push({
      title: item.title,
      image: item.url,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }

  for (const item of homepageMediaMap.banners) {
    const result = await bannersCollection.updateOne(
      { title: item.title },
      { $set: { image: item.url } },
    );
    updates.banners.push({
      title: item.title,
      image: item.url,
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
  }

  console.log(JSON.stringify({ updates }, null, 2));
} finally {
  await mongoose.disconnect();
}
