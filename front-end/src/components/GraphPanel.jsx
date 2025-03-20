// GraphPanel.js
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import GraphVisualization from "@/components/graph-visualization"


export function GraphPanel({ 
  nodes, 
  edges, 
  zoomLevel, 
  isServerMode, 
  onZoomIn, 
  onZoomOut, 
  onNodeSelect,
  perspective 
}) {
  return (
    <div className="h-full flex flex-col">
      {/* <div className="border-b p-2 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Graph View</span>
          {!isServerMode && <span className="text-xs text-muted-foreground">(Local Rendering)</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={onZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div> */}
      <div className="flex-1 overflow-auto bg-[#f8f9fa] dark:bg-slate-900">
        <GraphVisualization
          nodes={nodes}
          edges={edges}
          onNodeSelect={onNodeSelect}
          perspective={perspective}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  )
}