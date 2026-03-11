import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

function pickBearerHeader(value: string | null): string | undefined {
  if (!value) return undefined;
  return value.toLowerCase().startsWith("bearer ") ? value : undefined;
}

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const authorization =
    pickBearerHeader(headerStore.get("authorization")) ||
    pickBearerHeader(headerStore.get("Authorization"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: authorization ? { Authorization: authorization } : {},
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    },
  );
}
