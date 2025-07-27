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

    const agentId = "agent_1101k161d5y2fp1ssvejv791505r"

    console.log("Testing conversational agent access...")
    console.log("Agent ID:", agentId)

    // First, let's check if we can access the general agents endpoint
    const agentsListResponse = await fetch("https://api.elevenlabs.io/v1/convai/agents", {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    console.log("Agents list response status:", agentsListResponse.status)

    let availableAgents = []
    if (agentsListResponse.ok) {
      const agentsData = await agentsListResponse.json()
      availableAgents = agentsData.agents || agentsData || []
      console.log("Available agents:", availableAgents.length)
    } else {
      const errorText = await agentsListResponse.text()
      console.log("Agents list error:", errorText)
    }

    // Try to get the specific agent
    const agentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    console.log("Specific agent response status:", agentResponse.status)

    if (!agentResponse.ok) {
      const errorText = await agentResponse.text()
      console.log("Specific agent error:", errorText)

      return NextResponse.json(
        {
          error: "Failed to access conversational agent",
          status: agentResponse.status,
          details: errorText,
          hasKey: true,
          agentId,
          availableAgentsCount: availableAgents.length,
          availableAgents: availableAgents.slice(0, 3).map((agent: any) => ({
            id: agent.agent_id || agent.id,
            name: agent.name,
          })),
          suggestion:
            availableAgents.length > 0
              ? "Try using one of the available agent IDs listed above"
              : "No agents found. You may need to create an agent first in ElevenLabs dashboard",
        },
        { status: agentResponse.status },
      )
    }

    const agentData = await agentResponse.json()

    // Also test general API access
    const voicesResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
      method: "GET",
      headers: {
        "xi-api-key": elevenlabsApiKey,
      },
    })

    const voicesWorking = voicesResponse.ok

    return NextResponse.json({
      success: true,
      message: "ElevenLabs conversational agent accessible",
      hasKey: true,
      agentId,
      agentName: agentData.name || "Unknown",
      agentDescription: agentData.description || "No description",
      voicesWorking,
      availableAgentsCount: availableAgents.length,
      agentDetails: {
        id: agentData.agent_id || agentData.id,
        name: agentData.name,
        description: agentData.description,
        voice_id: agentData.voice_id,
        created_at: agentData.created_at,
      },
    })
  } catch (error) {
    console.error("Test conversational agent endpoint error:", error)
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : String(error),
        hasKey: !!process.env.ELEVENLABS_API_KEY,
        agentId: "agent_1101k161d5y2fp1ssvejv791505r",
      },
      { status: 500 },
    )
  }
}
