import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { EmailClassifier } from "./email-classifier";

export class GmailService {
  private classifier: EmailClassifier;

  constructor() {
    this.classifier = new EmailClassifier();
  }

  async syncEmails(userId: string, maxResults: number = 50) {
    // Get user's email sync credentials
    const emailSync = await prisma.emailSync.findUnique({
      where: { userId },
    });

    if (!emailSync || !emailSync.syncEnabled) {
      throw new Error("Email sync not configured or disabled");
    }

    // Get user's access token from NextAuth account
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: "google",
      },
    });

    if (!account?.access_token) {
      throw new Error("Google account not connected");
    }

    // Initialize Gmail API
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: account.access_token });

    const gmail = google.gmail({ version: "v1", auth });

    // Search for job-related emails
    const jobSearchQueries = [
      "from:greenhouse.io",
      "from:lever.co",
      "from:workday.com",
      "from:ashbyhq.com",
      "from:linkedin.com subject:application",
      "from:indeed.com",
      "from:glassdoor.com",
      "from:ziprecruiter.com",
      "subject:interview",
      "subject:application",
      "subject:offer",
      "subject:rejection",
      "subject:thank you for applying",
      "subject:next steps",
      "subject:assessment",
      "subject:phone screen",
    ];

    const allMessages: any[] = [];
    const processedIds = new Set<string>();

    for (const query of jobSearchQueries) {
      try {
        const response = await gmail.users.messages.list({
          userId: "me",
          q: query,
          maxResults: Math.min(maxResults, 20),
          labelIds: ["INBOX", "SENT"],
        });

        if (response.data.messages) {
          for (const msg of response.data.messages) {
            if (!processedIds.has(msg.id!)) {
              allMessages.push(msg);
              processedIds.add(msg.id!);
            }
          }
        }
      } catch (error) {
        console.warn(`Query failed for "${query}":`, error);
      }
    }

    // Get existing email IDs to avoid duplicates
    const existingEmails = await prisma.applicationEmail.findMany({
      where: {
        application: { userId },
      },
      select: { gmailId: true },
    });
    const existingIds = new Set(existingEmails.map((e) => e.gmailId));

    const processedEmails = [];

    for (const message of allMessages) {
      if (existingIds.has(message.id!)) continue;

      try {
        // Get full email details
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: message.id!,
        });

        const headers = detail.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const sender =
          headers.find((h) => h.name === "From")?.value || "Unknown";
        const date =
          headers.find((h) => h.name === "Date")?.value || new Date().toISOString();

        // Extract body
        let body = "";
        const parts = detail.data.payload?.parts || [];
        for (const part of parts) {
          if (part.mimeType === "text/plain" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
            break;
          } else if (part.mimeType === "text/html" && part.body?.data) {
            body = Buffer.from(part.body.data, "base64").toString("utf-8");
          }
        }

        // If no body found in parts, try payload body
        if (!body && detail.data.payload?.body?.data) {
          body = Buffer.from(
            detail.data.payload.body.data,
            "base64"
          ).toString("utf-8");
        }

        // Strip HTML tags for plain text
        body = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

        // Classify email
        const classification = await this.classifier.classifyEmail(
          subject,
          body,
          sender
        );

        // Try to find matching application
        let application = await this.findMatchingApplication(
          userId,
          classification.company,
          classification.position,
          subject,
          body
        );

        // If no matching application and it's job-related, create a new application record
        if (!application && classification.category !== "OTHER") {
          // Try to find or create job
          const job = await this.findOrCreateJob(
            classification.company,
            classification.position,
            subject
          );

          application = await prisma.application.create({
            data: {
              userId,
              jobId: job.id,
              status: classification.category,
              submittedAt: new Date(),
              submittedVia: "email",
            },
            include: { job: true },
          });
        }

        if (application) {
          // Save email to database
          const email = await prisma.applicationEmail.create({
            data: {
              applicationId: application.id,
              gmailId: message.id!,
              subject,
              sender,
              receivedAt: new Date(date),
              category: classification.category,
              summary: classification.summary,
              actionRequired: classification.actionRequired,
              isRead: !detail.data.labelIds?.includes("UNREAD"),
            },
          });

          // Update application status if this is a more significant update
          const statusUpdate = this.classifier.getStatusUpdate(
            classification.category
          );
          const currentStatus = application.status;
          const currentPriority = this.getStatusPriority(currentStatus);

          if (statusUpdate.priority > currentPriority) {
            await prisma.application.update({
              where: { id: application.id },
              data: {
                status: statusUpdate.status,
                updatedAt: new Date(),
              },
            });
          }

          processedEmails.push({
            emailId: email.id,
            category: classification.category,
            company: classification.company,
            status: statusUpdate.status,
          });
        }
      } catch (error) {
        console.error("Error processing email:", error);
      }
    }

    // Update last sync time
    await prisma.emailSync.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });

    return {
      synced: processedEmails.length,
      emails: processedEmails,
      lastSyncAt: new Date(),
    };
  }

  private async findMatchingApplication(
    userId: string,
    company?: string,
    position?: string,
    subject?: string,
    body?: string
  ) {
    if (!company) return null;

    const companyLower = company.toLowerCase();
    const searchText = `${subject || ""} ${body || ""}`.toLowerCase();

    // Find applications with matching company
    const applications = await prisma.application.findMany({
      where: {
        userId,
        job: {
          company: {
            contains: companyLower,
          },
        },
      },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });

    if (applications.length > 0) {
      return applications[0];
    }

    // Try broader search by company name variations
    const allApplications = await prisma.application.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    for (const app of allApplications) {
      if (
        searchText.includes(app.job.company.toLowerCase()) ||
        companyLower.includes(app.job.company.toLowerCase()) ||
        app.job.company.toLowerCase().includes(companyLower)
      ) {
        return app;
      }
    }

    return null;
  }

  private async findOrCreateJob(
    company?: string,
    position?: string,
    subject?: string
  ) {
    // Extract position from subject if not provided
    const extractedPosition =
      position ||
      subject?.match(
        /(?:for|re:).{0,20}?(?:engineer|developer|manager|designer|analyst|specialist|intern|coordinator|lead|director|architect)/i
      )?.[0] ||
      "Unknown Position";

    const companyName = company || "Unknown Company";

    // Check if job exists
    const existingJob = await prisma.job.findFirst({
      where: {
        company: companyName,
        title: extractedPosition,
      },
    });

    if (existingJob) return existingJob;

    // Create a new job placeholder
    return await prisma.job.create({
      data: {
        source: "email",
        externalId: `email-${Date.now()}`,
        title: extractedPosition,
        company: companyName,
        location: "Unknown",
        description: `Position discovered via email: ${subject || "Unknown"}`,
        requirements: "[]",
        skills: "[]",
        url: "",
        jobType: "FULL_TIME",
        postedAt: new Date(),
      },
    });
  }

  private getStatusPriority(status: string): number {
    const priorities: Record<string, number> = {
      PENDING: 0,
      APPLIED: 1,
      APPLICATION_CONFIRMATION: 2,
      OA: 3,
      PHONE_SCREEN: 4,
      FOLLOW_UP: 5,
      INTERVIEW: 6,
      REJECTED: 7,
      OFFER: 10,
    };
    return priorities[status] || 0;
  }
}
