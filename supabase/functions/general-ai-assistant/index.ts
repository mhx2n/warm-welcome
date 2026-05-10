import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, searchQuery } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Search for relevant questions if searchQuery is provided
    let questionContext = "";
    if (searchQuery && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Search in questions table
      const { data: questions } = await supabase
        .from("questions")
        .select(`
          id,
          question,
          answer,
          options,
          explanation,
          exam_id,
          exams!inner(title, subject, published)
        `)
        .eq("exams.published", true)
        .or(`question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`)
        .limit(5);

      if (questions && questions.length > 0) {
        questionContext = "\n\n📚 **ডাটাবেজে পাওয়া সম্পর্কিত প্রশ্নসমূহ:**\n";
        questions.forEach((q: any, i: number) => {
          const options = Array.isArray(q.options) ? q.options : [];
          questionContext += `\n${i + 1}. **প্রশ্ন:** ${q.question}\n`;
          questionContext += `   **বিষয়:** ${q.exams?.subject || 'অজানা'} | **পরীক্ষা:** ${q.exams?.title || 'অজানা'}\n`;
          questionContext += `   **অপশনসমূহ:** ${options.join(" | ")}\n`;
          questionContext += `   **সঠিক উত্তর:** ${q.answer}\n`;
          if (q.explanation) {
            questionContext += `   **ব্যাখ্যা:** ${q.explanation}\n`;
          }
        });
      }
    }

    const systemPrompt = `তুমি একজন বাংলাদেশি শিক্ষা সহায়ক AI। তোমার নাম "শিক্ষা সহায়ক"।

🎯 **তোমার কাজ:**
- শুধুমাত্র পড়াশোনা সম্পর্কিত প্রশ্নের উত্তর দেওয়া
- ওয়েবসাইটে থাকা প্রশ্নগুলো সম্পর্কে সাহায্য করা
- গণিত, বিজ্ঞান, ইংরেজি, সাধারণ জ্ঞান ইত্যাদি বিষয়ে সাহায্য করা
- জটিল বিষয় সহজভাবে বুঝিয়ে দেওয়া

⛔ **কঠোর নিষেধাজ্ঞা:**
- পড়াশোনার বাইরে কোনো বিষয়ে কথা বলবে না
- রাজনীতি, ধর্ম, বিনোদন, ব্যক্তিগত পরামর্শ - এসব এড়িয়ে যাবে
- যদি কেউ অপ্রাসঙ্গিক প্রশ্ন করে, বিনয়ের সাথে বলবে: "আমি শুধুমাত্র পড়াশোনার বিষয়ে সাহায্য করতে পারি। 📚"

📝 **উত্তর দেওয়ার নিয়ম:**
- বাংলায় উত্তর দাও
- গণিতের জন্য LaTeX ব্যবহার করো: $inline$ বা $$block$$
- ধাপে ধাপে ব্যাখ্যা দাও
- প্রয়োজনে উদাহরণ দাও
- সংক্ষিপ্ত ও স্পষ্ট উত্তর দাও

${questionContext ? `\n🔍 **ডাটাবেজ থেকে প্রাসঙ্গিক তথ্য:**${questionContext}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "সার্ভিস সাময়িকভাবে অনুপলব্ধ।" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI সার্ভিসে সমস্যা হয়েছে।" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("General assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
