import type React from "react"
import type { Metadata } from "next"
import { Roboto, Inter } from 'next/font/google'
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import DevToolsProtection from "@/components/dev-tools-protection"
import { PHCornerUsernameProvider } from "@/components/phcorner-username-provider"
import { SupportPopup } from "@/components/support-popup"

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
})

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Cignal Station - Free Live TV Streaming",
  description:
    "Cignal Station: Your free gateway to live TV channels and entertainment. Stream your favorite content with a fresh, modern interface designed for everyone.",
  generator: "Cignal Station",
  keywords: ["streaming", "live tv", "channels", "free", "entertainment", "cignal", "cignal station"],
  icons: {
    icon: [
      { url: "/images/cignal-station-icon.png", sizes: "any" },
      { url: "/images/cignal-station-icon.png", sizes: "192x192", type: "image/png" },
      { url: "/images/cignal-station-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/cignal-station-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover, user-scalable=yes",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${roboto.variable} ${inter.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function removeV0Button() {
                  document.querySelectorAll('[aria-label*="v0"], [aria-label*="vercel"], [aria-label*="built"]').forEach(el => {
                    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                      el.remove();
                      return;
                    }
                  });
                  
                  document.querySelectorAll('[title*="v0"], [title*="vercel"], [title*="built"]').forEach(el => {
                    el.remove();
                  });
                  
                  document.querySelectorAll('[style*="position: fixed"]').forEach(el => {
                    const style = el.getAttribute('style') || '';
                    if ((style.includes('bottom') || style.includes('right')) && el.querySelector('button')) {
                      el.remove();
                    }
                  });
                  
                  const lastChild = document.body.lastElementChild;
                  if (lastChild && lastChild.tagName === 'DIV' && lastChild.querySelector('button:only-child')) {
                    lastChild.remove();
                  }
                  
                  document.querySelectorAll('[class*="v0"], [class*="vercel"], [class*="built-with"]').forEach(el => {
                    el.remove();
                  });
                  
                  document.querySelectorAll('svg[aria-label*="v0"], svg[aria-label*="vercel"]').forEach(el => {
                    el.remove();
                  });
                  
                  document.querySelectorAll('button').forEach(btn => {
                    const rect = btn.getBoundingClientRect();
                    if (rect.bottom > window.innerHeight - 100 && rect.right > window.innerWidth - 100) {
                      btn.remove();
                    }
                  });
                }
                
                removeV0Button();
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', removeV0Button);
                }
                
                const observer = new MutationObserver(() => {
                  removeV0Button();
                });
                
                observer.observe(document.body, {
                  childList: true,
                  subtree: true,
                  attributes: true
                });
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="bos-theme">
          <PHCornerUsernameProvider>{children}</PHCornerUsernameProvider>
          <SupportPopup />
          <DevToolsProtection />
        </ThemeProvider>
      </body>
    </html>
  )
}
