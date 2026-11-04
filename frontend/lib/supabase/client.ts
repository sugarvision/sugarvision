import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../env";
import {
  CONTINGENCY_TIMEOUT_MS,
  getOfflineSampleInference,
  CONTINGENCY_HISTORY,
  showContingencyToast,
} from "../contingency";

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
 * Trata respostas de contingência offline quando a API está fora do ar ou ultrapassa 3s.
 */
function handleFallbackResponse(url: string): Response | null {
  try {
    if (url.includes("/api/analyze-sample")) {
      let filename = "wheat_test_01_Terraref_1.jpg";
      try {
        const parsedUrl = new URL(url, "http://127.0.0.1:8000");
        filename = parsedUrl.searchParams.get("filename") || filename;
      } catch {}
      const offline = getOfflineSampleInference(filename);
      return new Response(JSON.stringify(offline), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/api/historico")) {
      showContingencyToast();
      return new Response(JSON.stringify(CONTINGENCY_HISTORY), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-Total-Count": String(CONTINGENCY_HISTORY.length),
        },
      });
    }
  } catch (e) {
    console.debug("Erro no interceptador de contingência:", e);
  }
  return null;
}

/**
 * Interceptador HTTP resiliente:
 * - Anexa automaticamente o cabeçalho Authorization: Bearer <token>.
 * - Intercepta falhas e timeouts de 3 segundos para carregar dados de contingência offline.
 * - Evita telas travadas e quedas durante avaliações ou quando a rede/Wi-Fi cair.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number; disableContingency?: boolean }
): Promise<Response> {
  const token = getActiveAuthToken();
  const headers = new Headers(init?.headers || {});

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Timeout padrão de 3 segundos conforme requisito de contingência
  const timeoutMs = init?.timeoutMs ?? CONTINGENCY_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init?.signal || controller.signal;

  const urlStr =
    typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  try {
    const res = await fetch(input, {
      ...init,
      headers,
      signal,
    });

    if (!res.ok && res.status >= 500 && !init?.disableContingency) {
      const fallbackRes = handleFallbackResponse(urlStr);
      if (fallbackRes) return fallbackRes;
    }

    return res;
  } catch (err) {
    if (!init?.disableContingency) {
      const fallbackRes = handleFallbackResponse(urlStr);
      if (fallbackRes) return fallbackRes;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
