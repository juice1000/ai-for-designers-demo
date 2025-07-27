import { NextResponse } from "next/server"

export async function GET() {
  try {
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY

    if (!elevenlabsApiKey) {
      return NextResponse.json(
        {
          error: "ElevenLabs API key not configured",
          hasKey: false,
        },
        { status: 500 },
      )
    }

    // Test ElevenLabs API connection and get available models
    const modelsResponse = await fetch("https://api.elevenlabs.io/v1/models", {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text()
      return NextResponse.json(
        {
          error: "ElevenLabs API connection failed",
          status: modelsResponse.status,
          details: errorText,
          hasKey: true,
        },
        { status: 500 },
      )
    }

    const models = await modelsResponse.json()

    // Find speech-to-speech compatible models
    const speechToSpeechModels = models.filter(
      (model: any) =>
        model.can_do_voice_conversion || model.model_id.includes("sts") || model.name.toLowerCase().includes("speech"),
    )

    // Test voices endpoint
    const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    const voicesWorking = voicesResponse.ok
    let voiceCount = 0

    if (voicesWorking) {
      const voices = await voicesResponse.json()
      voiceCount = voices.voices?.length || 0
    }

    return NextResponse.json({
      success: true,
      message: "ElevenLabs API connection successful",
      hasKey: true,
      voicesWorking,
      voiceCount,
      totalModels: models.length,
      speechToSpeechModels: speechToSpeechModels.map((m: any) => ({
        model_id: m.model_id,
        name: m.name,
        can_do_voice_conversion: m.can_do_voice_conversion,
        description: m.description,
      })),
      recommendedModel: "eleven_english_sts_v2",
    })
  } catch (error) {
    console.error("Test speech-to-speech endpoint error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
        hasKey: !!process.env.ELEVENLABS_API_KEY,
      },
      { status: 500 },
    )
  }
}
