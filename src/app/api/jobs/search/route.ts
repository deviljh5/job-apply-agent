import { NextResponse } from "next/server";
import { jobAggregationService } from "@/lib/services/job-aggregation";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query") || undefined;
    const location = searchParams.get("location") || undefined;
    const country = searchParams.get("country") || "us";
    const salary_min = searchParams.get("salary_min")
      ? parseInt(searchParams.get("salary_min")!)
      : undefined;
    const salary_max = searchParams.get("salary_max")
      ? parseInt(searchParams.get("salary_max")!)
      : undefined;
    const job_type = searchParams.get("job_type") || undefined;
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : 1;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 20;

    const jobs = await jobAggregationService.searchJobs({
      query,
      location,
      country,
      salary_min,
      salary_max,
      job_type,
      page,
      limit,
    });

    // Save jobs to database for persistence
    await jobAggregationService.saveJobsToDatabase(jobs);

    return NextResponse.json({
      success: true,
      jobs,
      total: jobs.length,
      page,
      limit,
    });
  } catch (error) {
    console.error("Job search error:", error);
    return NextResponse.json(
      { error: "Failed to search jobs" },
      { status: 500 }
    );
  }
}
