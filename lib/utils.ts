import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Bitcoin, Coins, DollarSign } from 'lucide-react'
import React from 'react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Crypto icon mapping for common currencies
export const getCryptoIcon = (symbol: string) => {
  const cleanSymbol = symbol.toLowerCase().replace(/usdt?|idr|_.*$/g, '')
  
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'btc': Bitcoin,
    'bitcoin': Bitcoin,
    'eth': Coins,
    'ethereum': Coins,
    'usdt': DollarSign,
    'tether': DollarSign,
    'bnb': Coins,
    'ada': Coins,
    'sol': Coins,
    'xrp': Coins,
    'dot': Coins,
    'matic': Coins,
    'avax': Coins,
    'link': Coins,
    'uni': Coins,
    'default': Coins
  }
  
  return iconMap[cleanSymbol] || iconMap['default']
}

// Extract clean symbol from trading pairs for initials
export function extractCoinSymbol(symbol: string): string {
  let cleanSymbol = symbol.toLowerCase()
    .replace(/usdt?$/i, '') // Remove USDT/USDT suffix
    .replace(/idr$/i, '')   // Remove IDR suffix
    .replace(/usd$/i, '')   // Remove USD suffix
    .replace(/btc$/i, '')   // Remove BTC suffix
    .replace(/eth$/i, '')   // Remove ETH suffix
    .replace(/^1000/i, '')  // Remove 1000 prefix (like 1000PEPE -> PEPE)
    .replace(/[_\-\/]/g, '') // Remove separators
  
  return cleanSymbol.toUpperCase()
}

// Generate simple initials placeholder for coins
export function generateCoinInitials(symbol: string): string {
  const cleanSymbol = extractCoinSymbol(symbol)
  const initials = cleanSymbol.length >= 2 ? cleanSymbol.substring(0, 2) : cleanSymbol
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#grad)" />
      <text x="20" y="26" font-family="Arial, sans-serif" font-size="12" font-weight="bold" 
            text-anchor="middle" fill="white">${initials}</text>
    </svg>
  `)}`
}
