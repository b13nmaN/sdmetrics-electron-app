// components/LeftPanel.jsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Kept as per original imports
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Layers } from "lucide-react"
import PropertiesPanel from "@/components/properties-panel"
import { useState, useEffect, useCallback } from "react"

// Helper function to find details of a node (class, interface, or package) in jsonData
// Defined outside the component as it doesn't depend on component state/props other than jsonData argument
const findNodeDetailsInJson = (nodeId, jsonData) => {
  if (!jsonData || !nodeId) return null;

  // Check packages first (as entities if nodeId refers to a package name)
  const foundPackage = jsonData.packages?.find(pkg => pkg.name === nodeId);
  if (foundPackage) return { ...foundPackage, type: 'package' };

  // Then check entities within packages
  for (const pkg of jsonData.packages || []) {
    const foundClass = pkg.classes?.find(cls => cls.name === nodeId);
    if (foundClass) return { ...foundClass, type: 'class', packageName: pkg.name };

    const foundInterface = pkg.interfaces?.find(intf => intf.name === nodeId);
    if (foundInterface) return { ...foundInterface, type: 'interface', packageName: pkg.name };
  }

  // Check top-level parent classes (those not necessarily in a package, or as primary definition)
  // These might also be found within packages if their full definition resides there.
  // This ensures they are found even if only listed in `jsonData.parentClasses`.
  const foundParentClass = jsonData.parentClasses?.find(cls => cls.name === nodeId);
  if (foundParentClass) return { ...foundParentClass, type: 'parentClass' };

  // Check top-level interfaces
  const foundTopLevelInterface = jsonData.interfaces?.find(intf => intf.name === nodeId);
  if (foundTopLevelInterface) return { ...foundTopLevelInterface, type: 'topLevelInterface' };

  return null;
};


export function LeftPanel({ 
  searchTerm, 
  setSearchTerm, 
  // filter, // Not used in this component's logic
  // setFilter, // Not used in this component's logic
  selectedNode,
  setSelectedNode,
  jsonData,
}) {
  const [viewAllNodes, setViewAllNodes] = useState(false);
  const [filteredNodes, setFilteredNodes] = useState([]);

  // Memoized search function
  const searchNodesAndRelationships = useCallback((term, data, currentSelectedNodeId) => {
    if (!term || !data) return [];
    
    const lowerTerm = term.toLowerCase();
    const results = new Set();

    // --- FOCUSSED SEARCH if a node is selected ---
    if (currentSelectedNodeId) {
      const nodeDetails = findNodeDetailsInJson(currentSelectedNodeId, data);
      if (nodeDetails) {
        // 1. Check the selected node itself
        if (nodeDetails.name.toLowerCase().includes(lowerTerm)) {
          results.add(nodeDetails.name);
        }

        // 2. Check its direct relationships
        let relatedEntitiesNames = []; 
        if (nodeDetails.type === 'class' || nodeDetails.type === 'parentClass') {
          relatedEntitiesNames = [
            ...(nodeDetails.parents || []),
            ...(nodeDetails.children || []), 
            ...(nodeDetails.implements || []),
            ...(nodeDetails.associations || []),
            ...(nodeDetails.dependencies || [])
          ];
        } else if (nodeDetails.type === 'interface' || nodeDetails.type === 'topLevelInterface') {
          relatedEntitiesNames = [
            ...(nodeDetails.parents || []),
            ...(nodeDetails.realizedBy || [])
          ];
        } else if (nodeDetails.type === 'package') {
          // If a package is selected, search its direct children's names
          nodeDetails.classes?.forEach(cls => {
            if (cls.name.toLowerCase().includes(lowerTerm)) results.add(cls.name);
          });
          nodeDetails.interfaces?.forEach(intf => {
            if (intf.name.toLowerCase().includes(lowerTerm)) results.add(intf.name);
          });
          // For packages, `relatedEntitiesNames` remains empty as children are handled directly.
        }

        relatedEntitiesNames.forEach(relName => {
          // Assuming relationship arrays store string names
          if (typeof relName === 'string' && relName.toLowerCase().includes(lowerTerm)) {
            results.add(relName);
          }
        });
        return Array.from(results); // Return early for focused search
      } else {
        console.warn(`Details for selected node ${currentSelectedNodeId} not found. Performing global search as fallback.`);
        // Fall through to global search if nodeDetails not found
      }
    }

    // --- GLOBAL SEARCH (if no node selected, or selected node details not found for focused search) ---
    data.packages?.forEach(pkg => {
      if (pkg.name.toLowerCase().includes(lowerTerm)) results.add(pkg.name);

      pkg.classes?.forEach(cls => {
        if (cls.name.toLowerCase().includes(lowerTerm)) results.add(cls.name);
        (cls.parents || []).forEach(p => { if (p.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(p); }});
        (cls.implements || []).forEach(i => { if (i.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(i); }});
        (cls.associations || []).forEach(a => { if (typeof a === 'string' && a.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(a); }});
        (cls.dependencies || []).forEach(d => { if (typeof d === 'string' && d.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(d); }});
      });

      pkg.interfaces?.forEach(intf => {
        if (intf.name.toLowerCase().includes(lowerTerm)) results.add(intf.name);
        (intf.parents || []).forEach(p => { if (p.toLowerCase().includes(lowerTerm)) { results.add(intf.name); results.add(p); }});
        (intf.realizedBy || []).forEach(r => { if (r.toLowerCase().includes(lowerTerm)) { results.add(intf.name); results.add(r); }});
      });
    });

    data.parentClasses?.forEach(cls => {
      if (cls.name.toLowerCase().includes(lowerTerm)) results.add(cls.name);
      (cls.children || []).forEach(c => { if (c.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(c); }});
      (cls.parents || []).forEach(p => { if (p.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(p); }});
      (cls.implements || []).forEach(i => { if (i.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(i); }});
      (cls.associations || []).forEach(a => { if (typeof a === 'string' && a.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(a); }});
      (cls.dependencies || []).forEach(d => { if (typeof d === 'string' && d.toLowerCase().includes(lowerTerm)) { results.add(cls.name); results.add(d); }});
    });

    data.interfaces?.forEach(intf => { // Top-level interfaces
      if (intf.name.toLowerCase().includes(lowerTerm)) results.add(intf.name);
      (intf.parents || []).forEach(p => { if (p.toLowerCase().includes(lowerTerm)) { results.add(intf.name); results.add(p); }});
      (intf.realizedBy || []).forEach(r => { if (r.toLowerCase().includes(lowerTerm)) { results.add(intf.name); results.add(r); }});
    });

    return Array.from(results);
  }, []); // useCallback dependency array is empty as the function's definition doesn't close over component state/props that aren't arguments.

  useEffect(() => {
    if (searchTerm && jsonData) {
      const results = searchNodesAndRelationships(searchTerm, jsonData, selectedNode?.id);
      setFilteredNodes(results);
      
      if (results.length === 1) {
        // If the single result is not the already selected node, then update selectedNode.
        // This avoids clearing the search term if the user searches for the currently selected node
        // and it's the only result.
        if (results[0] !== selectedNode?.id) {
          setSelectedNode({ id: results[0] });
        }
      }
    } else {
      setFilteredNodes([]);
    }
  }, [searchTerm, jsonData, selectedNode, setSelectedNode, searchNodesAndRelationships]);

  const handleNodeSelect = (nodeId) => {
    setSelectedNode({ id: nodeId });
    setSearchTerm(''); // Clear search term to show the full properties panel
    setFilteredNodes([]); // Clear search results
  };

  return (
    <ScrollArea className="w-1/4 border-r bg-white flex flex-col">
      <div className="p-4 border-b">
        {/* <div className="flex items-center space-x-2 mb-4">
          <Input
            placeholder="Search nodes or relationships..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button size="icon" variant="ghost" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        </div> */}
        
        {searchTerm && filteredNodes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Search Results ({filteredNodes.length}):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto"> {/* Increased max-h slightly */}
              {filteredNodes.map(nodeId => (
                <Button
                  key={nodeId}
                  variant={selectedNode?.id === nodeId ? "secondary" : "outline"}
                  className="w-full text-left justify-start"
                  onClick={() => handleNodeSelect(nodeId)}
                >
                  {nodeId}
                </Button>
              ))}
            </div>
          </div>
        )}
        {searchTerm && filteredNodes.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">No results found for "{searchTerm}".</p>
        )}

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