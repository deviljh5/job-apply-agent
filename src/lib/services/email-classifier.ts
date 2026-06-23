import OpenAI from "openai";

export type EmailCategory =
  | "INTERVIEW_INVITE"
  | "REJECTION"
  | "OFFER"
  | "OA"
  | "FOLLOW_UP"
  | "PHONE_SCREEN"
  | "APPLICATION_CONFIRMATION"
  | "OTHER";

export interface ClassifiedEmail {
  category: EmailCategory;
  confidence: number;
  summary: string;
  company?: string;
  position?: string;
  actionRequired: boolean;
  actionDeadline?: string; // ISO date string
  keyDetails: {
    interviewDate?: string;
    interviewLocation?: string;
    interviewLink?: string;
    contactName?: string;
    contactEmail?: string;
    nextSteps?: string;
  };
  sentiment: "positive" | "neutral" | "negative";
}

export class EmailClassifier {
  private openai: OpenAI;
  private isDemoMode: boolean;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isDemoMode = !apiKey || apiKey === "your-openai-api-key";
    this.openai = new OpenAI({
      apiKey: apiKey || "dummy-key",
    });
  }

  async classifyEmail(
    subject: string,
    body: string,
    sender: string
  ): Promise<ClassifiedEmail> {
    if (this.isDemoMode) {
      return this.classifyByKeywords(subject, body, sender);
    }

    const fullText = `Subject: ${subject}\nFrom: ${sender}\n\n${body}`;

    const prompt = `You are an expert job application email classifier. Analyze the following email and classify it into one of these categories:

Categories:
- INTERVIEW_INVITE: Email inviting the candidate to an interview (onsite, video, or technical)
- REJECTION: Email informing the candidate they were not selected
- OFFER: Email offering a job position or discussing compensation
- OA: Online Assessment / Coding Challenge invitation
- FOLLOW_UP: Follow-up email from recruiter or hiring manager
- PHONE_SCREEN: Phone screen invitation
- APPLICATION_CONFIRMATION: Confirmation that application was received
- OTHER: None of the above

Also provide:
1. Confidence score (0-1)
2. Brief summary (2-3 sentences)
3. Company name if identifiable
4. Position/role if identifiable
5. Whether action is required from the candidate
6. Action deadline if any
7. Key details: interview date, location, link, contact info, next steps
8. Sentiment: positive, neutral, or negative

Respond in JSON format exactly as specified below.

Email to classify:
${fullText.substring(0, 4000)}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a precise email classifier for job applications. You MUST respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content || "";

      // Extract JSON from the response
      let jsonStr = content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);

      return {
        category: this.validateCategory(parsed.category),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        summary: parsed.summary || "",
        company: parsed.company || undefined,
        position: parsed.position || undefined,
        actionRequired: !!parsed.actionRequired,
        actionDeadline: parsed.actionDeadline || undefined,
        keyDetails: {
          interviewDate: parsed.keyDetails?.interviewDate || undefined,
          interviewLocation:
            parsed.keyDetails?.interviewLocation || undefined,
          interviewLink: parsed.keyDetails?.interviewLink || undefined,
          contactName: parsed.keyDetails?.contactName || undefined,
          contactEmail: parsed.keyDetails?.contactEmail || undefined,
          nextSteps: parsed.keyDetails?.nextSteps || undefined,
        },
        sentiment: this.validateSentiment(
          parsed.sentiment || "neutral"
        ),
      };
    } catch (error) {
      console.error("Email classification error:", error);
      return {
        category: "OTHER",
        confidence: 0.1,
        summary: "Failed to classify email",
        actionRequired: false,
        keyDetails: {},
        sentiment: "neutral",
      };
    }
  }

  private classifyByKeywords(
    subject: string,
    body: string,
    sender: string
  ): ClassifiedEmail {
    const fullText = `${subject} ${body}`.toLowerCase();

    // Keyword-based classification
    const keywords: Record<EmailCategory, string[]> = {
      OFFER: ["offer", "congratulations", "pleased to offer", "extend an offer", "job offer"],
      INTERVIEW_INVITE: ["interview", "schedule", "meet with", "video call", "onsite"],
      REJECTION: ["regret", "not selected", "unfortunately", "not moving forward", "rejected"],
      OA: ["assessment", "coding challenge", "online test", "hackerrank", "codility", "leetcode"],
      PHONE_SCREEN: ["phone screen", "phone call", "recruiter call", "introductory call"],
      FOLLOW_UP: ["follow up", "update", "next steps", "checking in"],
      APPLICATION_CONFIRMATION: ["application received", "confirmed", "submitted", "thank you for applying"],
      OTHER: [],
    };

    let bestCategory: EmailCategory = "OTHER";
    let maxScore = 0;

    for (const [category, words] of Object.entries(keywords)) {
      const score = words.reduce((acc, word) => acc + (fullText.includes(word) ? 1 : 0), 0);
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category as EmailCategory;
      }
    }

    // Determine sentiment
    const positiveWords = ["congratulations", "pleased", "excited", "offer", "invite"];
    const negativeWords = ["regret", "unfortunately", "not selected", "rejected"];
    const sentiment = negativeWords.some(w => fullText.includes(w)) ? "negative" as const
      : positiveWords.some(w => fullText.includes(w)) ? "positive" as const
      : "neutral" as const;

    // Extract company name from sender
    const companyMatch = sender.match(/@([^.]+)\./);
    const company = companyMatch ? companyMatch[1].replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : undefined;

    // Determine action required
    const actionRequired = bestCategory === "OA" || bestCategory === "INTERVIEW_INVITE" || bestCategory === "PHONE_SCREEN" || fullText.includes("reply") || fullText.includes("confirm");

    return {
      category: bestCategory,
      confidence: maxScore > 0 ? 0.6 : 0.3,
      summary: `Demo mode: ${bestCategory.replace(/_/g, " ").toLowerCase()} email from ${company || "unknown company"}.`,
      company,
      actionRequired,
      keyDetails: {},
      sentiment,
    };
  }

  private validateCategory(category: string): EmailCategory {
    const validCategories: EmailCategory[] = [
      "INTERVIEW_INVITE",
      "REJECTION",
      "OFFER",
      "OA",
      "FOLLOW_UP",
      "PHONE_SCREEN",
      "APPLICATION_CONFIRMATION",
      "OTHER",
    ];
    return validCategories.includes(category as EmailCategory)
      ? (category as EmailCategory)
      : "OTHER";
  }

  private validateSentiment(
    sentiment: string
  ): "positive" | "neutral" | "negative" {
    if (["positive", "negative"].includes(sentiment)) {
      return sentiment as "positive" | "negative";
    }
    return "neutral";
  }

  // Map email category to application status update
  getStatusUpdate(category: EmailCategory): {
    status: string;
    priority: number;
  } {
    const statusMap: Record<EmailCategory, { status: string; priority: number }> =
      {
        INTERVIEW_INVITE: { status: "INTERVIEW", priority: 5 },
        REJECTION: { status: "REJECTED", priority: 1 },
        OFFER: { status: "OFFER", priority: 10 },
        OA: { status: "OA", priority: 4 },
        FOLLOW_UP: { status: "FOLLOW_UP", priority: 3 },
        PHONE_SCREEN: { status: "PHONE_SCREEN", priority: 4 },
        APPLICATION_CONFIRMATION: { status: "APPLIED", priority: 2 },
        OTHER: { status: "PENDING", priority: 0 },
      };
    return statusMap[category] || { status: "PENDING", priority: 0 };
  }
}
