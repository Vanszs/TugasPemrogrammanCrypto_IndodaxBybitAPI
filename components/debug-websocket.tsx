'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import TradeWebSocketManager from '@/lib/trade-websocket-manager'

/**
 * A debug component to monitor active WebSocket connections
 * Only use in development mode
 */
export default function DebugWebSocket() {
  const [connections, setConnections] = useState<string[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const manager = TradeWebSocketManager.getInstance()
        const activeConnections = manager.getActiveConnections()
        setConnections(activeConnections)
      } catch (err) {
        console.error('Failed to get active connections:', err)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) {
    return (
      <div className="fixed bottom-2 right-2 z-50">
        <button
          className="bg-yellow-600/20 text-yellow-300 rounded-full p-2 text-xs"
          onClick={() => setIsVisible(true)}
        >
          Debug
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-2 right-2 z-50 bg-black/80 rounded-lg p-3 max-w-[300px] shadow-lg border border-yellow-600/30">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-yellow-400 text-xs font-mono">WebSocket Connections</h4>
        <button 
          className="text-gray-400 hover:text-white text-xs"
          onClick={() => setIsVisible(false)}
        >
          Close
        </button>
      </div>
      
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {connections.length === 0 ? (
          <div className="text-gray-400 text-xs">No active connections</div>
        ) : (
          connections.map(conn => (
            <Badge key={conn} variant="outline" className="bg-yellow-900/20 text-yellow-200 text-xs block">
              {conn}
            </Badge>
          ))
        )}
      </div>
      
      <div className="text-gray-400 text-[10px] mt-2 font-mono">
        Active: {connections.length}
      </div>
    </div>
  )
}