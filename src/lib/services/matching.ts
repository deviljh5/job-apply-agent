import { prisma } from "@/lib/prisma";
import { AggregatedJob } from "./job-aggregation";

export interface MatchResult {
  jobId: string;
  overallScore: number;
  skillScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
}

export interface ResumeData {
  skills: string[];
  experience: {
    title: string;
    company: string;
    years: number;
    description: string;
  }[];
  preferredLocation: string[];
  preferredJobTypes: string[];
  expectedSalaryMin?: number;
  expectedSalaryMax?: number;
  yearsOfExperience: number;
}

class MatchingService {
  async calculateMatch(
    job: AggregatedJob,
    resumeId: string
  ): Promise<MatchResult> {
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        user: {
          include: {
            preferences: true,
          },
        },
      },
    });

    if (!resume) {
      throw new Error("Resume not found");
    }

    const parsedData = JSON.parse(resume.parsedData || '{}');

    const resumeData: ResumeData = {
      skills: parsedData.skills || [],
      experience: parsedData.experience || [],
      preferredLocation:
        resume.user?.preferences?.location ? JSON.parse(resume.user.preferences.location) : [],
      preferredJobTypes: resume.user?.preferences?.jobTypes ? JSON.parse(resume.user.preferences.jobTypes) : [],
      expectedSalaryMin: resume.user?.preferences?.salaryMin || undefined,
      expectedSalaryMax: resume.user?.preferences?.salaryMax || undefined,
      yearsOfExperience: this.calculateYearsOfExperience(
        parsedData.experience || []
      ),
    };

    return this.calculateMatchScore(job, resumeData);
  }

  calculateMatchScore(
    job: AggregatedJob,
    resume: ResumeData
  ): MatchResult {
    const skillScore = this.calculateSkillScore(job.skills, resume.skills);
    const experienceScore = this.calculateExperienceScore(
      job,
      resume.yearsOfExperience
    );
    const locationScore = this.calculateLocationScore(
      job.location,
      resume.preferredLocation
    );
    const salaryScore = this.calculateSalaryScore(
      job.salary_min,
      job.salary_max,
      resume.expectedSalaryMin,
      resume.expectedSalaryMax
    );

    // Weighted average
    const overallScore = Math.round(
      skillScore * 0.4 +
        experienceScore * 0.25 +
        locationScore * 0.15 +
        salaryScore * 0.2
    );

    const matchedSkills = job.skills.filter((skill) =>
      resume.skills.some(
        (rSkill) => rSkill.toLowerCase() === skill.toLowerCase()
      )
    );

    const missingSkills = job.skills.filter(
      (skill) =>
        !resume.skills.some(
          (rSkill) => rSkill.toLowerCase() === skill.toLowerCase()
        )
    );

    const reasoning = this.generateReasoning(
      overallScore,
      skillScore,
      experienceScore,
      locationScore,
      salaryScore,
      matchedSkills,
      missingSkills
    );

    return {
      jobId: job.id,
      overallScore,
      skillScore,
      experienceScore,
      locationScore,
      salaryScore,
      matchedSkills,
      missingSkills,
      reasoning,
    };
  }

  private calculateSkillScore(
    jobSkills: string[],
    resumeSkills: string[]
  ): number {
    if (jobSkills.length === 0) return 50;

    const normalizedJobSkills = jobSkills.map((s) => s.toLowerCase());
    const normalizedResumeSkills = resumeSkills.map((s) => s.toLowerCase());

    const matches = normalizedJobSkills.filter((skill) =>
      normalizedResumeSkills.includes(skill)
    ).length;

    return Math.round((matches / jobSkills.length) * 100);
  }

  private calculateExperienceScore(
    job: AggregatedJob,
    yearsOfExperience: number
  ): number {
    // Extract required years from job description
    const yearMatch = job.description.match(
      /(\d+)\+?\s*years?\s+of\s+experience/i
    );
    const requiredYears = yearMatch ? parseInt(yearMatch[1]) : 0;

    if (requiredYears === 0) return 70;
    if (yearsOfExperience >= requiredYears) return 100;
    if (yearsOfExperience >= requiredYears - 1) return 80;
    if (yearsOfExperience >= requiredYears - 2) return 60;
    return Math.max(20, (yearsOfExperience / requiredYears) * 100);
  }

  private calculateLocationScore(
    jobLocation: string,
    preferredLocations: string[]
  ): number {
    if (preferredLocations.length === 0) return 70;

    const jobLoc = jobLocation.toLowerCase();
    const isRemote =
      jobLoc.includes("remote") || jobLoc.includes("anywhere");

    if (isRemote) return 100;

    const hasMatch = preferredLocations.some(
      (loc) =>
        jobLoc.includes(loc.toLowerCase()) ||
        loc.toLowerCase().includes(jobLoc.split(",")[0].trim().toLowerCase())
    );

    return hasMatch ? 100 : 30;
  }

  private calculateSalaryScore(
    jobSalaryMin?: number,
    jobSalaryMax?: number,
    expectedMin?: number,
    expectedMax?: number
  ): number {
    if (!jobSalaryMin && !jobSalaryMax) return 70;
    if (!expectedMin && !expectedMax) return 70;

    const jobAvg = jobSalaryMax
      ? (jobSalaryMin || jobSalaryMax) +
        (jobSalaryMax - (jobSalaryMin || jobSalaryMax)) / 2
      : jobSalaryMin || 0;

    const expectedAvg = expectedMax
      ? expectedMin
        ? expectedMin + (expectedMax - expectedMin) / 2
        : expectedMax
      : expectedMin || 0;

    if (expectedAvg === 0 || jobAvg === 0) return 70;

    if (jobAvg >= expectedAvg) return 100;
    return Math.round((jobAvg / expectedAvg) * 100);
  }

  private calculateYearsOfExperience(
    experience: any[]
  ): number {
    if (!experience || experience.length === 0) return 0;

    let totalYears = 0;
    for (const exp of experience) {
      const startDate = exp.startDate
        ? new Date(exp.startDate)
        : new Date();
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      const years =
        (endDate.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365);
      totalYears += Math.max(0, years);
    }

    return Math.round(totalYears);
  }

  private generateReasoning(
    overall: number,
    skill: number,
    exp: number,
    location: number,
    salary: number,
    matched: string[],
    missing: string[]
  ): string {
    const parts: string[] = [];

    if (overall >= 80) {
      parts.push("Strong match!");
    } else if (overall >= 60) {
      parts.push("Good match with some gaps.");
    } else {
      parts.push("Partial match - some requirements not met.");
    }

    if (skill >= 80) {
      parts.push(
        `You have ${matched.length} of the required skills.`
      );
    } else if (missing.length > 0) {
      parts.push(
        `Missing ${missing.length} skills: ${missing.slice(0, 3).join(", ")}.`
      );
    }

    if (exp >= 80) {
      parts.push("Your experience level matches requirements.");
    } else if (exp < 50) {
      parts.push("Experience level may be below requirements.");
    }

    if (location >= 80) {
      parts.push("Location is a good match.");
    }

    if (salary >= 80) {
      parts.push("Salary meets your expectations.");
    }

    return parts.join(" ");
  }
}

export const matchingService = new MatchingService();
