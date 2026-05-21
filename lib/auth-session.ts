export const AUTH_SESSION_KEY = 'stellar-earn-session';

export type AuthSession = {
  userId: string | null;
  walletConnected: boolean;
  username: string | null;
  role: 'earner' | 'sponsor' | null;
  walletAddress: string | null;
};

export function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    return {
      userId: parsed.userId ?? null,
      walletConnected: Boolean(parsed.walletConnected),
      username: parsed.username ?? null,
      role: parsed.role ?? null,
      walletAddress: parsed.walletAddress ?? null,
    };
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_KEY);
}
