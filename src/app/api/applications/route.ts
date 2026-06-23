import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const userId = session.user.id;

    const where = {
      userId,
      ...(status ? { status } : {}),
    };

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: true,
        emails: {
          orderBy: { receivedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    // Get statistics
    const stats = await prisma.$transaction([
      prisma.application.count({ where: { userId } }),
      prisma.application.count({ where: { userId, status: "APPLIED" } }),
      prisma.application.count({ where: { userId, status: "INTERVIEW" } }),
      prisma.application.count({ where: { userId, status: "OFFER" } }),
      prisma.application.count({ where: { userId, status: "REJECTED" } }),
      prisma.application.count({
        where: { userId, status: { in: ["OA", "PHONE_SCREEN"] } },
      }),
      prisma.application.count({
        where: { userId, emails: { some: { actionRequired: true } } },
      }),
    ]);

    return NextResponse.json({
      applications: applications.map((app) => ({
        id: app.id,
        job: {
          id: app.job.id,
          title: app.job.title,
          company: app.job.company,
          companyLogo: app.job.companyLogo,
          location: app.job.location,
          url: app.job.url,
        },
        status: app.status,
        submittedAt: app.submittedAt,
        submittedVia: app.submittedVia,
        notes: app.notes,
        followUpDate: app.followUpDate,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        emails: app.emails.map((email) => ({
          id: email.id,
          subject: email.subject,
          sender: email.sender,
          receivedAt: email.receivedAt,
          category: email.category,
          summary: email.summary,
          actionRequired: email.actionRequired,
          isRead: email.isRead,
        })),
      })),
      stats: {
        total: stats[0],
        applied: stats[1],
        interview: stats[2],
        offer: stats[3],
        rejected: stats[4],
        screening: stats[5],
        actionRequired: stats[6],
      },
    });
  } catch (error: any) {
    console.error("Applications fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
