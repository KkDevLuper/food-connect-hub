import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Central client-side session/profile hook: auth user + role + org row +
 * onboarding state. Every dashboard uses this to route and render.
 */
export function useProfile() {
  const profile = useQuery(api.profiles.myProfile);
  return {
    profile,
    isLoading: profile === undefined,
    role: profile?.role ?? null,
    org: profile?.org ?? null,
    isOnboarded: profile?.onboardingComplete ?? false,
  };
}

export type OrgId = Id<"restaurants"> | Id<"ngos">;
