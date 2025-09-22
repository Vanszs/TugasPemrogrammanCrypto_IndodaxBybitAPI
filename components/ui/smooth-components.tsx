// Enhanced UI components with smooth animations
import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

// Animated Number Component
interface AnimatedNumberProps {
  value: string | number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  duration?: number
  symbol?: string // Add symbol identifier to reset animation on coin change
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 2,
  duration = 800,
  symbol = ""
}) => {
  const [displayValue, setDisplayValue] = useState<number | null>(null)
  const [isIncreasing, setIsIncreasing] = useState<boolean | null>(null)
  const previousValueRef = useRef<number | null>(null)
  const previousSymbolRef = useRef<string>("")

  useEffect(() => {
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value
    
    // Immediately set the value without animation in all cases
    setDisplayValue(numericValue)
    
    // Only detect increase/decrease when the symbol hasn't changed
    if (previousSymbolRef.current === symbol && previousValueRef.current !== null) {
      if (numericValue !== previousValueRef.current) {
        setIsIncreasing(numericValue > previousValueRef.current)
        // Reset color change indication after a short delay
        setTimeout(() => setIsIncreasing(null), 800)
      }
    }
    
    // Update refs for next comparison
    previousValueRef.current = numericValue
    previousSymbolRef.current = symbol
    
  }, [value, symbol])

  const getColorClass = () => {
    if (isIncreasing === true) return 'text-emerald-400'
    if (isIncreasing === false) return 'text-red-400'
    return ''
  }

  const formatDisplayValue = (value: number) => {
    // Helper function to add thousand separators with dots (Indonesian format)
    const addThousandSeparators = (numStr: string) => {
      const parts = numStr.split('.')
      const integerPart = parts[0]
      const decimalPart = parts[1]
      
      // Add dots as thousand separators
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
      
      return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger
    }

    // Always show full numbers without abbreviations
    let formattedNumber: string
    
    // For small numbers (< 1), show up to 10 decimal places but remove trailing zeros
    if (value < 1) {
      formattedNumber = parseFloat(value.toFixed(10)).toString()
    } else if (value < 100) {
      // For numbers 1-100, show up to 6 decimal places
      formattedNumber = parseFloat(value.toFixed(6)).toString()
    } else {
      // For larger numbers, show up to 2 decimal places if needed, but keep full value
      formattedNumber = value % 1 === 0 ? value.toString() : parseFloat(value.toFixed(2)).toString()
    }
    
    // Apply thousand separators for numbers >= 1000
    if (Math.abs(value) >= 1000) {
      return addThousandSeparators(formattedNumber)
    }
    
    return formattedNumber
  }

  return (
    <span className={cn(
      "font-mono number-display card-number",
      getColorClass(),
      isIncreasing !== null && "animate-pulse",
      className
    )}>
      {prefix}
      {displayValue !== null ? formatDisplayValue(displayValue) : "..."}
      {suffix}
    </span>
  )
}

// Smooth Price Card Component
interface SmoothPriceCardProps {
  title: string
  value: string | number
  prefix?: string
  suffix?: string
  change?: string
  changePercent?: string
  icon?: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  className?: string
  symbol?: string
}

export const SmoothPriceCard: React.FC<SmoothPriceCardProps> = ({
  title,
  value,
  prefix = "",
  suffix = "",
  change,
  changePercent,
  icon: Icon,
  trend = 'neutral',
  loading = false,
  className = "",
  symbol
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const trendConfig = {
    up: {
      cardClass: 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5',
      iconClass: 'text-emerald-400',
      changeClass: 'text-emerald-400'
    },
    down: {
      cardClass: 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5',
      iconClass: 'text-red-400',
      changeClass: 'text-red-400'
    },
    neutral: {
      cardClass: 'border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5',
      iconClass: 'text-primary',
      changeClass: 'text-muted-foreground'
    }
  }

  const config = trendConfig[trend]

  if (loading) {
    return (
      <div className={cn(
        "relative overflow-hidden rounded-xl border p-4 lg:p-6 bg-muted/20",
        className
      )}>
        <div className="space-y-3">
          <div className="h-3 sm:h-4 w-16 sm:w-20 bg-muted/40 rounded animate-pulse" />
          <div className="h-6 sm:h-7 lg:h-8 w-24 sm:w-28 lg:w-32 bg-muted/40 rounded animate-pulse" />
          <div className="h-3 w-12 sm:w-16 bg-muted/30 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4 lg:p-6 transform hover:scale-105 hover:shadow-xl",
      config.cardClass,
      isVisible ? "opacity-100" : "opacity-0",
      className
    )}>
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
      
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          {Icon && (
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0", config.iconClass)} />
          )}
        </div>
        
        <div className="space-y-1 min-w-0">
          <div className="price-info min-w-0">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              symbol={symbol}
              className="price-value text-lg sm:text-xl lg:text-2xl font-bold leading-tight card-number"
            />
          </div>
          
          {(change || changePercent) && (
            <div className={cn("flex items-center gap-1 text-xs sm:text-sm flex-wrap", config.changeClass)}>
              {trend === 'up' && <TrendingUp className="w-3 h-3 flex-shrink-0" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3 flex-shrink-0" />}
              {change && <span className="card-number min-w-0">{change}</span>}
              {changePercent && <span className="whitespace-nowrap">({changePercent}%)</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Live Connection Indicator
interface LiveConnectionIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  exchange?: string
  lastUpdate?: number
}

export const LiveConnectionIndicator: React.FC<LiveConnectionIndicatorProps> = ({
  status,
  exchange = '',
  lastUpdate
}) => {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (status === 'connected' && lastUpdate) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 500)
      return () => clearTimeout(timer)
    }
  }, [lastUpdate, status])

  const statusConfig = {
    connected: {
      color: 'bg-emerald-500',
      text: 'Live',
      textColor: 'text-emerald-400'
    },
    connecting: {
      color: 'bg-yellow-500',
      text: 'Connecting',
      textColor: 'text-yellow-400'
    },
    disconnected: {
      color: 'bg-gray-500',
      text: 'Offline',
      textColor: 'text-gray-400'
    },
    error: {
      color: 'bg-red-500',
      text: 'Error',
      textColor: 'text-red-400'
    }
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={cn(
          "w-2 h-2 rounded-full transition-all duration-300",
          config.color,
          pulse && "animate-ping"
        )} />
        <div className={cn(
          "absolute inset-0 w-2 h-2 rounded-full",
          config.color,
          status === 'connecting' && "animate-pulse"
        )} />
      </div>
      <span className={cn("text-xs font-medium", config.textColor)}>
        {config.text} {exchange && `• ${exchange}`}
      </span>
    </div>
  )
}

// Smooth Card Transition
interface SmoothCardProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export const SmoothCard: React.FC<SmoothCardProps> = ({
  children,
  className = "",
  delay = 0
}) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <Card className={cn(
      "backdrop-blur-xl bg-background/60 border-border/50",
      isVisible ? "opacity-100" : "opacity-0",
      className
    )}>
      {children}
    </Card>
  )
}

// Smooth List Item
interface SmoothListItemProps {
  children: React.ReactNode
  className?: string
  delay?: number
  onClick?: () => void
  isSelected?: boolean
}

export const SmoothListItem: React.FC<SmoothListItemProps> = ({
  children,
  className = "",
  delay = 0,
  onClick,
  isSelected = false
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={cn(
        "cursor-pointer rounded-xl",
        isVisible ? "opacity-100" : "opacity-0",
        isSelected && "scale-[1.02] shadow-lg bg-primary/10 border-primary/20",
        isHovered && !isSelected && "scale-[1.01] shadow-md bg-accent/30",
        className
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}

// Smooth Loading Skeleton
export const SmoothSkeleton: React.FC<{ 
  className?: string
  lines?: number
  animate?: boolean
}> = ({ 
  className = "", 
  lines = 1,
  animate = true
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 rounded",
            animate && "animate-shimmer bg-[length:200%_100%]",
            className
          )}
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  )
}

// Smooth Page Transition
export const SmoothPageTransition: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = "" }) => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={cn(
      isLoaded ? "opacity-100" : "opacity-0",
      className
    )}>
      {children}
    </div>
  )
}