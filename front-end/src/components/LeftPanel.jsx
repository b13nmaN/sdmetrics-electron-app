// components/LeftPanel.jsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Code2, Network, Calculator } from "lucide-react"
import PropertiesPanel from "@/components/properties-panel"

export function LeftPanel({ 
  searchTerm, 
  setSearchTerm, 
  filter, 
  setFilter, 
  perspective, 
  setPerspective, 
  selectedNode,
  matrices,
  activeMatrixTab
}) {
  // Get unique node categories based on the active matrix
  const getNodeCategories = () => {
    const categories = new Set(["all"]);
    
    if (matrices && activeMatrixTab && matrices[activeMatrixTab]) {
      // Add categories based on node naming conventions in the active matrix
      const matrix = matrices[activeMatrixTab];
      const allNodes = [...matrix.columns, ...Object.keys(matrix.rows)];
      
      allNodes.forEach(nodeName => {
        if (nodeName.startsWith("I") && nodeName.length > 1 && nodeName[1].toUpperCase() === nodeName[1]) {
          categories.add("interface");
        } else if (nodeName.includes("Package") || nodeName.includes("Module")) {
          categories.add("package");
        } else {
          categories.add("class");
        }
      });
    }
    
    return Array.from(categories);
  };

  const nodeCategories = getNodeCategories();

  return (
    <div className="w-1/5 border-r bg-muted/20 flex flex-col">
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
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            {nodeCategories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 border-b">
        <h3 className="font-medium mb-2">Perspective</h3>
        <ToggleGroup
          type="single"
          value={perspective}
          onValueChange={setPerspective}
        >
          <ToggleGroupItem value="software-engineer" className="justify-start">
            <Code2 className="h-4 w-4 mr-2" />
            Software Engineer
          </ToggleGroupItem>
          <ToggleGroupItem value="computer-scientist" className="justify-start ">
            <Network className="h-4 w-4 mr-2" />
            Computer Scientist
          </ToggleGroupItem>
          <ToggleGroupItem value="mathematician" className="justify-start">
            <Calculator className="h-4 w-4 mr-2" />
            Mathematician
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="flex-1">
        <PropertiesPanel 
          selectedNode={selectedNode} 
          matrices={matrices}
          activeMatrixTab={activeMatrixTab}
        />
      </ScrollArea>
    </div>
  )
}