import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getPortfolioMetadata } from "@/lib/storage";
import AdminDashboard from "./AdminDashboard";
import LoginForm from "./LoginForm";

// Force dynamic server-rendering for checking admin cookies
export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const isAuth = token ? await verifyToken(token) : null;

  if (!isAuth) {
    return <LoginForm />;
  }

  const metadata = await getPortfolioMetadata();
  return <AdminDashboard initialMetadata={metadata} />;
}
