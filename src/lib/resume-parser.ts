import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  summary: string;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    graduationYear: string;
  }>;
  skills: string[];
  certifications?: string[];
}

export async function parseResume(_buffer: Buffer): Promise<ParsedResume> {
  // In production, this would use pdf-parse or similar to extract text from PDF
  // then send to OpenAI for structured parsing
  // For now, return demo data if no API key is configured

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your-openai-api-key") {
    return getMockParsedData();
  }

  try {
    // In production, extract text from PDF buffer here
    const resumeText = "Extracted PDF text would go here...";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a resume parser. Extract structured information from the resume text provided.
Return a JSON object with these fields:
- name: full name
- email: email address
- phone: phone number
- linkedin: LinkedIn URL (if present)
- summary: brief professional summary
- experience: array of {company, title, startDate, endDate, description}
- education: array of {institution, degree, field, graduationYear}
- skills: array of technical and soft skills
- certifications: array of certifications (if any)`,
        },
        {
          role: "user",
          content: `Parse this resume and return structured JSON:\n\n${resumeText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content) as ParsedResume;
  } catch (error) {
    console.error("Resume parsing error:", error);
    return getMockParsedData();
  }
}

function getMockParsedData(): ParsedResume {
  return {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    linkedin: "https://linkedin.com/in/johndoe",
    summary:
      "Senior Software Engineer with 8+ years of experience building scalable web applications. Expert in React, Node.js, and cloud infrastructure.",
    experience: [
      {
        company: "Tech Corp",
        title: "Senior Software Engineer",
        startDate: "2021-03",
        endDate: "Present",
        description:
          "Led a team of 5 engineers building microservices architecture. Reduced API latency by 40%.",
      },
      {
        company: "StartupXYZ",
        title: "Software Engineer",
        startDate: "2018-06",
        endDate: "2021-02",
        description:
          "Built full-stack features for a SaaS platform serving 10K+ users.",
      },
    ],
    education: [
      {
        institution: "Stanford University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        graduationYear: "2018",
      },
    ],
    skills: [
      "React",
      "TypeScript",
      "Node.js",
      "Python",
      "AWS",
      "PostgreSQL",
      "Docker",
      "Kubernetes",
    ],
    certifications: ["AWS Solutions Architect"],
  };
}
