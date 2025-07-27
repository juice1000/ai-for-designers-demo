import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
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
      .select("id, request, response, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Supabase error fetching chat history:", error)
      return NextResponse.json(
        {
          error: `Database error: ${error.message}`,
          chats: [],
        },
        { status: 500 },
      )
    }

    console.log(`Successfully fetched ${chats?.length || 0} chat messages`)

    return NextResponse.json({
      chats: chats || [],
      success: true,
    })
  } catch (error) {
    console.error("Error processing chat history request:", error)
    let errorMessage = "Failed to fetch chat history"
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return NextResponse.json(
      {
        error: errorMessage,
        chats: [],
      },
      { status: 500 },
    )
  }
}
