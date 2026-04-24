"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { X, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react"
import type { Channel } from "@/data/types/channel"

interface PipModeProps {
  isActive: boolean
  channel: Channel | null
  onClose: () => void
  onMaximize: () => void
}

export function PipMode({ isActive, channel, onClose, onMaximize }: PipModeProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isMuted, setIsMuted] = useState(false)
  const pipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      const maxX = window.innerWidth - 320
      const maxY = window.innerHeight - 180

      setPosition({
        x: Math.max(20, Math.min(newX, maxX)),
        y: Math.max(20, Math.min(newY, maxY)),
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!pipRef.current) return

    const rect = pipRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setIsDragging(true)
  }

  if (!isActive || !channel) return null

  return (
    <div
      ref={pipRef}
      className="fixed z-[100] w-80 rounded-lg overflow-hidden shadow-2xl border-2 border-border"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <Card className="bg-card border-0">
        <div
          className="bg-secondary/50 backdrop-blur-sm p-2 flex items-center justify-between cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {channel.logo && (
              <img src={channel.logo} alt={channel.name} className="w-6 h-6 object-contain rounded" />
            )}
            <span className="text-xs font-medium text-foreground truncate">{channel.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-3 h-3 text-muted-foreground" />
              ) : (
                <Volume2 className="w-3 h-3 text-foreground" />
              )}
            </button>
            <button
              onClick={onMaximize}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title="Maximize"
            >
              <Maximize2 className="w-3 h-3 text-foreground" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-secondary rounded transition-colors"
              title="Close"
            >
              <X className="w-3 h-3 text-foreground" />
            </button>
          </div>
        </div>

        <div className="relative aspect-video bg-black">
          <iframe
            src={channel.url}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture"
            style={{ border: 'none' }}
          />
          {isMuted && (
            <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-1 rounded text-xs text-foreground">
              Muted
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

// Hook to manage PIP mode state
export function usePipMode() {
  const [isPipActive, setIsPipActive] = useState(false)
  const [pipChannel, setPipChannel] = useState<Channel | null>(null)

  const activatePip = (channel: Channel) => {
    setPipChannel(channel)
    setIsPipActive(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('pipMode', 'active')
      localStorage.setItem('pipChannel', JSON.stringify(channel))
    }
  }

  const deactivatePip = () => {
    setIsPipActive(false)
    setPipChannel(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pipMode')
      localStorage.removeItem('pipChannel')
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPipMode = localStorage.getItem('pipMode')
      const savedPipChannel = localStorage.getItem('pipChannel')

      if (savedPipMode === 'active' && savedPipChannel) {
        try {
          const channel = JSON.parse(savedPipChannel)
          setPipChannel(channel)
          setIsPipActive(true)
        } catch (error) {
          console.error('[v0] Error restoring PIP mode:', error)
        }
      }
    }
  }, [])

  return {
    isPipActive,
    pipChannel,
    activatePip,
    deactivatePip,
  }
}
