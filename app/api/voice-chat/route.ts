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

    // First, convert speech to text using OpenAI Whisper
    const whisperFormData = new FormData()
    whisperFormData.append("file", audioFile, "audio.webm")
    whisperFormData.append("model", "whisper-1")

    const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: whisperFormData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error("Whisper API error:", errorText)
      return NextResponse.json({ error: `Speech recognition failed: ${whisperResponse.status}` }, { status: 500 })
    }

    const transcription = await whisperResponse.json()
    const userText = transcription.text

    if (!userText || userText.trim().length === 0) {
      return NextResponse.json({ error: "No speech detected. Please try speaking more clearly." }, { status: 400 })
    }

    console.log("Transcribed text:", userText)

    // Generate AI response using OpenAI
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

    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: systemPrompt,
          },
          {
            role: "user",
            content: userText,
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    })

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json()
      console.error("OpenAI Chat API error:", errorData)
      return NextResponse.json({ error: `AI response generation failed: ${chatResponse.status}` }, { status: 500 })
    }

    const chatData = await chatResponse.json()
    const aiResponseText = chatData.choices[0].message.content

    console.log("AI response text:", aiResponseText)

    // Convert AI response to speech using ElevenLabs
    const voiceId = "21m00Tcm4TlvDq8ikWAM" // Rachel voice - good for conversational content

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenlabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: aiResponseText,
        model_id: "eleven_monolingual_v1", // This model works well for TTS
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    })

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text()
      console.error("ElevenLabs TTS API error:", errorText)
      return NextResponse.json(
        { error: `Text-to-speech failed: ${ttsResponse.status} - ${errorText}` },
        { status: 500 },
      )
    }

    // Get the audio response
    const audioBuffer = await ttsResponse.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Voice chat error:", error)
    const errorMessage = error instanceof Error ? error.message : "Voice processing failed"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
