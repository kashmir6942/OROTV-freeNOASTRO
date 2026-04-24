"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, Clock, Play } from "lucide-react"
import { allChannels, type Channel } from "@/data/channels/all-channels"

interface TestResult {
  channelId: string
  status: "testing" | "success" | "failed" | "pending"
  responseTime?: number
  error?: string
}

export function ChannelTestSettings() {
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [isTestingAll, setIsTestingAll] = useState(false)
  const [progress, setProgress] = useState(0)

  const testChannel = async (channel: Channel): Promise<TestResult> => {
    const startTime = Date.now()

    try {
      const response = await fetch(channel.url, {
        method: "HEAD",
        mode: "no-cors",
      })

      const responseTime = Date.now() - startTime

      return {
        channelId: channel.id,
        status: "success",
        responseTime,
      }
    } catch (error) {
      return {
        channelId: channel.id,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  const testSingleChannel = async (channel: Channel) => {
    setTestResults((prev) => ({
      ...prev,
      [channel.id]: { channelId: channel.id, status: "testing" },
    }))

    const result = await testChannel(channel)

    setTestResults((prev) => ({
      ...prev,
      [channel.id]: result,
    }))
  }

  const testAllChannels = async () => {
    setIsTestingAll(true)
    setProgress(0)
    setTestResults({})

    // Initialize all channels as pending
    const initialResults: Record<string, TestResult> = {}
    allChannels.forEach((channel) => {
      initialResults[channel.id] = { channelId: channel.id, status: "pending" }
    })
    setTestResults(initialResults)

    // Test channels in batches to avoid overwhelming the network
    const batchSize = 5
    for (let i = 0; i < allChannels.length; i += batchSize) {
      const batch = allChannels.slice(i, i + batchSize)

      const batchPromises = batch.map(async (channel) => {
        setTestResults((prev) => ({
          ...prev,
          [channel.id]: { channelId: channel.id, status: "testing" },
        }))

        const result = await testChannel(channel)

        setTestResults((prev) => ({
          ...prev,
          [channel.id]: result,
        }))

        return result
      })

      await Promise.all(batchPromises)
      setProgress(((i + batchSize) / allChannels.length) * 100)
    }

    setIsTestingAll(false)
    setProgress(100)
  }

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "testing":
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "success":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      case "testing":
        return "bg-yellow-500"
      default:
        return "bg-gray-400"
    }
  }

  const successCount = Object.values(testResults).filter((r) => r.status === "success").length
  const failedCount = Object.values(testResults).filter((r) => r.status === "failed").length
  const totalTested = successCount + failedCount

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Channel Testing</CardTitle>
          <CardDescription>Test all channels to verify their streaming status and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Channels: {allChannels.length}</p>
              {totalTested > 0 && (
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-600">✓ {successCount} Working</span>
                  <span className="text-red-600">✗ {failedCount} Failed</span>
                </div>
              )}
            </div>
            <Button onClick={testAllChannels} disabled={isTestingAll} className="min-w-[120px]">
              {isTestingAll ? "Testing..." : "Test All Channels"}
            </Button>
          </div>

          {isTestingAll && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Testing Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {allChannels.map((channel) => {
          const result = testResults[channel.id]

          return (
            <Card key={channel.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={channel.logo || "/placeholder.svg"}
                    alt={channel.name}
                    className="w-10 h-10 rounded object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=40&width=40"
                    }}
                  />
                  <div>
                    <h3 className="font-medium">{channel.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {channel.group}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {channel.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {result && (
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(result.status)}
                      <div className="text-sm">
                        {result.status === "success" && result.responseTime && (
                          <span className="text-green-600">{result.responseTime}ms</span>
                        )}
                        {result.status === "failed" && <span className="text-red-600">Failed</span>}
                        {result.status === "testing" && <span className="text-yellow-600">Testing...</span>}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testSingleChannel(channel)}
                    disabled={result?.status === "testing"}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                </div>
              </div>

              {result?.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  Error: {result.error}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
