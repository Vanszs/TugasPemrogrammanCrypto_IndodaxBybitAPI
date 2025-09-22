import React from 'react'
import { generateCoinInitials } from '@/lib/utils'

interface CoinIconProps {
  symbol: string
  exchange: 'indodax' | 'bybit'
  existingLogo?: string
  className?: string
}

export const CoinIcon: React.FC<CoinIconProps> = ({
  symbol,
  exchange,
  existingLogo,
  className = "w-10 h-10 rounded-full ring-2 ring-border/20"
}) => {
  // For Indodax, use existing logo if available
  if (exchange === 'indodax' && existingLogo) {
    return (
      <img
        src={existingLogo}
        alt={symbol}
        className={className}
        onError={(e) => {
          // On error, replace with initials
          e.currentTarget.src = generateCoinInitials(symbol)
        }}
      />
    )
  }

  // For Bybit or when no logo available, use initials
  return (
    <img
      src={generateCoinInitials(symbol)}
      alt={symbol}
      className={className}
    />
  )
}