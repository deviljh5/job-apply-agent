import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/navbar";
import ResumeUploader from "./resume-uploader";

export default async function ResumePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-zinc-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-zinc-900">Your Resume</h1>
        <p className="mt-2 text-zinc-600">
          Upload your resume PDF and let AI extract your skills and experience
        </p>
        <div className="mt-8">
          <ResumeUploader />
        </div>
      </main>
    </div>
  );
}
