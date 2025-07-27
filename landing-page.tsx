"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChatSidebar } from "@/components/chat-sidebar"
import { useState } from "react"
import { MessageSquare } from "lucide-react" // Import the icon

export default function Component() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleGetStarted = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setShowPrompt(true)
    }, 500) // Wait for fade out animation to complete
  }

  const handleGenerateContent = () => {
    if (prompt.trim()) {
      setIsChatOpen(true)
      // The sidebar will now handle the generation when the regenerate button is clicked
    }
  }

  const handleRegenerate = () => {
    // This will trigger a new generation in the ChatSidebar
    // The sidebar will handle generating new content when this is called
  }

  const handleOpenChatFromButton = () => {
    setIsChatOpen(true)
    // Just open the chat to show history - no automatic generation
  }

  return (
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: "url('/images/background.png')",
        }}
      >
        {/* Landing Content */}
        <div
          className={`max-w-4xl mx-auto text-center space-y-8 transition-all duration-500 ease-in-out ${
            isAnimating ? "opacity-0 transform -translate-y-12" : "opacity-100 transform translate-y-0"
          } ${showPrompt ? "hidden" : "block"}`}
        >
          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#06040a] leading-tight">
           Story Forge
          </h1>

          {/* Description Text */}
          <p className="text-lg md:text-xl text-[#06040a] max-w-2xl mx-auto leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            <br />
            Cursus imperdiet sed id elementum. Quam vel aliquam sit
            <br />
            vulputate. Faucibus nec gravida ipsum pulvinar vel.
          </p>

          {/* CTA Button */}
          <div className="pt-4">
            <Button
              onClick={handleGetStarted}
              className="bg-[#06040a] hover:bg-[#06040a]/90 text-[#ffffff] px-8 py-3 text-lg rounded-full transition-all duration-200"
              size="lg"
            >
              Get started
            </Button>
          </div>
        </div>

        {/* Prompt Input View */}
        <div
          className={`max-w-2xl mx-auto text-center space-y-6 transition-all duration-500 ease-in-out ${
            showPrompt ? "opacity-100 transform translate-y-0" : "opacity-0 transform translate-y-12"
          } ${!showPrompt ? "hidden" : "block"}`}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl md:text-4xl font-bold text-[#06040a] mb-4">What's your content idea?</h2>
            <p className="text-lg text-[#06040a]/80 mb-6">
              Tell us about your social media post idea and we'll help bring it to life
            </p>

            <div className="space-y-4">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A motivational quote about perseverance with mountain imagery..."
                className="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-[#06040a] focus:ring-0"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleGenerateContent()
                  }
                }}
              />
              <Button
                onClick={handleGenerateContent}
                disabled={!prompt.trim()}
                className="w-full bg-[#06040a] hover:bg-[#06040a]/90 text-[#ffffff] py-4 text-lg rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                Generate Content
              </Button>
            </div>

            <button
              onClick={() => {
                setShowPrompt(false)
                setIsAnimating(false)
                setPrompt("")
                setIsChatOpen(false)
              }}
              className="mt-4 text-[#06040a]/60 hover:text-[#06040a] transition-colors duration-200"
            >
              ← Back to home
            </button>
          </div>
        </div>

        {/* Floating Chat Button */}
        {!isChatOpen && (
          <Button
            onClick={handleOpenChatFromButton}
            className="fixed bottom-6 right-6 bg-[#06040a] hover:bg-[#06040a]/90 text-[#ffffff] rounded-full p-4 shadow-lg transition-all duration-300 ease-in-out z-50"
            size="icon"
            aria-label="Open chat"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Chat Sidebar */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        prompt={prompt}
        onRegenerate={handleRegenerate}
      />

      {/* Overlay when chat is open */}
      {isChatOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
          onClick={() => setIsChatOpen(false)}
        />
      )}
    </>
  )
}
