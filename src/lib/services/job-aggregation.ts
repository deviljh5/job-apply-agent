import { prisma } from "@/lib/prisma";

export interface JobSearchParams {
  query?: string;
  location?: string;
  country?: string;
  salary_min?: number;
  salary_max?: number;
  job_type?: string;
  page?: number;
  limit?: number;
}

export interface AggregatedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  job_type: string;
  url: string;
  source: string;
  posted_at: Date;
  skills: string[];
  requirements: string[];
  benefits: string[];
  match_score?: number;
}

class JobAggregationService {
  private adzunaAppId?: string;
  private adzunaApiKey?: string;

  constructor() {
    this.adzunaAppId = process.env.ADZUNA_APP_ID;
    this.adzunaApiKey = process.env.ADZUNA_API_KEY;
  }

  async searchJobs(params: JobSearchParams): Promise<AggregatedJob[]> {
    const jobs: AggregatedJob[] = [];

    // Try Adzuna API if keys are available
    if (this.adzunaAppId && this.adzunaApiKey) {
      try {
        const adzunaJobs = await this.fetchFromAdzuna(params);
        jobs.push(...adzunaJobs);
      } catch (error) {
        console.error("Adzuna API error:", error);
      }
    }

    // Always include mock data for demo purposes
    const mockJobs = this.getMockJobs(params);
    jobs.push(...mockJobs);

    // Deduplicate by URL
    const seen = new Set<string>();
    const uniqueJobs = jobs.filter((job) => {
      if (seen.has(job.url)) return false;
      seen.add(job.url);
      return true;
    });

    // Sort by posted date (newest first)
    uniqueJobs.sort((a, b) => b.posted_at.getTime() - a.posted_at.getTime());

    return uniqueJobs.slice(0, params.limit || 20);
  }

  private async fetchFromAdzuna(
    params: JobSearchParams
  ): Promise<AggregatedJob[]> {
    const country = params.country || "us";
    const url = new URL(
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1`
    );
    url.searchParams.append("app_id", this.adzunaAppId!);
    url.searchParams.append("app_key", this.adzunaApiKey!);
    url.searchParams.append("results_per_page", String(params.limit || 20));
    url.searchParams.append("page", String(params.page || 1));

    if (params.query) {
      url.searchParams.append("what", params.query);
    }
    if (params.location) {
      url.searchParams.append("where", params.location);
    }
    if (params.salary_min) {
      url.searchParams.append("salary_min", String(params.salary_min));
    }
    if (params.salary_max) {
      url.searchParams.append("salary_max", String(params.salary_max));
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results.map((job: any) => this.normalizeAdzunaJob(job));
  }

  private normalizeAdzunaJob(job: any): AggregatedJob {
    return {
      id: `adzuna_${job.id}`,
      title: job.title,
      company: job.company?.display_name || "Unknown Company",
      location: job.location?.display_name || "Remote",
      description: job.description,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      salary_currency: job.salary_currency,
      job_type: job.contract_time || "full_time",
      url: job.redirect_url,
      source: "adzuna",
      posted_at: new Date(job.created_at),
      skills: this.extractSkills(job.description),
      requirements: this.extractRequirements(job.description),
      benefits: [],
    };
  }

  private getMockJobs(params: JobSearchParams): AggregatedJob[] {
    const mockJobs: AggregatedJob[] = [
      {
        id: "mock_1",
        title: "Senior Full Stack Developer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        description:
          "We are looking for a Senior Full Stack Developer with 5+ years of experience in React, Node.js, and PostgreSQL. You will lead our engineering team and build scalable web applications. Experience with TypeScript, Next.js, and cloud platforms (AWS/GCP) is required. Strong understanding of CI/CD, microservices architecture, and agile methodologies.",
        salary_min: 140000,
        salary_max: 180000,
        salary_currency: "USD",
        job_type: "full_time",
        url: "https://example.com/job/1",
        source: "mock",
        posted_at: new Date(Date.now() - 86400000 * 2),
        skills: [
          "React",
          "Node.js",
          "PostgreSQL",
          "TypeScript",
          "Next.js",
          "AWS",
        ],
        requirements: [
          "5+ years of experience",
          "Bachelor's degree in CS",
          "Experience with React and Node.js",
        ],
        benefits: [
          "Health insurance",
          "401(k) matching",
          "Remote work",
          "Unlimited PTO",
        ],
      },
      {
        id: "mock_2",
        title: "Frontend Engineer - React Specialist",
        company: "StartupXYZ",
        location: "New York, NY (Remote)",
        description:
          "Join our fast-growing startup as a Frontend Engineer. We're building the next generation of SaaS tools for developers. You should be proficient in React, TypeScript, and modern CSS frameworks. Experience with state management (Redux/Zustand), testing (Jest/Cypress), and design systems is a plus.",
        salary_min: 120000,
        salary_max: 160000,
        salary_currency: "USD",
        job_type: "full_time",
        url: "https://example.com/job/2",
        source: "mock",
        posted_at: new Date(Date.now() - 86400000 * 3),
        skills: [
          "React",
          "TypeScript",
          "CSS",
          "Redux",
          "Jest",
          "Cypress",
        ],
        requirements: [
          "3+ years of frontend experience",
          "Strong React skills",
          "Portfolio of projects",
        ],
        benefits: [
          "Equity",
          "Flexible hours",
          "Learning budget",
          "Home office stipend",
        ],
      },
      {
        id: "mock_3",
        title: "Backend Engineer - Python/Django",
        company: "DataFlow Systems",
        location: "Austin, TX",
        description:
          "Looking for a Backend Engineer to build and maintain our data processing pipelines. You'll work with Python, Django, PostgreSQL, and Redis. Experience with data engineering, ETL processes, and cloud infrastructure is highly valued. Knowledge of Airflow, Spark, or similar tools is a bonus.",
        salary_min: 130000,
        salary_max: 170000,
        salary_currency: "USD",
        job_type: "full_time",
        url: "https://example.com/job/3",
        source: "mock",
        posted_at: new Date(Date.now() - 86400000 * 1),
        skills: [
          "Python",
          "Django",
          "PostgreSQL",
          "Redis",
          "AWS",
          "Docker",
        ],
        requirements: [
          "4+ years backend experience",
          "Python expertise",
          "Database design skills",
        ],
        benefits: [
          "Health & dental",
          "Stock options",
          "Gym membership",
          "Conference budget",
        ],
      },
      {
        id: "mock_4",
        title: "DevOps Engineer",
        company: "CloudNative Solutions",
        location: "Seattle, WA (Hybrid)",
        description:
          "Seeking a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. You'll work with Kubernetes, Terraform, AWS, and GitHub Actions. Experience with monitoring tools (Prometheus, Grafana), infrastructure as code, and security best practices is essential.",
        salary_min: 135000,
        salary_max: 175000,
        salary_currency: "USD",
        job_type: "full_time",
        url: "https://example.com/job/4",
        source: "mock",
        posted_at: new Date(Date.now() - 86400000 * 4),
        skills: [
          "Kubernetes",
          "Terraform",
          "AWS",
          "Docker",
          "CI/CD",
          "Linux",
        ],
        requirements: [
          "3+ years DevOps experience",
          "Kubernetes certification preferred",
          "Scripting skills (Python/Bash)",
        ],
        benefits: [
          "Remote friendly",
          "Certification reimbursement",
          "Annual bonus",
          "Team retreats",
        ],
      },
      {
        id: "mock_5",
        title: "Machine Learning Engineer",
        company: "AI Innovations",
        location: "Boston, MA",
        description:
          "Join our ML team to build and deploy machine learning models at scale. You'll work with Python, TensorFlow/PyTorch, and cloud ML platforms. Experience with NLP, computer vision, or recommendation systems is a plus. Strong mathematical background and publication record is valued.",
        salary_min: 150000,
        salary_max: 200000,
        salary_currency: "USD",
        job_type: "full_time",
        url: "https://example.com/job/5",
        source: "mock",
        posted_at: new Date(Date.now() - 86400000 * 5),
        skills: [
          "Python",
          "TensorFlow",
          "PyTorch",
          "ML",
          "NLP",
          "AWS",
        ],
        requirements: [
          "MS/PhD in CS or related field",
          "3+ years ML experience",
          "Publication record",
        ],
        benefits: [
          "Academic collaboration",
          "Research budget",
          "Top-tier healthcare",
          "Relocation assistance",
        ],
      },
      {
        id: "mock_6",
        title: "Product Manager - Technical",
        company: "ProductFirst",
        location: "Remote (US)",
        description:
          "Looking for a Technical Product Manager to lead our developer tools product line. You'll define product strategy, work with engineering teams, and interface with customers. Technical background in software development is required. Experience with Agile/Scrum, data analytics, and user research.",
        salary_min: 140000,
        salary_max: 190000,
        salary_currency: "USD",
        job_type: "full_time",
        url: "https://example.com/job/6",
        source: "mock",
        posted_at: new Date(Date.now() - 86400000 * 2),
        skills: [
          "Product Management",
          "Agile",
          "Data Analysis",
          "User Research",
          "SQL",
          "Jira",
        ],
        requirements: [
          "5+ years PM experience",
          "Technical background",
          "B2B SaaS experience",
        ],
        benefits: [
          "Full remote",
          "Profit sharing",
          "Professional development",
          "Wellness program",
        ],
      },
    ];

    // Filter by query if provided
    if (params.query) {
      const query = params.query.toLowerCase();
      return mockJobs.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.skills.some((s) => s.toLowerCase().includes(query))
      );
    }

    // Filter by location if provided
    if (params.location) {
      const loc = params.location.toLowerCase();
      return mockJobs.filter((job) =>
        job.location.toLowerCase().includes(loc)
      );
    }

    return mockJobs;
  }

  private extractSkills(description: string): string[] {
    const commonSkills = [
      "JavaScript",
      "TypeScript",
      "React",
      "Vue",
      "Angular",
      "Node.js",
      "Python",
      "Django",
      "Flask",
      "Ruby",
      "Rails",
      "Go",
      "Rust",
      "Java",
      "Spring",
      "C#",
      ".NET",
      "PHP",
      "Laravel",
      "SQL",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Redis",
      "Elasticsearch",
      "AWS",
      "GCP",
      "Azure",
      "Docker",
      "Kubernetes",
      "Terraform",
      "CI/CD",
      "Git",
      "Linux",
      "GraphQL",
      "REST",
      "Microservices",
      "Machine Learning",
      "TensorFlow",
      "PyTorch",
      "NLP",
      "Data Engineering",
      "React Native",
      "Flutter",
      "Swift",
      "Kotlin",
      "Next.js",
      "Tailwind CSS",
    ];

    return commonSkills.filter((skill) =>
      description.toLowerCase().includes(skill.toLowerCase())
    );
  }

  private extractRequirements(description: string): string[] {
    // Simple extraction - in production, use NLP
    const sentences = description.split(/[.!?]+/);
    return sentences
      .filter(
        (s) =>
          s.toLowerCase().includes("experience") ||
          s.toLowerCase().includes("degree") ||
          s.toLowerCase().includes("required") ||
          s.toLowerCase().includes("must have")
      )
      .map((s) => s.trim())
      .filter((s) => s.length > 10)
      .slice(0, 5);
  }

  async saveJobsToDatabase(jobs: AggregatedJob[]): Promise<void> {
    for (const job of jobs) {
      await prisma.job.upsert({
        where: { id: job.id },
        update: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          jobType: job.job_type,
          url: job.url,
          source: job.source,
          postedAt: job.posted_at,
          skills: JSON.stringify(job.skills),
          requirements: JSON.stringify(job.requirements),
        },
        create: {
          id: job.id,
          externalId: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          jobType: job.job_type,
          url: job.url,
          source: job.source,
          postedAt: job.posted_at,
          skills: JSON.stringify(job.skills),
          requirements: JSON.stringify(job.requirements),
        },
      });
    }
  }
}

export const jobAggregationService = new JobAggregationService();
