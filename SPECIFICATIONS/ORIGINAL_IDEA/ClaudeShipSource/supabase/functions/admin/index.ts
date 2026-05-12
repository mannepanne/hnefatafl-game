import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Create service client once at module level (persists across warm invocations)
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function verifyAdmin(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Verify JWT and check admin status in parallel
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await serviceClient
    .from("leaderboard_profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const adminId = await verifyAdmin(req);
  if (!adminId) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const { action, userId } = body;

    // LIST USERS — run all three queries in parallel
    if (action === "list-users") {
      const [usersRes, profilesRes, gamesRes] = await Promise.all([
        serviceClient.auth.admin.listUsers({ perPage: 1000 }),
        serviceClient.from("leaderboard_profiles").select("*"),
        serviceClient.from("game_results").select("user_id"),
      ]);

      if (usersRes.error) throw usersRes.error;

      const gameCounts = new Map<string, number>();
      for (const r of gamesRes.data ?? []) {
        gameCounts.set(r.user_id, (gameCounts.get(r.user_id) ?? 0) + 1);
      }

      const profileMap = new Map(
        (profilesRes.data ?? []).map((p: Record<string, unknown>) => [
          p.user_id,
          p,
        ]),
      );

      const result = usersRes.data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        profile: profileMap.get(u.id) ?? null,
        game_count: gameCounts.get(u.id) ?? 0,
      }));

      return json({ users: result });
    }

    // EXPORT USER DATA — run all three queries in parallel
    if (action === "export-user") {
      if (!userId) return json({ error: "userId required" }, 400);

      const [authRes, profileRes, gamesRes] = await Promise.all([
        serviceClient.auth.admin.getUserById(userId),
        serviceClient
          .from("leaderboard_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        serviceClient
          .from("game_results")
          .select("*")
          .eq("user_id", userId)
          .order("played_at", { ascending: false }),
      ]);

      return json({
        auth: authRes.data?.user
          ? {
              id: authRes.data.user.id,
              email: authRes.data.user.email,
              created_at: authRes.data.user.created_at,
              last_sign_in_at: authRes.data.user.last_sign_in_at,
            }
          : null,
        profile: profileRes.data ?? null,
        game_results: gamesRes.data ?? [],
      });
    }

    // DELETE USER — sequential (order matters)
    if (action === "delete-user") {
      if (!userId) return json({ error: "userId required" }, 400);

      if (userId === adminId) {
        return json({ error: "Cannot delete your own admin account" }, 400);
      }

      // Delete data first, then auth user
      await Promise.all([
        serviceClient.from("game_results").delete().eq("user_id", userId),
        serviceClient
          .from("leaderboard_profiles")
          .delete()
          .eq("user_id", userId),
      ]);

      const { error: authErr } =
        await serviceClient.auth.admin.deleteUser(userId);
      if (authErr) throw authErr;

      return json({ success: true });
    }

    // UPDATE USER PROFILE
    if (action === "update-user") {
      if (!userId) return json({ error: "userId required" }, 400);

      const displayName = body.displayName as string | undefined;
      const isPublic = body.isPublic as boolean | undefined;

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (displayName !== undefined) updates.display_name = displayName;
      if (isPublic !== undefined) updates.is_public = isPublic;

      const { error: updateErr } = await serviceClient
        .from("leaderboard_profiles")
        .update(updates)
        .eq("user_id", userId);

      if (updateErr) throw updateErr;
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Admin function error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
