"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Database, Settings } from "lucide-react"

export function SetupCheck() {
  const [setupStatus, setSetupStatus] = useState<{
    database: boolean
    integration: boolean
    checking: boolean
  }>({
    database: false,
    integration: false,
    checking: true,
  })

  useEffect(() => {
    checkSetup()
  }, [])

  const checkSetup = async () => {
    try {
      // Check if database tables exist by trying to query them
      const sessionResponse = await fetch("/api/check-session")
      const databaseWorking = sessionResponse.status !== 500

      // Check if Supabase env vars are available
      const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setSetupStatus({
        database: databaseWorking,
        integration: hasSupabaseUrl && hasSupabaseKey,
        checking: false,
      })
    } catch (error) {
      console.error("Setup check failed:", error)
      setSetupStatus({
        database: false,
        integration: false,
        checking: false,
      })
    }
  }

  const allGood = setupStatus.database && setupStatus.integration

  if (setupStatus.checking) {
    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
            <span className="text-white">Checking setup...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (allGood) {
    return null // Don't show anything if setup is complete
  }

  return (
    <Card className="bg-red-500/10 backdrop-blur-lg border-red-500/20 mb-6">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Setup Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            {setupStatus.database ? (
              <CheckCircle className="w-5 h-5 text-purple-400" />
            ) : (
              <Database className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white">Database Tables {setupStatus.database ? "✓" : "✗"}</span>
          </div>

          <div className="flex items-center space-x-3">
            {setupStatus.integration ? (
              <CheckCircle className="w-5 h-5 text-purple-400" />
            ) : (
              <Settings className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white">Supabase Integration {setupStatus.integration ? "✓" : "✗"}</span>
          </div>
        </div>

        <div className="bg-black/20 rounded-lg p-4 text-sm text-white/90">
          <p className="font-semibold mb-2">To fix these issues:</p>
          <ol className="list-decimal list-inside space-y-1 text-white/80">
            {!setupStatus.integration && <li>Connect Supabase integration in Project Settings</li>}
            {!setupStatus.database && <li>Run the database setup scripts in the Scripts tab</li>}
          </ol>
        </div>

        <Button
          onClick={checkSetup}
          variant="outline"
          className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Check Again
        </Button>
      </CardContent>
    </Card>
  )
}
