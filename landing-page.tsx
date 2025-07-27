"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Calendar,
  MessageSquare,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Copy,
  Check,
  History,
  Mic,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VoiceAssistant } from "@/components/voice-assistant"
import { ChatSidebar } from "@/components/chat-sidebar"

const contentTypes = [
  { id: "instagram", label: "Instagram Post", icon: Instagram, color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  { id: "twitter", label: "Twitter Thread", icon: Twitter, color: "bg-blue-500" },
  { id: "linkedin", label: "LinkedIn Article", icon: Linkedin, color: "bg-blue-600" },
  { id: "youtube", label: "YouTube Script", icon: Youtube, color: "bg-red-500" },
  { id: "general", label: "General Content", icon: MessageSquare, color: "bg-gray-600" },
]

const trendingTopics = [
  "AI in Marketing",
  "Sustainable Living",
  "Remote Work Tips",
  "Mental Health Awareness",
  "Tech Innovations 2024",
  "Personal Branding",
]

export default function LandingPage() {
  const [prompt, setPrompt] = useState("")
  const [selectedType, setSelectedType] = useState("general")
  const [response, setResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [animatedText, setAnimatedText] = useState("")
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [inputMode, setInputMode] = useState<"text" | "voice">("text")

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [prompt])

  // Animate text typing effect
  useEffect(() => {
    if (response && !isLoading) {
      setAnimatedText("")
      let index = 0
      const timer = setInterval(() => {
        if (index < response.length) {
          setAnimatedText(response.slice(0, index + 1))
          index++
        } else {
          clearInterval(timer)
        }
      }, 20)

      return () => clearInterval(timer)
    }
  }, [response, isLoading])

  const generateContent = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setResponse("")
    setAnimatedText("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Create ${selectedType} content about: ${prompt}`,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await res.json()
      setResponse(data.message || data.response || "No response generated")
    } catch (error) {
      console.error("Error:", error)
      setResponse("Sorry, there was an error generating your content. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generateContent()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      generateContent()
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedStates((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const insertTrendingTopic = (topic: string) => {
    setPrompt((prev) => (prev ? `${prev} ${topic}` : topic))
  }

  const handleVoiceConversationUpdate = (userMessage: string, agentResponse: string) => {
    // This callback will be called when a voice conversation is completed
    console.log("Voice conversation completed:", { userMessage, agentResponse })
    // You could update the UI here if needed
  }

  const regenerateContent = () => {
    generateContent()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=60&width=60')] opacity-5"></div>

      <div className="relative">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">ContentCraft AI</h1>
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setIsSidebarOpen(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <History className="h-4 w-4" />
                  <span>History</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Create Engaging Content with AI</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Generate compelling social media posts, articles, and marketing copy in seconds. Powered by advanced AI to
              boost your content strategy.
            </p>
          </div>

          {/* Input Mode Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <Button
                onClick={() => setInputMode("text")}
                variant={inputMode === "text" ? "default" : "ghost"}
                size="sm"
                className={cn("px-6", inputMode === "text" ? "bg-[#06040a] text-white" : "text-gray-600")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Text Input
              </Button>
              <Button
                onClick={() => setInputMode("voice")}
                variant={inputMode === "voice" ? "default" : "ghost"}
                size="sm"
                className={cn("px-6", inputMode === "voice" ? "bg-[#06040a] text-white" : "text-gray-600")}
              >
                <Mic className="h-4 w-4 mr-2" />
                Voice Input
              </Button>
            </div>
          </div>

          {inputMode === "voice" ? (
            /* Voice Input Mode */
            <div className="mb-12">
              <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
                <CardContent className="p-12">
                  <VoiceAssistant className="w-full" onConversationUpdate={handleVoiceConversationUpdate} />
                </CardContent>
              </Card>
            </div>
          ) : (
            /* Text Input Mode */
            <>
              {/* Content Type Selection */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Content Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {contentTypes.map((type) => (
                    <Button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      variant={selectedType === type.id ? "default" : "outline"}
                      className={cn(
                        "h-auto p-4 flex flex-col items-center space-y-2 transition-all",
                        selectedType === type.id ? "bg-[#06040a] text-white border-[#06040a]" : "hover:border-gray-400",
                      )}
                    >
                      <type.icon className="h-6 w-6" />
                      <span className="text-sm font-medium text-center">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Trending Topics */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-orange-500" />
                  Trending Topics
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingTopics.map((topic) => (
                    <Badge
                      key={topic}
                      variant="secondary"
                      className="cursor-pointer hover:bg-gray-200 transition-colors px-3 py-1"
                      onClick={() => insertTrendingTopic(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Input Form */}
              <Card className="mb-8 shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                        What would you like to create content about?
                      </label>
                      <Textarea
                        ref={textareaRef}
                        id="prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="e.g., 'Tips for remote work productivity' or 'Benefits of sustainable fashion'"
                        className="min-h-[100px] resize-none border-gray-300 focus:border-[#06040a] focus:ring-[#06040a]"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">Press Cmd/Ctrl + Enter to generate</p>
                    </div>

                    <Button
                      type="submit"
                      disabled={!prompt.trim() || isLoading}
                      className="w-full bg-[#06040a] hover:bg-[#06040a]/90 text-white py-3 text-lg font-medium"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Generate Content
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}

          {/* Response Display */}
          {(response || isLoading) && inputMode === "text" && (
            <Card className="shadow-lg border-0 bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
                    Generated Content
                  </h3>
                  <div className="flex space-x-2">
                    <Button
                      onClick={regenerateContent}
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="flex items-center space-x-1 bg-transparent"
                    >
                      <div className={cn("h-4 w-4", isLoading && "animate-spin")}>↻</div>
                      <span>Regenerate</span>
                    </Button>
                    {response && (
                      <Button
                        onClick={() => copyToClipboard(response, "main")}
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        {copiedStates["main"] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>{copiedStates["main"] ? "Copied!" : "Copy"}</span>
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="prose max-w-none">
                  {isLoading ? (
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#06040a]"></div>
                      <span>Crafting your content...</span>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {animatedText}
                      {animatedText.length < response.length && <span className="animate-pulse">|</span>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Features Grid */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6 border-0 shadow-md bg-white">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Audience-Focused</h3>
              <p className="text-gray-600">
                Content tailored to engage your specific target audience across different platforms.
              </p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-md bg-white">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trend-Aware</h3>
              <p className="text-gray-600">
                Stay ahead with content that incorporates the latest trends and topics in your industry.
              </p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-md bg-white">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Publish</h3>
              <p className="text-gray-600">
                Get polished, ready-to-use content that you can publish immediately across platforms.
              </p>
            </Card>
          </div>
        </main>

        {/* Chat Sidebar */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          prompt={prompt}
          onRegenerate={regenerateContent}
          onVoiceConversationUpdate={handleVoiceConversationUpdate}
        />
      </div>
    </div>
  )
}
