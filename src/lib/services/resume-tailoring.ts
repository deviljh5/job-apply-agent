import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { AggregatedJob } from "./job-aggregation";

function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key") {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const isDemoMode = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key";

export interface TailoredResume {
  id: string;
  resumeId: string;
  jobId: string;
  tailoredContent: {
    summary: string;
    experience: {
      title: string;
      company: string;
      duration: string;
      bullets: string[];
    }[];
    skills: string[];
    education: {
      degree: string;
      school: string;
      year: string;
    }[];
  };
  coverLetter: string;
  atsScore: number;
  keywordMatches: string[];
  missingKeywords: string[];
  createdAt: Date;
}

class ResumeTailoringService {
  async tailorResume(
    resumeId: string,
    jobId: string
  ): Promise<TailoredResume> {
    const [resume, job] = await Promise.all([
      prisma.resume.findUnique({
        where: { id: resumeId },
      }),
      prisma.job.findUnique({
        where: { id: jobId },
      }),
    ]);

    if (!resume) throw new Error("Resume not found");
    if (!job) throw new Error("Job not found");

    const parsedData = JSON.parse(resume.parsedData || "{}");

    // Generate tailored resume using AI or demo mode
    const tailoredContent = isDemoMode
      ? this.generateMockTailoredContent(parsedData, job)
      : await this.generateTailoredContent(parsedData, job);

    // Generate cover letter
    const coverLetter = isDemoMode
      ? this.generateMockCoverLetter(parsedData, job)
      : await this.generateCoverLetter(parsedData, job);

    // Calculate ATS score
    const { atsScore, keywordMatches, missingKeywords } =
      this.calculateATSScore(tailoredContent, job);

    // Save to database
    const tailoredResume = await prisma.tailoredResume.create({
      data: {
        resumeId,
        jobId,
        tailoredUrl: JSON.stringify(tailoredContent),
        coverLetter,
        atsScore,
      },
    });

    return {
      id: tailoredResume.id,
      resumeId,
      jobId,
      tailoredContent,
      coverLetter,
      atsScore,
      keywordMatches,
      missingKeywords,
      createdAt: tailoredResume.createdAt,
    };
  }

  private async generateTailoredContent(
    resumeData: any,
    job: any
  ): Promise<TailoredResume["tailoredContent"]> {
    const prompt = `
You are an expert resume writer and career coach. Tailor the following resume to match the job description.

## Job Description
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Requirements: ${job.requirements}
Skills: ${job.skills}

## Original Resume
${JSON.stringify(resumeData, null, 2)}

## Instructions
1. Rewrite the professional summary to highlight relevant experience for this specific role
2. Rewrite experience bullet points to emphasize achievements relevant to the job requirements
3. Use strong action verbs and quantifiable results where possible
4. Ensure keywords from the job description are naturally incorporated
5. Keep the same structure but optimize content for ATS systems

Return ONLY a JSON object with this exact structure:
{
  "summary": "Professional summary paragraph (2-3 sentences)",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Duration",
      "bullets": ["Achievement bullet 1", "Achievement bullet 2", "Achievement bullet 3"]
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "education": [
    {
      "degree": "Degree",
      "school": "School",
      "year": "Year"
    }
  ]
}
`;

    const client = getOpenAI()!;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert resume writer specializing in ATS optimization. Return only valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to generate tailored resume");
    }

    return JSON.parse(jsonMatch[0]);
  }

  private generateMockTailoredContent(
    resumeData: any,
    job: any
  ): TailoredResume["tailoredContent"] {
    const jobTitle = job.title || "Software Engineer";
    const company = job.company || "Tech Company";
    const jobSkills = JSON.parse(job.skills || "[]").slice(0, 8) as string[];

    const originalExperience = resumeData.experience || [];
    const originalEducation = resumeData.education || [];

    return {
      summary: `Experienced professional with a strong background in ${jobSkills.slice(0, 3).join(", ")}. Passionate about joining ${company} to leverage expertise in ${jobTitle.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())} and contribute to innovative projects.`,
      experience: originalExperience.map((exp: any) => ({
        title: exp.title || jobTitle,
        company: exp.company || "Previous Company",
        duration: exp.startDate && exp.endDate ? `${exp.startDate} - ${exp.endDate}` : "2020 - Present",
        bullets: [
          `Led development of key features using ${jobSkills.slice(0, 3).join(", ")}, resulting in 40% performance improvement`,
          `Collaborated with cross-functional teams to deliver ${jobTitle.toLowerCase()} solutions on time and within budget`,
          `Implemented best practices for ${jobSkills[3] || "code quality"} and mentored junior team members`,
        ],
      })),
      skills: jobSkills.length > 0 ? jobSkills : ["JavaScript", "React", "Node.js", "Python", "AWS"],
      education: originalEducation.map((edu: any) => ({
        degree: edu.degree || "Bachelor of Science",
        school: edu.institution || "University",
        year: edu.graduationYear || "2018",
      })),
    };
  }

  private async generateCoverLetter(
    resumeData: any,
    job: any
  ): Promise<string> {
    const prompt = `
Write a professional cover letter for the following job application.

## Job
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}

## Applicant Resume
${JSON.stringify(resumeData, null, 2)}

## Instructions
1. Write a compelling cover letter (300-400 words)
2. Show genuine interest in the company and role
3. Highlight 2-3 key achievements that directly relate to the job requirements
4. Use the hiring manager's perspective - what would they want to see?
5. End with a strong call to action
6. Keep it professional but personable

Return the cover letter as plain text (no JSON, no markdown formatting).
`;

    const client = getOpenAI()!;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert cover letter writer. Write compelling, personalized cover letters.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1500,
    });

    return response.choices[0].message.content || "";
  }

  private generateMockCoverLetter(
    resumeData: any,
    job: any
  ): string {
    const name = resumeData.name || "Applicant";
    const company = job.company || "the company";
    const title = job.title || "this position";
    const skills = JSON.parse(job.skills || "[]").slice(0, 4).join(", ") || "relevant technologies";

    return `Dear Hiring Manager,

I am writing to express my strong interest in the ${title} position at ${company}. With my background in software engineering and expertise in ${skills}, I am confident that I would be a valuable addition to your team.

Throughout my career, I have consistently demonstrated the ability to deliver high-quality code while collaborating effectively with cross-functional teams. I am particularly drawn to ${company} because of your innovative approach to technology and commitment to building products that make a real difference.

In my previous roles, I have successfully led projects that required strong technical skills and creative problem-solving. I am eager to bring this experience to ${company} and contribute to your continued success.

I would welcome the opportunity to discuss how my skills and experience align with your team's needs. Thank you for considering my application.

Sincerely,
${name}`;
  }

  private calculateATSScore(
    tailoredContent: TailoredResume["tailoredContent"],
    job: any
  ): { atsScore: number; keywordMatches: string[]; missingKeywords: string[] } {
    const jobSkills = JSON.parse(job.skills || "[]") as string[];
    const jobDescription = job.description.toLowerCase();

    const allContent = [
      tailoredContent.summary.toLowerCase(),
      ...tailoredContent.experience.flatMap((exp) =>
        exp.bullets.map((b) => b.toLowerCase())
      ),
      ...tailoredContent.skills.map((s) => s.toLowerCase()),
    ].join(" ");

    const keywordMatches = jobSkills.filter((skill) =>
      allContent.includes(skill.toLowerCase())
    );

    const missingKeywords = jobSkills.filter(
      (skill) => !allContent.includes(skill.toLowerCase())
    );

    // Calculate score based on keyword matches and density
    const matchRate =
      jobSkills.length > 0 ? keywordMatches.length / jobSkills.length : 0;
    const score = Math.round(matchRate * 100);

    return {
      atsScore: Math.min(100, score),
      keywordMatches,
      missingKeywords,
    };
  }

  async getTailoredResume(id: string): Promise<TailoredResume | null> {
    const tailored = await prisma.tailoredResume.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!tailored) return null;

    return {
      id: tailored.id,
      resumeId: tailored.resumeId,
      jobId: tailored.jobId,
      tailoredContent: JSON.parse(tailored.tailoredUrl || "{}"),
      coverLetter: tailored.coverLetter || "",
      atsScore: tailored.atsScore || 0,
      keywordMatches: [],
      missingKeywords: [],
      createdAt: tailored.createdAt,
    };
  }
}

export const resumeTailoringService = new ResumeTailoringService();
