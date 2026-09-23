import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Leaf, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

function Auth() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = returnTo && returnTo.startsWith("/") ? returnTo : "/onboarding";

  useEffect(() => {
    if (isAuthenticated) navigate(destination, { replace: true });
  }, [isAuthenticated, destination, navigate]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    try {
      await signIn("email-otp", fd);
      setStep("code");
      toast.success("Verification code sent — check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("code", code);
    try {
      await signIn("email-otp", fd);
      navigate(destination, { replace: true });
    } catch {
      setError("That code didn't match. Please try again.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoMode() {
    setLoading(true);
    setError(null);
    try {
      // Demo: sign in anonymously and head into the seeded demo experience.
      await signIn("anonymous");
      navigate("/onboarding?demo=1", { replace: true });
    } catch {
      setError("Could not start demo mode. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link
        to="/"
        className="mb-6 flex items-center gap-2"
        aria-label="Foodlink home"
      >
        <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Leaf className="size-5" />
        </span>
        <span className="text-2xl font-extrabold tracking-tight">
          FOOD<span className="text-primary">LINK</span>
        </span>
      </Link>

      <Card className="glass-strong w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {step === "email" ? "Sign in to FOODLINK" : "Check your email"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "We'll email you a 6-digit code. New here? This creates your account."
              : `Enter the 6-digit code sent to ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <Input
                type="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="border-white/70 bg-white/70"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Continue with email
              </Button>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-black/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-transparent px-2 text-xs uppercase text-muted-foreground backdrop-blur-sm">
                    demo mode
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/70 bg-white/60"
                onClick={handleDemoMode}
                disabled={loading}
              >
                <Sparkles className="mr-2 size-4" />
                Explore demo mode
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <input type="hidden" name="email" value={email} />
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {error && <p className="text-center text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || code.length !== 6}
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Verify & continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                disabled={loading}
              >
                Use a different email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 max-w-sm text-center text-xs leading-5 text-muted-foreground">
        By continuing you agree to handle donated food responsibly. FOODLINK
        connects restaurants with verified NGOs; food safety checks remain with
        donors and collectors.
      </p>
    </div>
  );
}

export default function AuthPage() {
  return <Auth />;
}
