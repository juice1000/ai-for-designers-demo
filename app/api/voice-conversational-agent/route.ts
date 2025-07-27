import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, action } = body

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY

    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 })
    }

    // Handle different actions
    if (action === "connect") {
      console.log("Attempting to connect to conversational agent:", agentId)

      // First, verify the agent exists
      const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        method: "GET",
        headers: {
          "xi-api-key": elevenlabsApiKey,
        },
      })

      if (!agentResponse.ok) {
        const errorText = await agentResponse.text()
        console.error("Agent verification failed:", errorText)

        let errorDetails = errorText
        try {
          const errorJson = JSON.parse(errorText)
          errorDetails = errorJson.detail?.message || errorJson.message || errorJson.detail || errorText
        } catch (e) {
          // Keep original error text if not JSON
        }

        if (agentResponse.status === 404) {
          return NextResponse.json(
            {
              error: `Conversational agent not found. Please verify the agent ID '${agentId}' exists.`,
              details: errorDetails,
              agentId: agentId,
            },
            { status: 404 },
          )
        }

        return NextResponse.json(
          { error: `Failed to verify agent: ${agentResponse.status} - ${errorDetails}` },
          { status: agentResponse.status },
        )
      }

      const agentData = await agentResponse.json()
      console.log("Agent verified successfully:", agentData.name || agentId)

      // Return success response for connection
      return NextResponse.json({
        success: true,
        message: "Connected to conversational agent",
        agentId: agentId,
        agentName: agentData.name || "Unknown Agent",
        status: "connected",
      })
    }

    if (action === "disconnect") {
      console.log("Disconnecting from conversational agent:", agentId)

      return NextResponse.json({
        success: true,
        message: "Disconnected from conversational agent",
        agentId: agentId,
        status: "disconnected",
      })
    }

    // Handle audio processing (when audio file is sent)
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided for processing" }, { status: 400 })
    }

    console.log("Processing audio through conversational agent:", agentId)

    // Try the conversational agent endpoint with audio
    const conversationFormData = new FormData()
    conversationFormData.append("audio", audioFile, "input.webm")

    const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}/conversation`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
      body: conversationFormData,
    })

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      console.error("ElevenLabs conversational agent API error:", errorText)

      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.detail?.message || errorJson.message || errorJson.detail || errorText
      } catch (e) {
        // Keep original error text if not JSON
      }

      return NextResponse.json(
        { error: `ElevenLabs conversational agent error: ${agentResponse.status} - ${errorDetails}` },
        { status: 500 },
      )
    }

    console.log("Conversational agent request successful")

    // Get the audio response
    const audioBufferResponse = await agentResponse.arrayBuffer()

    return new NextResponse(audioBufferResponse, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBufferResponse.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Voice conversational agent error:", error)
    const errorMessage = error instanceof Error ? error.message : "Voice processing failed"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
