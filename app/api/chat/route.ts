import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { message: userMessage } = await request.json()

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Supabase environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are not set.")
      return NextResponse.json(
        { error: "Supabase configuration missing. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set." },
        { status: 500 },
      )
    }

    // Initialize Supabase client for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a creative social media content generator. Help users create engaging social media posts with compelling copy, hashtags, and creative ideas. Keep responses concise and actionable.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      throw new Error(
        `OpenAI API error: ${openaiResponse.status} - ${errorData.error?.message || JSON.stringify(errorData)}`,
      )
    }

    const data = await openaiResponse.json()
    const aiResponseContent = data.choices[0].message.content

    // Log the data being sent to Supabase for debugging
    console.log("Attempting to save to Supabase:")
    console.log("Request message:", userMessage)
    console.log("AI Response content:", aiResponseContent)

    // Save chat to Supabase
    const { data: supabaseData, error: supabaseError } = await supabase.from("chats").insert([
      {
        request: userMessage,
        response: aiResponseContent,
      },
    ])

    if (supabaseError) {
      console.error("Error saving chat to Supabase:", supabaseError)
      // Log specific properties of the error object for more detail
      const err: any = supabaseError // Cast to any to access all properties
      console.error("Supabase error code:", err.code)
      console.error("Supabase error message:", err.message)
      console.error("Supabase error details:", err.details)
      console.error("Supabase error hint:", err.hint)
      // Log the full error object, including non-enumerable properties
      console.error("Full Supabase error object (JSON):", JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
      console.error("Supabase data (if any):", supabaseData) // Log data even if error is present

      // If the error object is empty, provide a more generic message
      if (Object.keys(supabaseError).length === 0) {
        console.error(
          "Supabase error object is empty. This often indicates a problem with Supabase configuration (e.g., incorrect URL/key, table schema, or RLS).",
        )
        // Throw a new error to be caught by the outer try-catch, providing a clearer message to the client
        throw new Error(
          "Failed to save chat history to Supabase. Please check your Supabase configuration and table schema.",
        )
      } else {
        // If there's a specific error message, use it
        throw new Error(`Failed to save chat history to Supabase: ${supabaseError.message || "Unknown error"}`)
      }
    } else {
      console.log("Chat successfully saved to Supabase:", supabaseData)
    }

    return NextResponse.json({
      message: aiResponseContent,
    })
  } catch (error) {
    console.error("Error processing chat request:", error)
    // Ensure the error message is user-friendly
    let errorMessage = "Failed to generate content"
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === "string") {
      errorMessage = error
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
