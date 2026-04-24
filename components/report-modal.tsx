"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { X, AlertCircle, CheckCircle } from 'lucide-react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [reportText, setReportText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const wordCount = reportText.trim().split(/\s+/).filter(Boolean).length

  const handleSubmit = async () => {
    if (!reportText.trim()) {
      setErrorMessage("Please describe the issue before submitting.")
      return
    }

    if (wordCount > 5000) {
      setErrorMessage("Report cannot exceed 5000 words.")
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      const response = await fetch("/api/user-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel_id: "manual-report",
          report_type: "user-report",
          description: reportText,
          error_details: {
            user_agent: navigator.userAgent,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] Report submission failed:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] Report submitted successfully:", data.report_id)

      setSubmitStatus("success")
      setTimeout(() => {
        setReportText("")
        setSubmitStatus("idle")
        onClose()
      }, 2000)
    } catch (error) {
      console.error("[v0] Error submitting report:", error)
      setSubmitStatus("error")
      setErrorMessage(
        error instanceof Error 
          ? `Failed to submit report: ${error.message}` 
          : "Failed to submit report. Please try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-2xl bg-slate-900 border-orange-500/20">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                Report an Issue
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Why Report? Please Address The Issues.
              </DialogDescription>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <p className="text-sm text-gray-300">
              Help us improve Sky Bronze by reporting any issues, bugs, or problems you encounter. Please provide as much detail as possible.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="report-text" className="text-white font-semibold">
                Describe the Issue
              </Label>
              <span className="text-xs text-gray-400">
                {wordCount} / 5000 words
              </span>
            </div>
            <Textarea
              id="report-text"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Please describe the issue in detail... What were you doing when this happened? What did you expect to happen? What actually happened?"
              className="bg-slate-800/50 border-gray-600 text-white placeholder-gray-500 resize-none h-48 focus:border-orange-500 focus:ring-orange-500/20"
              maxLength={50000}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Maximum 5000 words</span>
              <span className={wordCount > 5000 ? "text-red-400" : ""}>
                {wordCount > 4500 ? `${5000 - wordCount} words remaining` : ""}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>
          )}

          {submitStatus === "success" && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm text-green-300">Report submitted successfully! Thank you for helping improve Sky Bronze.</p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-white/10"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
              disabled={isSubmitting || !reportText.trim() || wordCount > 5000}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
