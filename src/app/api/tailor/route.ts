import { NextResponse } from "next/server";
import { resumeTailoringService } from "@/lib/services/resume-tailoring";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { resumeId, jobId } = body;

    if (!resumeId || !jobId) {
      return NextResponse.json(
        { error: "Missing resumeId or jobId" },
        { status: 400 }
      );
    }

    const tailoredResume = await resumeTailoringService.tailorResume(
      resumeId,
      jobId
    );

    return NextResponse.json({
      success: true,
      tailoredResume,
    });
  } catch (error) {
    console.error("Resume tailoring error:", error);
    return NextResponse.json(
      { error: "Failed to tailor resume" },
      { status: 500 }
    );
  }
}
