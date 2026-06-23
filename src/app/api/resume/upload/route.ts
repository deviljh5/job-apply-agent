import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import { parseResume } from "@/lib/resume-parser";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save file to uploads directory
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}_${file.name}`;
    const uploadDir = join(process.cwd(), "uploads", "resumes");
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // Parse resume with AI
    const parsedData = await parseResume(buffer);

    // Save to database
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        originalUrl: `/uploads/resumes/${filename}`,
        parsedData: JSON.stringify(parsedData),
      },
    });

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      parsedData,
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload resume" },
      { status: 500 }
    );
  }
}
