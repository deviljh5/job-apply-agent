import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GmailService } from "@/lib/services/gmail-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { maxResults = 50 } = await request.json().catch(() => ({}));

    const gmailService = new GmailService();
    const result = await gmailService.syncEmails(session.user.id, maxResults);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Email sync error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync emails" },
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

    const userId = session.user.id;

    // Get sync status
    const emailSync = await prisma.emailSync.findUnique({
      where: { userId },
    });

    // Get recent emails
    const recentEmails = await prisma.applicationEmail.findMany({
      where: {
        application: { userId },
      },
      include: {
        application: {
          include: {
            job: true,
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      syncEnabled: emailSync?.syncEnabled || false,
      lastSyncAt: emailSync?.lastSyncAt,
      emails: recentEmails.map((email) => ({
        id: email.id,
        subject: email.subject,
        sender: email.sender,
        receivedAt: email.receivedAt,
        category: email.category,
        summary: email.summary,
        actionRequired: email.actionRequired,
        isRead: email.isRead,
        company: email.application?.job?.company,
        position: email.application?.job?.title,
        applicationStatus: email.application?.status,
      })),
    });
  } catch (error: any) {
    console.error("Email fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch emails" },
      { status: 500 }
    );
  }
}
