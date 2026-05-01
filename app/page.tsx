'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold">Light TV</div>
          <a href="/terms" className="text-gray-400 text-sm hover:text-white">Terms of Service</a>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full space-y-8">
          
          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold">Light TV</h1>
            <p className="text-xl text-gray-400">
              Your premium IPTV streaming experience. Watch live TV channels from around the world.
            </p>
          </div>

          {/* Features Card */}
          <div className="border border-gray-800 p-8 space-y-4">
            <h2 className="text-2xl font-bold">Welcome to Light TV</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="font-bold">•</span>
                <span>100+ Live TV Channels</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">•</span>
                <span>HD & 4K Quality Streaming</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">•</span>
                <span>24/7 Channel Support</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">•</span>
                <span>Secure Token-Based Access</span>
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 flex-col sm:flex-row">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 bg-black border border-white text-white py-3 px-6 font-bold hover:bg-white hover:text-black transition"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/register')}
              className="flex-1 bg-black border border-white text-white py-3 px-6 font-bold hover:bg-white hover:text-black transition"
            >
              Register
            </button>
          </div>

          {/* Terms Link */}
          <p className="text-center text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-white hover:underline">
              Terms of Service
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 px-6 py-4 text-center text-gray-500 text-sm">
        <p>© 2026 Light TV. All rights reserved.</p>
      </div>
    </div>
  )
}
