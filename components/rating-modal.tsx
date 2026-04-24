"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Star, Plus, Send } from "lucide-react"

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  defaultUserType?: string
  defaultUsername?: string
}

export function RatingModal({ isOpen, onClose, defaultUserType, defaultUsername }: RatingModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [userType, setUserType] = useState(defaultUserType || "")
  const [username, setUsername] = useState(defaultUsername || "")
  const [satisfactionComment, setSatisfactionComment] = useState("")
  const [complaint, setComplaint] = useState("")
  const [issues, setIssues] = useState<string[]>([])
  const [newIssue, setNewIssue] = useState("")
  const [featuresToAdd, setFeaturesToAdd] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const ratingLabels = ["", "Bad", "Poor", "Average", "Good", "Excellent"]

  const addIssue = () => {
    if (newIssue.trim() && !issues.includes(newIssue.trim())) {
      setIssues([...issues, newIssue.trim()])
      setNewIssue("")
    }
  }

  const removeIssue = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/submit-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_type: userType || "Anonymous",
          username: username || null,
          rating,
          satisfaction_comment: satisfactionComment || null,
          complaint: complaint || null,
          issues,
          features_to_add: featuresToAdd || null,
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
          // Reset form
          setRating(0)
          setSatisfactionComment("")
          setComplaint("")
          setIssues([])
          setFeaturesToAdd("")
          setSuccess(false)
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to submit rating")
      }
    } catch (err) {
      setError("Failed to submit rating. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate preview text
  const previewText = `/${userType || "user"}/${username || "anonymous"} : ${rating} Stars${satisfactionComment ? `, Comment: ${satisfactionComment}` : ""}${complaint ? `, Complaint: ${complaint}` : ""}${featuresToAdd ? `, Functions wanna add: ${featuresToAdd}` : ""}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white text-2xl font-bold">Rate Your Experience</h2>
              <p className="text-gray-400 text-sm">Your feedback helps us improve</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Thank you!</h3>
              <p className="text-gray-400">Your feedback has been submitted successfully.</p>
            </div>
          ) : (
            <>
              {/* User Type & Username */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">User Type & Username</label>
                <div className="flex gap-2">
                  <Input
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                    placeholder="e.g., PHCORNER USER"
                    className="bg-gray-800 border-gray-700 text-white flex-1"
                  />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    className="bg-gray-800 border-gray-700 text-white flex-1"
                  />
                </div>
              </div>

              {/* Rating Stars */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Rating <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-gray-400 ml-2">{ratingLabels[hoverRating || rating]}</span>
                </div>
              </div>

              {/* Satisfaction Comment */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Satisfaction / Comment <span className="text-gray-500">(Optional)</span>
                </label>
                <Textarea
                  value={satisfactionComment}
                  onChange={(e) => setSatisfactionComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                />
              </div>

              {/* Complaint */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Complaint <span className="text-gray-500">(Optional)</span>
                </label>
                <Textarea
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  placeholder="Any issues or complaints?"
                  className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                />
              </div>

              {/* Issues */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Issues <span className="text-gray-500">(Optional - list each issue separately)</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newIssue}
                    onChange={(e) => setNewIssue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIssue())}
                    placeholder="Add an issue..."
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Button onClick={addIssue} size="icon" className="bg-gray-700 hover:bg-gray-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {issues.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {issues.map((issue, i) => (
                      <span
                        key={i}
                        className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {issue}
                        <button onClick={() => removeIssue(i)} className="text-gray-500 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Features to Add */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Functions / Features to Add <span className="text-gray-500">(Optional)</span>
                </label>
                <Textarea
                  value={featuresToAdd}
                  onChange={(e) => setFeaturesToAdd(e.target.value)}
                  placeholder="What features would you like to see?"
                  className="bg-gray-800 border-gray-700 text-white min-h-[60px]"
                />
              </div>

              {/* Preview */}
              <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="text-gray-400 text-xs mb-1">Preview</div>
                <div className="text-gray-300 text-sm font-mono break-all">{previewText}</div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
                className="w-full bg-white text-black hover:bg-gray-200 font-medium py-3"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Submit Rating
                  </div>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
