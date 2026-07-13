import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userRes.user;

    const body = await req.json().catch(() => ({}));
    const whatsapp = typeof body?.whatsapp_number === "string" ? body.whatsapp_number.trim() : "";
    if (whatsapp.length < 6 || whatsapp.length > 32) {
      return new Response(JSON.stringify({ error: "Valid WhatsApp number required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles").select("id, business_name, email")
      .eq("user_id", user.id).maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("admin_settings").select("setting_key, setting_value")
      .in("setting_key", ["activation_amount", "paystack_secret_key"]);
    const settingsMap: Record<string, string> = {};
    (settings || []).forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });

    const amountNaira = Number(settingsMap.activation_amount || "0");
    const secretKey = settingsMap.paystack_secret_key;
    if (!amountNaira || amountNaira <= 0) {
      return new Response(JSON.stringify({ error: "Activation amount not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Payment provider not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `RSM_${crypto.randomUUID().replace(/-/g, "")}`;

    // Initialize with Paystack
    const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: profile.email,
        amount: Math.round(amountNaira * 100), // kobo
        reference,
        currency: "NGN",
        metadata: {
          user_id: user.id,
          profile_id: profile.id,
          whatsapp_number: whatsapp,
        },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson?.status) {
      return new Response(JSON.stringify({ error: initJson?.message || "Paystack init failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save pending payment
    const { error: insErr } = await admin.from("payments").insert({
      profile_id: profile.id,
      user_id: user.id,
      name: profile.business_name,
      email: profile.email,
      whatsapp_number: whatsapp,
      amount: amountNaira,
      transaction_reference: reference,
      status: "pending",
    });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({
      authorization_url: initJson.data.authorization_url,
      access_code: initJson.data.access_code,
      reference,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
