import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import {
  DEFAULT_BANNER_IMAGE_PATHS,
  DEFAULT_HOME_SLIDE_IMAGE_PATHS,
} from "../config/mediaDefaults.js";

dotenv.config({ path: path.resolve(".env") });

const mongoUri = String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();

if (!mongoUri) {
  throw new Error("Missing MONGO_URI/MONGODB_URI in server/.env");
}

const homepageMediaMap = {
  homeSlides: [
    {
      title: "Pure Peanut Goodness",
      url: DEFAULT_HOME_SLIDE_IMAGE_PATHS[0],
    },
    {
      title: "New: Chocolate Peanut Butter",
      url: DEFAULT_HOME_SLIDE_IMAGE_PATHS[1],
    },
    {
      title: "Fuel Your Workout",
      url: DEFAULT_HOME_SLIDE_IMAGE_PATHS[2],
    },
  ],
  banners: [
    {
      title: "Free Delivery",
      url: DEFAULT_BANNER_IMAGE_PATHS[0],
    },
    {
      title: "Subscribe & Save 10%",
      url: DEFAULT_BANNER_IMAGE_PATHS[1],
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
