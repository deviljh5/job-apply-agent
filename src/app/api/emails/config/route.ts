import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { syncEnabled } = await request.json();
    const userId = session.user.id;

    const emailSync = await prisma.emailSync.upsert({
      where: { userId },
      update: { syncEnabled },
      create: {
        userId,
        syncEnabled,
        accessToken: "",
        refreshToken: "",
      },
    });

    return NextResponse.json({
      syncEnabled: emailSync.syncEnabled,
      lastSyncAt: emailSync.lastSyncAt,
    });
  } catch (error: any) {
    console.error("Email sync config error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to configure email sync" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailSync = await prisma.emailSync.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      syncEnabled: emailSync?.syncEnabled || false,
      lastSyncAt: emailSync?.lastSyncAt,
    });
  } catch (error: any) {
    console.error("Email sync config fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email sync config" },
      { status: 500 }
    );
  }
}
