"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Copy, RefreshCw, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  request: string
  response: string
  created_at: string
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  onRegenerate: () => void
}

export function ChatSidebar({ isOpen, onClose, prompt, onRegenerate }: ChatSidebarProps) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [currentResponse, setCurrentResponse] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [animatedText, setAnimatedText] = useState("")
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Fetch chat history from Supabase
  const fetchChatHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const res = await fetch("/api/chat-history", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("API response error:", data.error)
        // Still try to use any chats that might be returned
        setChatHistory(data.chats || [])
        return
      }

      console.log("Chat history fetched successfully:", data.chats?.length || 0, "messages")
      setChatHistory(data.chats || [])
    } catch (error) {
      console.error("Error fetching chat history:", error)
      // Set empty array on error so UI doesn't break
      setChatHistory([])
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Generate new content
  const generateContent = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setCurrentResponse("")
    setAnimatedText("")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: prompt }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate content")
      }

      const data = await res.json()
      setCurrentResponse(data.message)

      // Refresh chat history to include the new message
      await fetchChatHistory()
    } catch (error) {
      console.error("Error:", error)
      setCurrentResponse("Sorry, there was an error generating your content. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Animate text typing effect for current response
  useEffect(() => {
    if (currentResponse && !isLoading) {
      setAnimatedText("")
      let index = 0
      const timer = setInterval(() => {
        if (index < currentResponse.length) {
          setAnimatedText(currentResponse.slice(0, index + 1))
          index++
        } else {
          clearInterval(timer)
        }
      }, 20)

      return () => clearInterval(timer)
    }
  }, [currentResponse, isLoading])

  // Fetch chat history when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchChatHistory()
    }
  }, [isOpen])

  // Generate new content only when regenerate is called
  const handleRegenerate = () => {
    generateContent()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50",
        isOpen ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#06040a]">Chat History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#06040a]"></div>
              <span className="ml-2 text-sm text-gray-600">Loading chat history...</span>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No chat history yet</p>
              <p className="text-sm text-gray-400 mt-1">Start a conversation to see your messages here</p>
              <Button onClick={fetchChatHistory} variant="outline" size="sm" className="mt-4 bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          ) : (
            <>
              {/* Chat History */}
              {chatHistory.map((chat) => (
                <div key={chat.id} className="space-y-3 pb-4 border-b border-gray-100 last:border-b-0">
                  {/* User Message */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">You asked:</p>
                    <p className="text-[#06040a]">{chat.request}</p>
                  </div>

                  {/* AI Response */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-blue-600 font-medium">AI Response:</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(chat.response)}
                        className="h-7 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-[#06040a] whitespace-pre-wrap text-sm">{chat.response}</div>
                    <p className="text-xs text-gray-400 mt-2">{new Date(chat.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {/* Current Response (if generating) */}
              {(isLoading || currentResponse) && (
                <div className="space-y-3 pb-4 border-b border-gray-100">
                  {/* Current User Prompt */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">You asked:</p>
                    <p className="text-[#06040a]">{prompt}</p>
                  </div>

                  {/* Current AI Response */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-blue-600 font-medium">AI Response:</p>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerate}
                          disabled={isLoading}
                          className="h-7 px-2"
                        >
                          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                        </Button>
                        {currentResponse && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(currentResponse)}
                            className="h-7 px-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-blue-600">Generating content...</span>
                      </div>
                    ) : (
                      <div className="text-[#06040a] whitespace-pre-wrap text-sm">
                        {animatedText}
                        {animatedText.length < currentResponse.length && <span className="animate-pulse">|</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {prompt && (
            <Button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="w-full bg-[#06040a] hover:bg-[#06040a]/90 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Response
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
