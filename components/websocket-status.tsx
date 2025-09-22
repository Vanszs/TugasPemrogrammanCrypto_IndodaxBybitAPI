"use client"

import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Activity } from "lucide-react"

interface WebSocketStatusProps {
  status: "connected" | "disconnected" | "connecting"
}

export function WebSocketStatus({ status }: WebSocketStatusProps) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <Wifi className="w-3 h-3 mr-1" />
          Live Data
        </Badge>
      )
    case "connecting":
      return (
        <Badge variant="secondary">
          <Activity className="w-3 h-3 mr-1 animate-pulse" />
          Connecting...
        </Badge>
      )
    case "disconnected":
      return (
        <Badge variant="destructive">
          <WifiOff className="w-3 h-3 mr-1" />
          Polling Mode
        </Badge>
      )
  }
}
