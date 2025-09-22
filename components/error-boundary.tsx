"use client"

import React from "react"
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error | null
  resetError: () => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo)
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />
    }

    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. You can try refreshing the page or contact support if the problem persists.
        </p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Error details (Development)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="flex gap-2">
          <Button onClick={resetError} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button 
            onClick={() => window.location.reload()} 
            variant="destructive" 
            size="sm"
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Specific error components for different scenarios
export const ApiErrorFallback: React.FC<ErrorFallbackProps & { 
  title?: string
  description?: string 
}> = ({ 
  error, 
  resetError, 
  title = "API Error", 
  description = "Failed to load data from the server." 
}) => {
  return (
    <div className="flex items-center justify-center p-8">
      <Card className="max-w-md w-full border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <WifiOff className="h-6 w-6 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {process.env.NODE_ENV === 'development' && error && (
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              {error.message}
            </p>
          )}

          <Button onClick={resetError} variant="outline" size="sm" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export const NetworkErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  return (
    <ApiErrorFallback
      error={error}
      resetError={resetError}
      title="Network Error"
      description="Unable to connect to the server. Please check your internet connection."
    />
  )
}

// Connection status component
interface ConnectionStatusProps {
  status: "connected" | "disconnected" | "connecting" | "error"
  exchange?: string
  lastUpdate?: number
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  status, 
  exchange = "API",
  lastUpdate 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          variant: "default" as const,
          icon: Wifi,
          text: "Live Data",
          className: "bg-emerald-500 hover:bg-emerald-600 animate-pulse"
        }
      case "connecting":
        return {
          variant: "secondary" as const,
          icon: RefreshCw,
          text: "Connecting...",
          className: "animate-pulse"
        }
      case "error":
        return {
          variant: "destructive" as const,
          icon: AlertTriangle,
          text: "Error",
          className: ""
        }
      default:
        return {
          variant: "secondary" as const,
          icon: WifiOff,
          text: "Offline",
          className: ""
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2">
      <Badge variant={config.variant} className={`${config.className} transition-all duration-300`}>
        <Icon className={`w-3 h-3 mr-1 ${status === "connecting" ? "animate-spin" : ""}`} />
        {config.text}
      </Badge>
      
      {lastUpdate && status === "connected" && (
        <span className="text-xs text-muted-foreground">
          {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}