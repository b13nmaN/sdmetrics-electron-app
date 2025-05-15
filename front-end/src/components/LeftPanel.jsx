// components/LeftPanel.jsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Layers } from "lucide-react"
import PropertiesPanel from "@/components/properties-panel"
import { useState } from "react"

export function LeftPanel({ 
  searchTerm, 
  setSearchTerm, 
  filter, 
  setFilter, 
  selectedNode,
  jsonData,
}) {
  // Add state for view all nodes mode
  const [viewAllNodes, setViewAllNodes] = useState(false);

  console.log("LeftPanel", { searchTerm, filter, selectedNode, jsonData, viewAllNodes });
  // Get unique node categories
  const nodeCategories = ["All", "Class", "Interface", "Package"];

  return (
    <ScrollArea className="w-1/4 border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button size="icon" variant="ghost">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          variant={viewAllNodes ? "default" : "outline"} 
          className="w-full flex items-center justify-center"
          onClick={() => setViewAllNodes(!viewAllNodes)}
        >
          <Layers className="h-4 w-4 mr-2" />
          {viewAllNodes ? "View Selected Node" : "View All Nodes"}
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <PropertiesPanel 
          selectedNode={selectedNode} 
          jsonData={jsonData} 
          viewAllNodes={viewAllNodes}
        />
      </ScrollArea>
    </ScrollArea>
  )
}