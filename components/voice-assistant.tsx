"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, VolumeX, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceAssistantProps {
  className?: string
}

export function VoiceAssistant({ className }: VoiceAssistantProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.onended = () => setIsPlaying(false)
    audioRef.current.onplay = () => setIsPlaying(true)

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      })

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" })
        await sendAudioToAPI(audioBlob)

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      setError("Failed to access microphone. Please check permissions.")
      console.error("Recording error:", err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsProcessing(true)
      setProcessingStep("Processing your voice...")
    }
  }

  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      setProcessingStep("Converting speech to text...")

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch("/api/voice-chat", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        // Check if response is JSON
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to process audio")
        } else {
          // If not JSON, it's likely an HTML error page
          const errorText = await response.text()
          console.error("Non-JSON error response:", errorText)
          throw new Error("Server error occurred. Please try again.")
        }
      }

      // Check if response is audio
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("audio")) {
        throw new Error("Invalid response format received")
      }

      setProcessingStep("Generating voice response...")

      // Get audio response and play it
      const audioBuffer = await response.arrayBuffer()
      const audioBlobResponse = new Blob([audioBuffer], { type: "audio/mpeg" })
      const audioUrl = URL.createObjectURL(audioBlobResponse)

      if (audioRef.current) {
        audioRef.current.src = audioUrl
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process voice request")
      console.error("API error:", err)
    } finally {
      setIsProcessing(false)
      setProcessingStep("")
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  return (
    <div className={cn("flex flex-col items-center space-y-2", className)}>
      {/* Main Voice Button */}
      <Button
        onClick={toggleRecording}
        disabled={isProcessing}
        className={cn(
          "w-16 h-16 rounded-full transition-all duration-300 shadow-lg",
          isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#06040a] hover:bg-[#06040a]/90",
          isProcessing && "opacity-50 cursor-not-allowed",
        )}
        size="icon"
      >
        {isProcessing ? (
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        ) : isRecording ? (
          <MicOff className="h-6 w-6 text-white" />
        ) : (
          <Mic className="h-6 w-6 text-white" />
        )}
      </Button>

      {/* Test API Connection Button - Remove this after testing */}
      {process.env.NODE_ENV === "development" && (
        <Button
          onClick={async () => {
            try {
              const response = await fetch("/api/test-voice")
              const data = await response.json()
              console.log("API Test Result:", data)
              if (data.success) {
                setError(
                  `✅ API Connected! Found ${data.voiceCount} voices, TTS: ${data.ttsWorking ? "Working" : "Failed"}`,
                )
              } else {
                setError(`❌ API Error: ${data.error}`)
              }
            } catch (err) {
              setError(`❌ Test failed: ${err instanceof Error ? err.message : "Unknown error"}`)
            }
          }}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Test API
        </Button>
      )}

      {/* Status Text */}
      <div className="text-center">
        {isRecording && <p className="text-sm text-red-600 font-medium animate-pulse">Recording... Tap to stop</p>}
        {isProcessing && (
          <div className="flex flex-col items-center space-y-1">
            <p className="text-sm text-[#06040a] font-medium">{processingStep}</p>
            <div className="w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#06040a] rounded-full animate-pulse"></div>
            </div>
          </div>
        )}
        {isPlaying && (
          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
            <p className="text-sm text-green-600 font-medium">Playing response</p>
            <Button onClick={stopPlayback} variant="ghost" size="sm" className="h-6 w-6 p-0">
              <VolumeX className="h-3 w-3" />
            </Button>
          </div>
        )}
        {!isRecording && !isProcessing && !isPlaying && (
          <p className="text-sm text-gray-600">Tap to brainstorm ideas</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div
          className={cn(
            "border rounded-lg p-3 max-w-xs",
            error.startsWith("✅") ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200",
          )}
        >
          <p className={cn("text-sm text-center", error.startsWith("✅") ? "text-green-600" : "text-red-600")}>
            {error}
          </p>
          <Button
            onClick={() => setError(null)}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full mt-2",
              error.startsWith("✅") ? "text-green-600 hover:text-green-700" : "text-red-600 hover:text-red-700",
            )}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !isProcessing && !isPlaying && !error && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 max-w-xs shadow-sm">
          <p className="text-xs text-gray-600 text-center">
            🎤 Voice brainstorming assistant
            <br />
            Ask me for content ideas, trends, or creative inspiration!
          </p>
        </div>
      )}
    </div>
  )
}
