"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Error403PopupProps {
  isOpen: boolean
}

export function Error403Popup({ isOpen }: Error403PopupProps) {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (!isOpen) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.close()
          // If window.close() doesn't work (some browsers block it), redirect to about:blank
          setTimeout(() => {
            window.location.href = "about:blank"
          }, 100)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md bg-red-900/95 border-red-500 text-white animate-in fade-in-0 zoom-in-95 duration-300">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-red-300 animate-in slide-in-from-top-2 duration-500">
            403 - Access Forbidden
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 text-center animate-in slide-in-from-bottom-2 duration-500 delay-150">
          <div className="text-6xl animate-pulse">
            <span className="inline-block animate-bounce">🚫</span>
          </div>
          <p className="text-lg text-red-200 animate-in fade-in-0 duration-700 delay-300">Too many failed attempts.</p>
          <p className="text-sm text-red-300 animate-in fade-in-0 duration-700 delay-500">
            Token locked for security. Tab will close in:
          </p>
          <div
            className={`text-4xl font-bold transition-all duration-300 transform ${
              countdown <= 1 ? "text-red-500 animate-pulse scale-110" : "text-red-400 animate-bounce"
            }`}
          >
            {countdown}
          </div>
          <p className="text-xs text-red-400 animate-in fade-in-0 duration-700 delay-700">
            Unauthorized access detected
          </p>
          <div className="w-full bg-red-800/30 rounded-full h-2 mt-4">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((4 - countdown) / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
