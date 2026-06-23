import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobTitle, company, jobUrl, platform, status } = body;

    if (!jobTitle || !company || !jobUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In a real app, you'd get userId from auth session
    // For now, we'll create a demo user or use the first user
    const user = await prisma.user.findFirst();
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if job exists, create if not
    let job = await prisma.job.findFirst({
      where: { url: jobUrl },
    });

    if (!job) {
      job = await prisma.job.create({
        data: {
          source: platform || "manual",
          externalId: jobUrl,
          title: jobTitle,
          company: company,
          location: "",
          description: "",
          requirements: "[]",
          skills: "[]",
          url: jobUrl,
          jobType: "full_time",
          postedAt: new Date(),
        },
      });
    }

    // Create application tracking
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: job.id,
        status: status || "APPLIED",
        submittedAt: new Date(),
        submittedVia: platform || "extension",
      },
    });

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        submittedAt: application.submittedAt,
        job: {
          title: job.title,
          company: job.company,
          url: job.url,
        },
      },
    });
  } catch (error) {
    console.error("Application tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track application" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await prisma.user.findFirst();
    
    if (!user) {
      return NextResponse.json({ applications: [] });
    }

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      applications: applications.map((app) => ({
        id: app.id,
        status: app.status,
        submittedAt: app.submittedAt,
        submittedVia: app.submittedVia,
        job: app.job,
      })),
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
