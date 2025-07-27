import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log("Testing Supabase connection...")
    console.log("SUPABASE_URL exists:", !!supabaseUrl)
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!supabaseServiceRoleKey)

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseServiceRoleKey,
          },
        },
        { status: 500 },
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Test basic connection by checking if the chats table exists
    const { data, error } = await supabase.from("chats").select("count", { count: "exact", head: true })

    if (error) {
      console.error("Supabase connection test failed:", error)
      return NextResponse.json(
        {
          error: "Supabase connection failed",
          details: error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Supabase connection successful",
      tableExists: true,
      recordCount: data,
    })
  } catch (error) {
    console.error("Test endpoint error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
