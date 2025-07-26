import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Supabase environment variables are not set.")
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 })
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Fetch chat history, ordered by most recent first
    const { data: chats, error } = await supabase
      .from("chats")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) // Limit to last 50 chats

    if (error) {
      console.error("Error fetching chat history:", error)
      throw new Error(`Failed to fetch chat history: ${error.message}`)
    }

    return NextResponse.json({
      chats: chats || [],
    })
  } catch (error) {
    console.error("Error processing chat history request:", error)
    let errorMessage = "Failed to fetch chat history"
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
