import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  try {
    const session = await getServerSession(authOptions);

    if (session) {
      redirect("/dashboard");
    }
  } catch (e) {
    // If session check fails (e.g. DB not ready), continue to jobs page
  }

  // No session or demo mode: go directly to jobs page
  redirect("/jobs");
}
