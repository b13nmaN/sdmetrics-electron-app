// components/StatusBar.jsx
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

export function StatusBar({ matrices, activeMatrixTab, metrics }) {
  // Calculate node and edge counts from the active matrix
  const getCountsFromMatrix = () => {
    if (!matrices || !activeMatrixTab || !matrices[activeMatrixTab]) {
      return { nodeCount: 0, edgeCount: 0 };
    }
    
    const matrix = matrices[activeMatrixTab];
    const uniqueNodes = new Set([...matrix.columns, ...Object.keys(matrix.rows)]);
    
    let edgeCount = 0;
    Object.values(matrix.rows).forEach(rowValues => {
      rowValues.forEach(value => {
        if (value > 0) edgeCount++;
      });
    });
    
    return { nodeCount: uniqueNodes.size, edgeCount };
  };
  
  const { nodeCount, edgeCount } = getCountsFromMatrix();
  
  // Get key metrics based on the active matrix type
  const getMetricsDisplay = () => {
    if (!metrics) return null;
    
    // Determine which metrics to display based on matrix type
    let keysToShow = [];
    
    if (activeMatrixTab?.includes("Class")) {
      keysToShow = ['avg_coupling', 'avg_cohesion', 'complexity'];
    } else if (activeMatrixTab?.includes("Package")) {
      keysToShow = ['modularity', 'avg_stability', 'encapsulation'];
    } else {
      // Default set of metrics
      keysToShow = Object.keys(metrics).slice(0, 2);
    }
    
    return keysToShow.map(key => {
      if (metrics[key] !== undefined) {
        return (
          <span key={key}>
            {key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}: {metrics[key].toFixed(2)}
          </span>
        );
      }
      return null;
    }).filter(Boolean);
  };
  
  const metricsDisplay = getMetricsDisplay();

  return (
    <div className="border-t py-2 px-4 flex justify-between items-center bg-muted/20">
      <div className="flex space-x-4">
        <span>Nodes: {nodeCount}</span>
        <Separator orientation="vertical" className="h-4 my-auto" />
        <span>Edges: {edgeCount}</span>
        
        {activeMatrixTab && (
          <>
            <Separator orientation="vertical" className="h-4 my-auto" />
            <span>Matrix: {activeMatrixTab.replace(/_/g, " ")}</span>
          </>
        )}
        
        {metricsDisplay && metricsDisplay.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-4 my-auto" />
            <div className="flex space-x-4">
              {metricsDisplay}
            </div>
          </>
        )}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click on nodes to view their properties.</p>
            <p>Use the perspective toggle to change the view.</p>
            <p>Select different matrices from the dropdown above.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}