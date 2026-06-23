"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wand2,
  FileText,
  Download,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Target,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TailoredResume {
  id: string;
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
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
}

export default function TailorPage() {
  const router = useRouter();
  const [resumeId, setResumeId] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [job, setJob] = useState<Job | null>(null);
  const [tailoredResume, setTailoredResume] = useState<TailoredResume | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"resume" | "cover" | "analysis">(
    "resume"
  );

  // For demo purposes, we'll use the first resume and job
  useEffect(() => {
    fetchResumesAndJobs();
  }, []);

  const fetchResumesAndJobs = async () => {
    try {
      const [resumesRes, jobsRes] = await Promise.all([
        fetch("/api/resumes"),
        fetch("/api/jobs/search"),
      ]);

      const resumes = await resumesRes.json();
      const jobs = await jobsRes.json();

      if (resumes.resumes?.length > 0) {
        setResumeId(resumes.resumes[0].id);
      }
      if (jobs.jobs?.length > 0) {
        setJobId(jobs.jobs[0].id);
        setJob(jobs.jobs[0]);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  };

  const handleTailor = async () => {
    if (!resumeId || !jobId) {
      setError("Please select a resume and job first");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobId }),
      });

      const data = await response.json();

      if (data.success) {
        setTailoredResume(data.tailoredResume);
      } else {
        setError(data.error || "Failed to tailor resume");
      }
    } catch (err) {
      setError("An error occurred while tailoring");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!tailoredResume) return;

    setIsGeneratingPDF(true);

    try {
      const response = await fetch("/api/tailor/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tailoredResumeId: tailoredResume.id }),
      });

      const data = await response.json();

      if (data.success) {
        window.open(data.pdfUrl, "_blank");
      } else {
        setError(data.error || "Failed to generate PDF");
      }
    } catch (err) {
      setError("An error occurred while generating PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-yellow-50";
    return "bg-red-50";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/jobs")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            AI Resume Tailoring
          </h1>
          <p className="mt-2 text-gray-600">
            Let AI customize your resume for this specific job
          </p>
        </div>

        {job && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Target Job
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  <p className="text-gray-600">{job.company}</p>
                  <p className="text-sm text-gray-500">{job.location}</p>
                </div>
                <Button
                  onClick={handleTailor}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tailoring...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Tailor Resume
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {tailoredResume && (
          <div className="space-y-6">
            {/* ATS Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-semibold">ATS Optimization Score</h3>
                  </div>
                  <span
                    className={`text-3xl font-bold ${getScoreColor(
                      tailoredResume.atsScore
                    )}`}
                  >
                    {tailoredResume.atsScore}%
                  </span>
                </div>
                <Progress
                  value={tailoredResume.atsScore}
                  className="h-3"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Your resume is optimized for Applicant Tracking Systems
                </p>
              </CardContent>
            </Card>

            {/* Keyword Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-green-600" />
                  Keyword Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">
                      <CheckCircle className="inline h-4 w-4 mr-1" />
                      Matched Keywords ({tailoredResume.keywordMatches.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {tailoredResume.keywordMatches.map((keyword) => (
                        <Badge
                          key={keyword}
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {tailoredResume.missingKeywords.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        <AlertCircle className="inline h-4 w-4 mr-1" />
                        Missing Keywords (
                        {tailoredResume.missingKeywords.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {tailoredResume.missingKeywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="bg-red-100 text-red-800"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={activeTab === "resume" ? "default" : "outline"}
                onClick={() => setActiveTab("resume")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Tailored Resume
              </Button>
              <Button
                variant={activeTab === "cover" ? "default" : "outline"}
                onClick={() => setActiveTab("cover")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Cover Letter
              </Button>
              <Button
                variant={activeTab === "analysis" ? "default" : "outline"}
                onClick={() => setActiveTab("analysis")}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Analysis
              </Button>
            </div>

            {/* Tab Content */}
            {activeTab === "resume" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>AI-Tailored Resume</CardTitle>
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">
                      Professional Summary
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {tailoredResume.tailoredContent.summary}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Experience</h3>
                    {tailoredResume.tailoredContent.experience.map(
                      (exp, index) => (
                        <div key={index} className="mb-4">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-sm text-gray-600 mb-2">
                            {exp.company} | {exp.duration}
                          </div>
                          <ul className="space-y-1">
                            {exp.bullets.map((bullet, i) => (
                              <li
                                key={i}
                                className="text-sm text-gray-700 flex items-start"
                              >
                                <span className="mr-2">•</span>
                                {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {tailoredResume.tailoredContent.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Education</h3>
                    {tailoredResume.tailoredContent.education.map(
                      (edu, index) => (
                        <div key={index} className="mb-2">
                          <div className="font-medium">{edu.degree}</div>
                          <div className="text-sm text-gray-600">
                            {edu.school} | {edu.year}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "cover" && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>AI-Generated Cover Letter</CardTitle>
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-line text-gray-700 leading-relaxed">
                      {tailoredResume.coverLetter}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "analysis" && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`p-4 rounded-lg ${getScoreBg(tailoredResume.atsScore)}`}>
                    <h4 className="font-semibold mb-2">ATS Score: {tailoredResume.atsScore}%</h4>
                    <p className="text-sm">
                      {tailoredResume.atsScore >= 80
                        ? "Excellent! Your resume is well-optimized for ATS systems."
                        : tailoredResume.atsScore >= 60
                        ? "Good, but there's room for improvement. Consider adding more relevant keywords."
                        : "Your resume needs more optimization. Focus on the missing keywords above."}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50">
                    <h4 className="font-semibold mb-2">What Changed</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Professional summary rewritten to match job requirements</li>
                      <li>• Experience bullets optimized with relevant keywords</li>
                      <li>• Skills section prioritized based on job description</li>
                      <li>• Cover letter generated with specific company references</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
