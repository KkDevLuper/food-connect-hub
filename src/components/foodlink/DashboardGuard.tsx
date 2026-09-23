import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { LoadingState } from "./States";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import type { Role } from "@/convex/schema";

/**
 * Route guard for FOODLINK pages: requires sign-in, then the right role.
 * Signed-out users are sent to /auth with a returnTo path; signed-in users
 * with the wrong role see a friendly explanation.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: Array<"restaurant" | "ngo" | "admin">;
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!profile) return null;

  if (!profile.role) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="glass-strong w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Leaf className="size-5" />
            </div>
            <CardTitle>Finish setting up your account</CardTitle>
            <CardDescription>
              Choose whether you are a restaurant or an NGO to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/onboarding")}>
              Continue setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roles.includes(profile.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="glass-strong w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Wrong account type</CardTitle>
            <CardDescription>
              This page is for {roles.join(" / ")} accounts. You are signed in
              as {profile.role}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() =>
                navigate(
                  profile.role === "restaurant"
                    ? "/restaurant/dashboard"
                    : profile.role === "ngo"
                      ? "/ngo/dashboard"
                      : "/admin/dashboard",
                )
              }
            >
              Go to my dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}
