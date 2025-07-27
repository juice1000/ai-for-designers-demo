import { NextResponse } from "next/server"

export async function GET() {
  try {
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (!elevenlabsApiKey) {
      return NextResponse.json(
        {
          error: "ElevenLabs API key not configured",
          hasElevenLabsKey: false,
          hasOpenAIKey: !!openaiApiKey,
        },
        { status: 500 },
      )
    }

    if (!openaiApiKey) {
      return NextResponse.json(
        {
          error: "OpenAI API key not configured",
          hasElevenLabsKey: true,
          hasOpenAIKey: false,
        },
        { status: 500 },
      )
    }

    // Test ElevenLabs API connection
    const testResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      return NextResponse.json(
        {
          error: "ElevenLabs API connection failed",
          status: testResponse.status,
          details: errorText,
          hasElevenLabsKey: true,
          hasOpenAIKey: true,
        },
        { status: 500 },
      )
    }

    const voices = await testResponse.json()

    // Test a simple TTS request
    const voiceId = "21m00Tcm4TlvDq8ikWAM" // Rachel voice
    const ttsTestResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: "Hello! This is a test of the voice assistant.",
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
        },
      }),
    })

    const ttsWorking = ttsTestResponse.ok

    return NextResponse.json({
      success: true,
      message: "API connections successful",
      voiceCount: voices.voices?.length || 0,
      hasElevenLabsKey: true,
      hasOpenAIKey: true,
      ttsWorking,
      availableVoices:
        voices.voices?.slice(0, 5).map((v: any) => ({
          voice_id: v.voice_id,
          name: v.name,
          category: v.category,
        })) || [],
    })
  } catch (error) {
    console.error("Test voice endpoint error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
        hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      },
      { status: 500 },
    )
  }
}
