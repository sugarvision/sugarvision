/**
 * Configuração centralizada de variáveis de ambiente do SugarVision.
 * Permite alternar perfeitamente entre os ambientes de Desenvolvimento (Local)
 * e Produção (Vercel / Nuvem) sem código chumbado.
 */

// URL base da API FastAPI (remove barra final se houver)
export const API_URL: string = (
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "http://127.0.0.1:8000"
);

// Endpoint da instância Supabase
export const SUPABASE_URL: string = (
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://hbropsjrbebbuiwcjrcu.supabase.co"
);

// Chave pública anônima do Supabase
export const SUPABASE_ANON_KEY: string = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development"
);

// Indicador de ambiente
export const IS_PRODUCTION: boolean = process.env.NODE_ENV === "production";
export const IS_DEVELOPMENT: boolean = process.env.NODE_ENV === "development";

/**
 * Retorna se o backend configurado é localhost/127.0.0.1.
 */
export function isLocalBackend(): boolean {
  return API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
}

/**
 * Constrói a URL completa para um endpoint da API.
 */
export function getApiEndpoint(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
}
