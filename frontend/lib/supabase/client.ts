import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../env";

export const TOKEN_STORAGE_KEY = "sugarvision_jwt_token";
export const COOKIE_TOKEN_NAME = "sb_access_token";

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Persiste o token JWT de forma segura no Cookie e no LocalStorage.
 */
export function persistAuthToken(token: string | null) {
  if (typeof window === "undefined") return;

  if (token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.warn("Falha ao salvar token no LocalStorage", e);
    }

    document.cookie = `${COOKIE_TOKEN_NAME}=${encodeURIComponent(
      token
    )}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {}
    document.cookie = `${COOKIE_TOKEN_NAME}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * Obtém o token JWT ativo (lê do LocalStorage ou do Cookie).
 */
export function getActiveAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (localToken) return localToken;

  const match = document.cookie.match(new RegExp(`(^|; )${COOKIE_TOKEN_NAME}=([^;]*)`));
  if (match) {
    return decodeURIComponent(match[2]);
  }

  return null;
}

/**
 * Helper fetch que anexa automaticamente o cabeçalho Authorization: Bearer <token>.
 * Atende ao requisito de repassar o token JWT nas chamadas que exigem autenticação.
 * Inclui timeout padrão de 3s para evitar travamento da UI em backends offline ou inacessíveis.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const token = getActiveAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const timeoutMs = init?.timeoutMs ?? 3000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init?.signal || controller.signal;

  try {
    return await fetch(input, {
      ...init,
      headers,
      signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
