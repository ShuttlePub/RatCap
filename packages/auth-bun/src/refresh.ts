import { isExpiringSoon, type AppSession } from "@shuttlepub/auth-core";
import {
  HYDRA_CLIENT_ID,
  HYDRA_CLIENT_SECRET,
  HYDRA_PUBLIC_URL,
  SESSION_REFRESH_SKEW_SECONDS,
} from "./env-cookies.ts";

type HydraRefreshConfig = {
  publicUrl: string;
  clientId: string;
  clientSecret: string;
};

export async function refreshWithHydra(hydra: HydraRefreshConfig, session: AppSession): Promise<AppSession | null> {
  if (!session.refreshToken) return null;
  try {
    const resp = await fetch(`${hydra.publicUrl}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(`${hydra.clientId}:${hydra.clientSecret}`),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };
    return {
      ...session,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || session.refreshToken,
      scope: data.scope,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
    };
  } catch {
    return null;
  }
}

export function refreshAccessToken(session: AppSession): Promise<AppSession | null> {
  return refreshWithHydra(
    { publicUrl: HYDRA_PUBLIC_URL, clientId: HYDRA_CLIENT_ID, clientSecret: HYDRA_CLIENT_SECRET },
    session,
  );
}

export function isSessionExpiringSoon(session: AppSession): boolean {
  return isExpiringSoon(session, SESSION_REFRESH_SKEW_SECONDS);
}
