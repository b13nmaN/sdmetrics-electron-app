// GraphPanel.js
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import GraphVisualization from "@/components/graph-visualization"

export function GraphPanel({ 
  matrices, 
  activeMatrixTab, 
  zoomLevel, 
  isServerMode, 
  onZoomIn, 
  onZoomOut, 
  onNodeSelect,
  perspective 
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end p-2 space-x-2">
        <Button variant="outline" size="icon" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon">
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto bg-[#f8f9fa] dark:bg-slate-900">
        <GraphVisualization
          matrices={matrices}
          activeMatrixTab={activeMatrixTab}
          onNodeSelect={onNodeSelect}
          perspective={perspective}
          zoomLevel={zoomLevel}
        />
      </div>
    </div>
  )
}