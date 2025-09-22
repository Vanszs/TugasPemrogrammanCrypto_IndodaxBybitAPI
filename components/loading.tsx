"use client"

import { Loader2, TrendingUp, Activity, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export const LoadingSpinner = ({ size = "md", className = "" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface SkeletonLoaderProps {
  className?: string
  lines?: number
  showAvatar?: boolean
}

export const SkeletonLoader = ({ className = "", lines = 3, showAvatar = false }: SkeletonLoaderProps) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      )}
      
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} 
        />
      ))}
    </div>
  )
}

export const CryptoListSkeleton = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-4 border border-border/30 rounded-xl animate-pulse">
          <div className="flex items-center gap-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export const TickerSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export const TradesSkeleton = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-muted/20 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export const OrderBookSkeleton = () => {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex justify-between p-2 rounded-lg animate-pulse">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-red-400 transform rotate-180" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex justify-between p-2 rounded-lg animate-pulse">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface FullPageLoadingProps {
  title?: string
  description?: string
}

export const FullPageLoading = ({ 
  title = "Loading...", 
  description = "Please wait while we fetch the latest data." 
}: FullPageLoadingProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <LoadingSpinner size="lg" className="text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>

          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface DataLoadingStateProps {
  loading: boolean
  error: any
  data: any
  children: React.ReactNode
  loadingSkeleton?: React.ReactNode
  errorFallback?: React.ReactNode
  emptyState?: React.ReactNode
  emptyMessage?: string
}

export const DataLoadingState = ({
  loading,
  error,
  data,
  children,
  loadingSkeleton,
  errorFallback,
  emptyState,
  emptyMessage = "No data available"
}: DataLoadingStateProps) => {
  if (loading) {
    return loadingSkeleton || <SkeletonLoader />
  }

  if (error) {
    return errorFallback || (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <Activity className="w-6 h-6 text-destructive" />
        </div>
        <p className="text-destructive font-medium">Error loading data</p>
        <p className="text-sm text-muted-foreground mt-1">
          {error?.message || "Something went wrong"}
        </p>
      </div>
    )
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return emptyState || (
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return <>{children}</>
}

// Inline loading states for buttons and small components
export const ButtonLoading = ({ children, loading, ...props }: any) => {
  return (
    <button disabled={loading} {...props}>
      {loading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// Shimmer effect component
export const ShimmerCard = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`relative overflow-hidden bg-muted/20 rounded-lg ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}