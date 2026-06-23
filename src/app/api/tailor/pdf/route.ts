import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tailoredResumeId } = body;

    if (!tailoredResumeId) {
      return NextResponse.json(
        { error: "Missing tailoredResumeId" },
        { status: 400 }
      );
    }

    const tailoredResume = await prisma.tailoredResume.findUnique({
      where: { id: tailoredResumeId },
      include: {
        resume: true,
        job: true,
      },
    });

    if (!tailoredResume) {
      return NextResponse.json(
        { error: "Tailored resume not found" },
        { status: 404 }
      );
    }

    const parsedData = JSON.parse(tailoredResume.resume?.parsedData || "{}");
    const tailoredContent = JSON.parse(tailoredResume.tailoredUrl || "{}");
    const job = tailoredResume.job;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
          h1 { font-size: 28px; margin-bottom: 5px; }
          h2 { font-size: 20px; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 25px; }
          .contact { color: #666; margin-bottom: 20px; }
          .job { margin-bottom: 15px; }
          .job-title { font-weight: bold; }
          .job-company { font-style: italic; color: #555; }
          .bullet { margin-left: 20px; margin-bottom: 5px; }
          .skills { display: flex; flex-wrap: wrap; gap: 10px; }
          .skill { background: #f0f0f0; padding: 5px 10px; border-radius: 15px; font-size: 14px; }
          .ats-score { text-align: center; margin: 20px 0; padding: 15px; background: #e8f5e9; border-radius: 8px; }
          .score-value { font-size: 36px; font-weight: bold; color: #2e7d32; }
        </style>
      </head>
      <body>
        <h1>${parsedData.name || "Your Name"}</h1>
        <div class="contact">
          ${parsedData.email || ""} | ${parsedData.phone || ""} | ${parsedData.location || ""}
        </div>

        <h2>Professional Summary</h2>
        <p>${tailoredContent.summary || ""}</p>

        <div class="ats-score">
          <div>ATS Optimization Score</div>
          <div class="score-value">${tailoredResume.atsScore || 0}%</div>
        </div>

        <h2>Experience</h2>
        ${(tailoredContent.experience || [])
          .map(
            (exp: any) => `
          <div class="job">
            <div class="job-title">${exp.title}</div>
            <div class="job-company">${exp.company} | ${exp.duration}</div>
            ${(exp.bullets || [])
              .map((bullet: string) => `<div class="bullet">• ${bullet}</div>`)
              .join("")}
          </div>
        `
          )
          .join("")}

        <h2>Skills</h2>
        <div class="skills">
          ${(tailoredContent.skills || [])
            .map((skill: string) => `<span class="skill">${skill}</span>`)
            .join("")}
        </div>

        <h2>Education</h2>
        ${(tailoredContent.education || [])
          .map(
            (edu: any) => `
          <div class="job">
            <div class="job-title">${edu.degree}</div>
            <div class="job-company">${edu.school} | ${edu.year}</div>
          </div>
        `
          )
          .join("")}

        <h2>Cover Letter</h2>
        <div style="white-space: pre-line; font-family: Arial, sans-serif; line-height: 1.6;">
          ${tailoredResume.coverLetter || ""}
        </div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    await browser.close();

    // Save PDF to file
    const fs = require("fs");
    const path = require("path");
    const uploadsDir = path.join(process.cwd(), "uploads", "tailored");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const pdfPath = path.join(uploadsDir, `${tailoredResumeId}.pdf`);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Update database with PDF URL
    await prisma.tailoredResume.update({
      where: { id: tailoredResumeId },
      data: { tailoredUrl: `/uploads/tailored/${tailoredResumeId}.pdf` },
    });

    return NextResponse.json({
      success: true,
      pdfUrl: `/uploads/tailored/${tailoredResumeId}.pdf`,
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
