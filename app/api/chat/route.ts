import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { message, response, source = "text_chat", conversation_id } = await request.json()

    // If both message and response are provided, save directly (for voice conversations)
    if (message && response) {
      const { error } = await supabase.from("chats").insert([
        {
          message,
          response,
          source,
          conversation_id,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ error: "Failed to save chat" }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Chat saved successfully" })
    }

    // If only message is provided, generate response (for text chats)
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Generate AI response
    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: `You are a creative social media content assistant. Help users brainstorm engaging content ideas, write compelling captions, suggest trending hashtags, and provide strategic advice for social media growth. Be enthusiastic, creative, and practical in your responses.

Key areas to focus on:
- Instagram, TikTok, Twitter, LinkedIn content ideas
- Trending topics and hashtags
- Caption writing and storytelling
- Content calendar planning
- Audience engagement strategies
- Visual content suggestions
- Brand voice development

Always provide actionable, specific advice that users can implement immediately.`,
      prompt: message,
    })

    // Save to database
    const { error } = await supabase.from("chats").insert([
      {
        message,
        response: text,
        source,
        conversation_id,
        created_at: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to save chat" }, { status: 500 })
    }

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
