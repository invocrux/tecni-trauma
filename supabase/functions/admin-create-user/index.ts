import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

type CreateUserPayload = {
  email?: string;
  password?: string;
  fullName?: string | null;
  role?: "admin" | "staff";
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authHeader) {
    return json({ error: "Missing configuration" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: callerData, error: callerError } = await adminClient.auth.getUser(token);

  if (callerError || !callerData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const callerId = callerData.user.id;
  const { data: callerAppUser, error: callerAppUserError } = await adminClient
    .from("app_users")
    .select("role, status")
    .eq("id", callerId)
    .maybeSingle();

  if (callerAppUserError || !callerAppUser) {
    return json({ error: "Caller profile not found" }, 403);
  }

  if (!["admin", "super_admin"].includes(callerAppUser.role) || callerAppUser.status !== "active") {
    return json({ error: "Insufficient privileges" }, 403);
  }

  const payload = (await req.json()) as CreateUserPayload;
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password?.trim() ?? "";
  const fullName = payload.fullName?.trim() || null;
  const requestedRole = payload.role ?? "staff";

  if (!email || !password) {
    return json({ error: "Email and password are required" }, 400);
  }

  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, 400);
  }

  if (callerAppUser.role !== "super_admin" && requestedRole !== "staff") {
    return json({ error: "Only super admins can create admin users" }, 403);
  }

  const { data: createdUserData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
    app_metadata: { app_role: requestedRole },
  });

  if (createError || !createdUserData.user) {
    return json({ error: createError?.message ?? "Failed to create user" }, 400);
  }

  const createdUser = createdUserData.user;

  const { error: upsertError } = await adminClient.from("app_users").upsert({
    id: createdUser.id,
    email,
    full_name: fullName,
    role: requestedRole,
    status: "active",
    last_sign_in_at: null,
  });

  if (upsertError) {
    return json({ error: upsertError.message }, 500);
  }

  return json({
    id: createdUser.id,
    email,
    full_name: fullName,
    role: requestedRole,
    status: "active",
  }, 201);
});
