import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  // In demo mode (no Google OAuth configured), go directly to jobs page
  if (!process.env.GOOGLE_CLIENT_ID) {
    redirect("/jobs");
  }

  redirect("/login");
}
