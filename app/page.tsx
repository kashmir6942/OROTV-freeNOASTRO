"use client"

import { useRouter } from "next/navigation"
import { Tv } from "lucide-react"

export default function LandingPage() {
  const router = useRouter()

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1a2d 100%)',
      }}
    >
      {/* Logo and Branding */}
      <div className="text-center mb-12">
        <div className="mb-6">
          <img 
            src="/images/light-logo.png" 
            alt="Light TV" 
            className="h-24 w-auto mx-auto"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Tv className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400">Light TV</h1>
        </div>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Your premium IPTV streaming experience. Watch live TV channels from around the world.
        </p>
      </div>

      {/* Introduction Card */}
      <div 
        className="w-full max-w-md p-8 rounded-2xl mb-8"
        style={{
          background: 'rgba(20, 35, 60, 0.6)',
          border: '1px solid rgba(100, 150, 200, 0.15)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <h2 className="text-xl font-semibold text-white mb-4 text-center">Welcome to Light TV</h2>
        <ul className="text-gray-300 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            100+ Live TV Channels
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            HD & 4K Quality Streaming
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            24/7 Channel Support
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Secure Token-Based Access
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={() => router.push('/login')}
          className="flex-1 py-4 px-8 rounded-xl font-semibold text-white text-lg transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(90deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)',
            boxShadow: '0 4px 20px rgba(6, 182, 212, 0.3)',
          }}
        >
          Login
        </button>
        <button
          onClick={() => router.push('/register')}
          className="flex-1 py-4 px-8 rounded-xl font-semibold text-cyan-400 text-lg transition-all hover:scale-105"
          style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: '2px solid rgba(6, 182, 212, 0.5)',
          }}
        >
          Register
        </button>
      </div>

      {/* Footer */}
      <p className="mt-12 text-gray-500 text-sm">
        By continuing, you agree to our Terms of Service
      </p>
    </div>
  )
}
