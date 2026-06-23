import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/navbar";
import {
  FileText,
  Briefcase,
  Send,
  Wand2,
  Mail,
  Puzzle,
  TrendingUp,
  Clock,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const features = [
    {
      title: "Resume",
      description: "Upload and manage your resume. AI-powered parsing and analysis.",
      icon: FileText,
      href: "/resume",
      color: "bg-blue-50 text-blue-600",
      borderColor: "border-blue-200",
    },
    {
      title: "Job Matches",
      description: "Discover AI-matched job opportunities from multiple sources.",
      icon: Briefcase,
      href: "/jobs",
      color: "bg-indigo-50 text-indigo-600",
      borderColor: "border-indigo-200",
    },
    {
      title: "AI Tailor",
      description: "Generate tailored resumes and cover letters for each job.",
      icon: Wand2,
      href: "/tailor",
      color: "bg-purple-50 text-purple-600",
      borderColor: "border-purple-200",
    },
    {
      title: "Applications",
      description: "Track applications and get email response updates.",
      icon: Send,
      href: "/applications",
      color: "bg-green-50 text-green-600",
      borderColor: "border-green-200",
    },
    {
      title: "Email Sync",
      description: "Connect Gmail to auto-track interview invites and offers.",
      icon: Mail,
      href: "/applications",
      color: "bg-orange-50 text-orange-600",
      borderColor: "border-orange-200",
    },
    {
      title: "Chrome Extension",
      description: "Auto-fill job applications on Greenhouse, Lever, Workday, etc.",
      icon: Puzzle,
      href: "#",
      color: "bg-yellow-50 text-yellow-600",
      borderColor: "border-yellow-200",
      external: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {session.user?.name || "Job Seeker"}
          </h1>
          <p className="mt-2 text-gray-600">
            Your AI-powered job application dashboard
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-500">Active Jobs</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">--</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-500">Applied</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">--</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-gray-500">Interviews</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">--</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-500">New Emails</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">--</div>
          </div>
        </div>

        {/* Features Grid */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <a
                key={feature.title}
                href={feature.href}
                className={`group block rounded-xl bg-white p-6 border ${feature.borderColor} shadow-sm hover:shadow-md transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg ${feature.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-gray-700">
                      {feature.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {feature.description}
                    </p>
                    <div className="mt-3 flex items-center text-sm font-medium text-blue-600">
                      Get Started
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* How to use Chrome Extension */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chrome Extension Ready</h3>
              <p className="mt-1 text-sm text-gray-600">
                Load the extension from <code className="bg-white px-1 py-0.5 rounded text-xs">chrome-extension/dist/</code> to auto-fill job applications on Greenhouse, Lever, Workday, LinkedIn, Indeed, and more.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
