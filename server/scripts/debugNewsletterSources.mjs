import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.log("NO_URI");
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.db.collection("newsletters");

const bySource = await col
  .aggregate([
    { $group: { _id: "$source", c: { $sum: 1 } } },
    { $sort: { c: -1 } },
  ])
  .toArray();

const recent = await col
  .find(
    {},
    {
      projection: {
        email: 1,
        source: 1,
        isActive: 1,
        subscribedAt: 1,
        createdAt: 1,
      },
    },
  )
  .sort({ createdAt: -1 })
  .limit(20)
  .toArray();

console.log("BY_SOURCE", JSON.stringify(bySource));
console.log("RECENT", JSON.stringify(recent));

await mongoose.disconnect();
