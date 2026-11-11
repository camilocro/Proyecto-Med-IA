import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase se usa SOLO para el inicio de sesión con Google: confirma la identidad y
 * entrega un access_token que el backend cambia por el token propio de Med-IA.
 * Flujo PKCE: los tokens no viajan en la URL, solo un código de un solo uso.
 */
let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
    cliente = createClient(url, anonKey, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false, // el código lo canjea /auth/callback a mano
        autoRefreshToken: false,
        persistSession: true, // necesario para guardar el verificador PKCE durante la redirección
      },
    });
  }
  return cliente;
}

/** Ruta a la que vuelve Google después de elegir la cuenta. */
export const RUTA_CALLBACK_GOOGLE = "/auth/callback";
