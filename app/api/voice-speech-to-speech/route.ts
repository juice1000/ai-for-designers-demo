import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY

    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 })
    }

    // Use ElevenLabs speech-to-speech endpoint with a compatible model
    const speechFormData = new FormData()
    speechFormData.append("audio", audioFile, "input.webm")

    // Use eleven_english_sts_v2 which is specifically designed for speech-to-speech
    speechFormData.append("model_id", "eleven_english_sts_v2")

    // System prompt for content brainstorming
    const systemPrompt = `You are a creative content strategist and brainstorming assistant specializing in social media and brand content creation. Your role is to help users generate engaging, authentic, and effective content ideas.

Key capabilities:
- Brainstorm creative content ideas for various social media platforms (Instagram, TikTok, LinkedIn, Twitter, etc.)
- Suggest trending topics and hashtag strategies
- Help develop brand voice and messaging
- Provide content calendar suggestions
- Offer creative angles for product launches, events, or campaigns
- Suggest visual content ideas (photos, videos, graphics)
- Help with storytelling techniques and narrative structures
- Provide audience engagement strategies

Communication style:
- Be enthusiastic and inspiring
- Ask clarifying questions to better understand their brand/goals
- Provide specific, actionable suggestions
- Keep responses conversational and energetic
- Offer multiple creative options when possible
- Be encouraging and supportive of their creative process

Always aim to spark creativity and provide practical, implementable ideas that align with current social media trends and best practices. Keep responses concise but helpful, around 30-60 seconds of speech when spoken aloud.`

    speechFormData.append("text", systemPrompt)

    // Optimized voice settings for speech-to-speech
    speechFormData.append(
      "voice_settings",
      JSON.stringify({
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true,
      }),
    )

    // Use Rachel voice which works well with speech-to-speech
    const voiceId = "21m00Tcm4TlvDq8ikWAM"

    console.log("Making speech-to-speech request to ElevenLabs...")

    const speechResponse = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
      body: speechFormData,
    })

    if (!speechResponse.ok) {
      const errorText = await speechResponse.text()
      console.error("ElevenLabs speech-to-speech API error:", errorText)

      // Try to parse error details
      let errorDetails = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorDetails = errorJson.detail?.message || errorJson.message || errorText
      } catch (e) {
        // Keep original error text if not JSON
      }

      return NextResponse.json(
        { error: `ElevenLabs speech-to-speech error: ${speechResponse.status} - ${errorDetails}` },
        { status: 500 },
      )
    }

    console.log("Speech-to-speech request successful")

    // Get the audio response
    const audioBufferResponse = await speechResponse.arrayBuffer()

    return new NextResponse(audioBufferResponse, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBufferResponse.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Voice speech-to-speech error:", error)
    const errorMessage = error instanceof Error ? error.message : "Voice processing failed"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
