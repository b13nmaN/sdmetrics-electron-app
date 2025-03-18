// components/StatusBar.jsx
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

export function StatusBar({ nodes, edges }) {
  return (
    <div className="border-t py-2 px-4 flex justify-between items-center bg-muted/20">
      <div className="flex space-x-4">
        <span>Nodes: {nodes.length}</span>
        <Separator orientation="vertical" className="h-4 my-auto" />
        <span>Edges: {edges.length}</span>
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
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}