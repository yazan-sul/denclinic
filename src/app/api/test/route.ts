import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ success: true, data: { userCount } });
  } catch (error) {
    return handleApiError(error);
  }
}
