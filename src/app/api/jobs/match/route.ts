import { NextResponse } from "next/server";
import { matchingService } from "@/lib/services/matching";
import { jobAggregationService } from "@/lib/services/job-aggregation";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get("resumeId");
    const query = searchParams.get("query") || undefined;
    const location = searchParams.get("location") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    // Fetch jobs
    const jobs = await jobAggregationService.searchJobs({
      query,
      location,
      limit,
    });

    // Calculate match scores
    const parsedData = JSON.parse(resume.parsedData || '{}');
    const resumeSkills = parsedData.skills || [];
    const resumeExperience = parsedData.experience || [];

    const matches = jobs.map((job) => {
      const matchResult = matchingService.calculateMatchScore(job, {
        skills: resumeSkills,
        experience: resumeExperience,
        preferredLocation: [],
        preferredJobTypes: [],
        yearsOfExperience: 0,
      });
      return {
        ...job,
        match_score: matchResult.overallScore,
        match_details: matchResult,
      };
    });

    // Sort by match score (highest first)
    matches.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

    return NextResponse.json({
      success: true,
      jobs: matches,
      resumeId,
    });
  } catch (error) {
    console.error("Match error:", error);
    return NextResponse.json(
      { error: "Failed to calculate matches" },
      { status: 500 }
    );
  }
}
