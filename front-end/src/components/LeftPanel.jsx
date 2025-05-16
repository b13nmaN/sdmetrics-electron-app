// components/LeftPanel.jsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Layers } from "lucide-react"
import PropertiesPanel from "@/components/properties-panel"
import { useState, useEffect, useCallback } from "react"

const findNodeDetailsInJson = (nodeId, jsonData) => {
  if (!jsonData || !nodeId) return null;

  const foundPackage = jsonData.packages?.find(pkg => pkg.name === nodeId);
  if (foundPackage) return { ...foundPackage, type: 'package' };

  for (const pkg of jsonData.packages || []) {
    const foundClass = pkg.classes?.find(cls => cls.name === nodeId);
    if (foundClass) return { ...foundClass, type: 'class', packageName: pkg.name };

    const foundInterface = pkg.interfaces?.find(intf => intf.name === nodeId);
    if (foundInterface) return { ...foundInterface, type: 'interface', packageName: pkg.name };
  }

  const foundParentClass = jsonData.parentClasses?.find(cls => cls.name === nodeId);
  if (foundParentClass) return { ...foundParentClass, type: 'parentClass' };

  const foundTopLevelInterface = jsonData.interfaces?.find(intf => intf.name === nodeId);
  if (foundTopLevelInterface) return { ...foundTopLevelInterface, type: 'topLevelInterface' };

  return null;
};


export function LeftPanel({ 
  searchTerm, 
  setSearchTerm, 
  selectedNode,
  setSelectedNode,
  jsonData,
  matrices, // Added matrices prop
  xmiContent
}) {
  const [viewAllNodes, setViewAllNodes] = useState(false);
  const [filteredNodes, setFilteredNodes] = useState([]);

  const searchNodesAndRelationships = useCallback((term, data, currentSelectedNodeId) => {
    if (!term || !data) return [];
    
    const lowerTerm = term.toLowerCase();
    const results = new Set();

    if (currentSelectedNodeId) {
      const nodeDetails = findNodeDetailsInJson(currentSelectedNodeId, data);
      if (nodeDetails) {
        if (nodeDetails.name.toLowerCase().includes(lowerTerm)) {
          results.add(nodeDetails.name);
        }

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
          nodeDetails.classes?.forEach(cls => {
            if (cls.name.toLowerCase().includes(lowerTerm)) results.add(cls.name);
          });
          nodeDetails.interfaces?.forEach(intf => {
            if (intf.name.toLowerCase().includes(lowerTerm)) results.add(intf.name);
          });
        }

        relatedEntitiesNames.forEach(relName => {
          if (typeof relName === 'string' && relName.toLowerCase().includes(lowerTerm)) {
            results.add(relName);
          }
        });
        return Array.from(results);
      } else {
        console.warn(`Details for selected node ${currentSelectedNodeId} not found. Performing global search as fallback.`);
      }
    }

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

    data.interfaces?.forEach(intf => { 
      if (intf.name.toLowerCase().includes(lowerTerm)) results.add(intf.name);
      (intf.parents || []).forEach(p => { if (p.toLowerCase().includes(lowerTerm)) { results.add(intf.name); results.add(p); }});
      (intf.realizedBy || []).forEach(r => { if (r.toLowerCase().includes(lowerTerm)) { results.add(intf.name); results.add(r); }});
    });

    return Array.from(results);
  }, []); 

  useEffect(() => {
    if (searchTerm && jsonData) {
      const results = searchNodesAndRelationships(searchTerm, jsonData, selectedNode?.id);
      setFilteredNodes(results);
      
      if (results.length === 1) {
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
    setSearchTerm(''); 
    setFilteredNodes([]); 
  };

  return (
    <ScrollArea className="w-1/4 border-r bg-white flex flex-col ">
      <div className="p-4 border-b">
        {/* Search input removed as per UI, can be re-added if needed */}
        {searchTerm && filteredNodes.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Search Results ({filteredNodes.length}):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
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
          matrices={matrices} // Pass matrices down
          viewAllNodes={viewAllNodes}
          xmiContent={xmiContent}
        />
      </ScrollArea>
    </ScrollArea>
  )
}