import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

const geistSans = GeistSans.variable
const geistMono = GeistMono.variable

export const metadata: Metadata = {
  title: "Tugas Pemrogramman Crypto",
  description: "Real-time cryptocurrency trading dashboard supporting Indodax and Bybit exchanges",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans} ${geistMono} antialiased dark`}>
      <body className="dark">{children}</body>
    </html>
  )
}
