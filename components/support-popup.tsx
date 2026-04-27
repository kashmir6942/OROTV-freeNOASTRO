"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, ExternalLink } from 'lucide-react'
import { useEffect } from 'react'

interface SupportPopupProps {
  isOpen: boolean
  onClose: () => void
  isFirstTime?: boolean
}

export function SupportPopup({ isOpen, onClose, isFirstTime = false }: SupportPopupProps) {
  if (!isOpen) return null

  const referralLink = "https://v0.app/ref/6X4SOA"

  const handleLinkClick = () => {
    window.open(referralLink, '_blank', 'noopener,noreferrer')
  }

  const handleClose = () => {
    // Mark that user has seen the popup
    if (isFirstTime) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('supportPopupSeen', 'true')
        document.cookie = 'supportPopupSeen=true; max-age=31536000; path=/'
      }
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-[60] p-4">
      <Card className="bg-card border-border max-w-md w-full">
        <div className="p-5">
          {/* Close Button */}
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-foreground">Support This Project</h2>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message */}
          <div className="space-y-3 mb-5">
            <p className="text-sm text-foreground leading-relaxed">
              Help us keep Light TV running and improving! By using our v0 referral link, you support the development
              of new features, server costs, and continuous updates. This referral is only applied to new users from v0.app only.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              DO NOT RESELL. THE ORIGINAL https://phcorner.org/threads/2517309/
            </p>
          </div>

          {/* Referral Link Card */}
          <div className="mb-5 p-3 bg-secondary rounded-lg border border-border">
            <p className="text-xs font-medium text-foreground mb-2">Refer Us to Keep This Running!</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background px-2 py-1.5 rounded border border-border text-foreground break-all">
                {referralLink}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLinkClick}
                className="shrink-0 h-auto py-1.5 px-2"
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleLinkClick}
              className="flex-1 bg-foreground text-background hover:opacity-90 transition-opacity text-sm py-2"
            >
              Visit Referral Link
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="text-sm py-2 px-4"
            >
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
