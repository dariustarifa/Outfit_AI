import type { Profile } from "./types";

export interface ProfileDisplay {
  greetingName: string;
  name: string;
  preferredName: string;
  age: string;
  height: string;
  city: string;
}

export function getProfileDisplay(profile: Profile | null): ProfileDisplay {
  const name = profile?.name.trim() ?? "";
  const preferredName =
    profile?.preferredName?.trim() || name.split(/\s+/)[0] || "";

  return {
    greetingName: preferredName || name || "Tú",
    name: profile?.name ?? "",
    preferredName: preferredName || "Sin indicar",
    age: profile ? `${profile.age} años` : "",
    height: profile ? `${profile.heightCm} cm` : "",
    city: profile?.city ?? "",
  };
}
