"use client"

import type { ReactNode } from "react"

interface ElevenLabsProviderWrapperProps {
  children: ReactNode
}

// For now, we'll just pass through the children since the ElevenLabs React SDK
// might not require a provider wrapper, or the export name might be different
export function ElevenLabsProviderWrapper({ children }: ElevenLabsProviderWrapperProps) {
  return <>{children}</>
}
