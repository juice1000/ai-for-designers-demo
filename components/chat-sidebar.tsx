"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Search, MessageSquare, Mic, Trash2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Chat {
  id: number
  message: string
  response: string
  created_at: string
  source?: string
  conversation_id?: string
}

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
  prompt: string
  onRegenerate: () => void
  onVoiceConversationUpdate?: (userMessage: string, agentResponse: string) => void
}

export function ChatSidebar({ isOpen, onClose, prompt, onRegenerate, onVoiceConversationUpdate }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([])
  const [filteredChats, setFilteredChats] = useState<Chat[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<"all" | "text" | "voice">("all")

  // Fetch chat history
  const fetchChats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/chat-history")
      if (response.ok) {
        const data = await response.json()
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter chats based on search query and filter type
  useEffect(() => {
    let filtered = chats

    // Filter by type
    if (selectedFilter === "text") {
      filtered = filtered.filter((chat) => !chat.source || chat.source === "text_input" || chat.source === "text_chat")
    } else if (selectedFilter === "voice") {
      filtered = filtered.filter((chat) => chat.source === "voice" || chat.source === "voice_conversation")
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (chat) =>
          chat.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
          chat.response.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    setFilteredChats(filtered)
  }, [chats, searchQuery, selectedFilter])

  // Fetch chats when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchChats()
    }
  }, [isOpen])

  // Delete a chat
  const deleteChat = async (chatId: number) => {
    try {
      const response = await fetch(`/api/chat-history?id=${chatId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setChats(chats.filter((chat) => chat.id !== chatId))
      }
    } catch (error) {
      console.error("Failed to delete chat:", error)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  // Get source icon and label
  const getSourceInfo = (source?: string) => {
    if (source === "voice" || source === "voice_conversation") {
      return { icon: Mic, label: "Voice", color: "bg-blue-100 text-blue-700" }
    }
    return { icon: MessageSquare, label: "Text", color: "bg-gray-100 text-gray-700" }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat History</span>
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2 mb-4">
            <Button
              onClick={() => setSelectedFilter("all")}
              variant={selectedFilter === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              All
            </Button>
            <Button
              onClick={() => setSelectedFilter("text")}
              variant={selectedFilter === "text" ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Text
            </Button>
            <Button
              onClick={() => setSelectedFilter("voice")}
              variant={selectedFilter === "voice" ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              <Mic className="h-3 w-3 mr-1" />
              Voice
            </Button>
          </div>
        </div>

        <Separator />

        {/* Chat List */}
        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No conversations found" : "No chat history yet"}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {filteredChats.map((chat) => {
                const sourceInfo = getSourceInfo(chat.source)
                return (
                  <div
                    key={chat.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={cn("text-xs", sourceInfo.color)}>
                          <sourceInfo.icon className="h-3 w-3 mr-1" />
                          {sourceInfo.label}
                        </Badge>
                        {chat.conversation_id && (
                          <Badge variant="outline" className="text-xs">
                            Session
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(chat.created_at)}
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteChat(chat.id)
                          }}
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-900 line-clamp-2">{chat.message}</div>
                      <div className="text-sm text-gray-600 line-clamp-3">{chat.response}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{filteredChats.length} conversations</span>
            <Button onClick={fetchChats} variant="ghost" size="sm" className="text-xs">
              Refresh
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
