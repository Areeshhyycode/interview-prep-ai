import mongoose from "mongoose";
import dns from "dns";

// Some networks/ISPs can't resolve the SRV "TXT" record that mongodb+srv
// needs, which surfaces as `queryTxt ETIMEOUT`. Forcing a public resolver
// (Google + Cloudflare) fixes it reliably.
try {
  dns.setServers(["8.8.8.8", "1.1.1.1", ...dns.getServers()]);
} catch {
  /* ignore if not permitted */
}

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in .env");
}

// Cache the connection across hot-reloads / serverless invocations.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose || { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
