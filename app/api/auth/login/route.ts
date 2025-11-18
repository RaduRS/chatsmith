import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail)
    return NextResponse.json({ error: "ADMIN_EMAIL not set" }, { status: 500 });

  // Try Supabase sign-in first
  const supabase = createServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If Supabase login fails, allow hardcoded admin fallback
  const isAdminFallback = email === adminEmail && password === adminPassword;
  if (error && !isAdminFallback)
    return NextResponse.json({ error: error.message }, { status: 401 });

  const authedEmail =
    data?.user?.email ?? (isAdminFallback ? adminEmail : null);
  if (authedEmail !== adminEmail)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  cookies().set("admin_session", "1", { path: "/", httpOnly: true });
  return NextResponse.json({ ok: true });
}
