import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getUserId } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const id = getUserId(req);
    if (!id) return NextResponse.json({ user: null });
    await connectDB();
    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ user: null });
    const u = user as unknown as { _id: unknown; name?: string; email?: string };
    return NextResponse.json({
      user: { id: u._id, name: u.name, email: u.email },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
