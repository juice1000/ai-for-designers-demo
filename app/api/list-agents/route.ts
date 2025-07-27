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

    console.log("Fetching all available conversational agents...")

    // Get all available agents
    const agentsResponse = await fetch("https://api.elevenlabs.io/v1/convai/agents", {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    if (!agentsResponse.ok) {
      const errorText = await agentsResponse.text()
      return NextResponse.json(
        {
          error: "Failed to fetch agents",
          status: agentsResponse.status,
          details: errorText,
          hasKey: true,
        },
        { status: agentsResponse.status },
      )
    }

    const agentsData = await agentsResponse.json()
    const agents = agentsData.agents || agentsData || []

    return NextResponse.json({
      success: true,
      message: `Found ${agents.length} conversational agents`,
      hasKey: true,
      totalAgents: agents.length,
      agents: agents.map((agent: any) => ({
        id: agent.agent_id || agent.id,
        name: agent.name || "Unnamed Agent",
        description: agent.description || "No description",
        voice_id: agent.voice_id,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
      })),
    })
  } catch (error) {
    console.error("List agents endpoint error:", error)
    return NextResponse.json(
      {
        error: "Failed to list agents",
        details: error instanceof Error ? error.message : String(error),
        hasKey: !!process.env.ELEVENLABS_API_KEY,
      },
      { status: 500 },
    )
  }
}
