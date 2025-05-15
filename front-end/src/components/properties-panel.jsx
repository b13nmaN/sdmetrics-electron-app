// components/properties_panel.jsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Edit, FileText, Link2, Save } from "lucide-react";
import { useEffect, useState } from "react";

// Normalize Dep_Out to [0, 1] with a max value of 10
const normalizeDepOut = (depOut) => {
  if (depOut === undefined || depOut === null || isNaN(depOut)) return 0;
  const maxDepOut = 10; // Assumed max value for normalization
  return Math.max(0, Math.min(1, depOut / maxDepOut));
};

// Helper to get styling for metric badges
const getMetricBadgeStyle = (metricName, value) => {
  let style = { label: "", className: "bg-gray-100 text-gray-700" };

  if (metricName.toLowerCase() === "camc") {
    if (value >= 0.75) style = { label: "High", className: "bg-green-100 text-green-700" };
    else if (value >= 0.5) style = { label: "Moderate", className: "bg-yellow-100 text-yellow-700" }; 
    else if (value >= 0.25) style = { label: "Low", className: "bg-orange-100 text-orange-700" };
    else style = { label: "Very Low", className: "bg-red-100 text-red-700" };
  } else if (metricName.toLowerCase() === "dep_out" || metricName.toLowerCase() === "dep-out") {
    const normalizedValue = normalizeDepOut(value);
    if (normalizedValue <= 0.1) style = { label: "Good", className: "bg-green-100 text-green-700" }; 
    else if (normalizedValue <= 0.3) style = { label: "Okay", className: "bg-yellow-100 text-yellow-700" };
    else if (normalizedValue <= 0.5) style = { label: "Moderate", className: "bg-orange-100 text-orange-700" };
    else style = { label: "High", className: "bg-red-100 text-red-700" };
  }
  return style;
};

const useNodeDetails = (nodeId, jsonData) => {
  const [nodeDetails, setNodeDetails] = useState(null);

  useEffect(() => {
    if (!nodeId || !jsonData) {
      setNodeDetails(null);
      return;
    }

    const getNodeDetails = () => {
      let details = {
        id: nodeId,
        label: nodeId,
        category: '',
        package: '',
        metrics: {},
        attributes: [],
        methods: [],
        isAbstract: false,
        parents: [],
        children: [],
        implements: [],
        realizedBy: [],
        associations: [],
        dependencies: [],
        notes: '',  // Added notes field
      };

      let foundNodeInfo = null;
      let nodePackageName = '';
      let nodeCategory = '';

      for (const pkg of jsonData.packages || []) {
        const classInfo = pkg.classes?.find(c => c.name === nodeId);
        if (classInfo) {
          foundNodeInfo = classInfo;
          nodePackageName = pkg.name;
          nodeCategory = 'Class';
          break;
        }
        const interfaceInfo = pkg.interfaces?.find(i => i.name === nodeId);
        if (interfaceInfo) {
          foundNodeInfo = interfaceInfo;
          nodePackageName = pkg.name;
          nodeCategory = 'Interface';
          break;
        }
      }

      if (!foundNodeInfo) {
        const parentClassDef = jsonData.parentClasses?.find(p => p.name === nodeId);
        if (parentClassDef) {
          foundNodeInfo = { ...parentClassDef, metrics: parentClassDef.metrics || {} };
          nodePackageName = parentClassDef.package || 'Unknown';
          nodeCategory = 'Class';
        }
      }
      
      if (!foundNodeInfo) {
        const topLevelInterface = jsonData.interfaces?.find(i => i.name === nodeId);
        if (topLevelInterface) {
          foundNodeInfo = topLevelInterface;
          nodePackageName = topLevelInterface.package || 'Unknown';
          nodeCategory = 'Interface';
        }
      }

      if (foundNodeInfo) {
        details.metrics = foundNodeInfo.metrics || {};
        details.attributes = foundNodeInfo.attributes || [];
        details.methods = foundNodeInfo.methods || [];
        details.isAbstract = foundNodeInfo.isAbstract || false;
        if (nodeCategory === 'Interface') details.isAbstract = true;

        // Extract relationships data
        if (nodeCategory === 'Class') {
          if (foundNodeInfo.parents) details.parents.push(...foundNodeInfo.parents);
          if (foundNodeInfo.implements) details.implements.push(...foundNodeInfo.implements);
          if (foundNodeInfo.associations) details.associations.push(...foundNodeInfo.associations);
          if (foundNodeInfo.dependencies) details.dependencies.push(...foundNodeInfo.dependencies);
          
          const parentEntryForChildren = jsonData.parentClasses?.find(p => p.name === nodeId);
          if (parentEntryForChildren?.children) {
            details.children.push(...parentEntryForChildren.children);
          }
        } else if (nodeCategory === 'Interface') {
          if (foundNodeInfo.realizedBy) details.realizedBy.push(...foundNodeInfo.realizedBy);
          if (foundNodeInfo.parents) details.parents.push(...foundNodeInfo.parents);
          if (foundNodeInfo.associations) details.associations.push(...foundNodeInfo.associations);
          if (foundNodeInfo.dependencies) details.dependencies.push(...foundNodeInfo.dependencies);
        }

        // Get notes if available
        details.notes = foundNodeInfo.notes || '';
      } else {
        const pkgData = jsonData.packages?.find(p => p.name === nodeId);
        if (pkgData) {
          nodeCategory = 'Package';
          nodePackageName = nodeId;
          details.metrics = pkgData.metrics || {};
          
          // Get package relationships
          if (pkgData.classes) details.children.push(...pkgData.classes.map(c => c.name));
          if (pkgData.interfaces) details.children.push(...pkgData.interfaces.map(i => i.name));
          if (pkgData.dependencies) details.dependencies.push(...pkgData.dependencies);
          
          // Get notes if available
          details.notes = pkgData.notes || '';
        } else {
          nodeCategory = 'Unknown';
          nodePackageName = 'Unknown';
        }
      }
      
      details.package = nodePackageName;
      details.category = nodeCategory;

      return details;
    };

    setNodeDetails(getNodeDetails());
  }, [nodeId, jsonData]);

  return nodeDetails;
};

// Get all nodes from the jsonData
const getAllNodes = (jsonData) => {
  if (!jsonData) return [];
  
  const nodes = [];
  
  // Extract package nodes
  if (jsonData.packages) {
    jsonData.packages.forEach(pkg => {
      nodes.push({
        id: pkg.name,
        label: pkg.name,
        category: 'Package',
        package: pkg.name,
      });
      
      // Extract class nodes
      if (pkg.classes) {
        pkg.classes.forEach(cls => {
          nodes.push({
            id: cls.name,
            label: cls.name,
            category: 'Class',
            package: pkg.name,
            isAbstract: cls.isAbstract || false,
          });
        });
      }
      
      // Extract interface nodes
      if (pkg.interfaces) {
        pkg.interfaces.forEach(intf => {
          nodes.push({
            id: intf.name,
            label: intf.name,
            category: 'Interface',
            package: pkg.name,
            isAbstract: true,
          });
        });
      }
    });
  }
  
  return nodes;
};

export default function PropertiesPanel({ selectedNode, jsonData, viewAllNodes = false }) {
  const nodeDetails = useNodeDetails(selectedNode?.id, jsonData);
  const [nodesMetricsVisibility, setNodesMetricsVisibility] = useState({});
  const [allNodes, setAllNodes] = useState([]);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  
  // Helper function to toggle metrics visibility for a specific node
  const toggleMetricsVisibility = (nodeId) => {
    setNodesMetricsVisibility(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Get visibility state for current node
  const showMetricsForCurrentNode = nodesMetricsVisibility[selectedNode?.id] || false;

  // Load all nodes when viewing all nodes mode is active
  useEffect(() => {
    if (viewAllNodes) {
      setAllNodes(getAllNodes(jsonData));
    } else {
      setAllNodes([]);
    }
  }, [viewAllNodes, jsonData]);

  // Update notes content when node details change
  useEffect(() => {
    if (nodeDetails?.notes) {
      setNotesContent(nodeDetails.notes);
    } else {
      setNotesContent('');
    }
  }, [nodeDetails]);

  if (viewAllNodes) {
    // Render all nodes view
    return (
      <ScrollArea className="h-full">
        <div className="p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">All Nodes ({allNodes.length})</h2>
          
          <div className="space-y-6">
            {allNodes.map(node => (
              <div key={node.id} className="border rounded-lg p-4 bg-white ">
                <div className="flex justify-between items-start mb-3 overflow-y-auto" >
                  <div>
                    <h3 className="text-lg font-bold">{node.label}</h3>
                    <p className="text-gray-500 capitalize">{node.category.toLowerCase()}</p>
                  </div>
                  {node.package && (
                    <Badge className="bg-white text-black border border-gray-200 font-medium">
                      {node.package}
                    </Badge>
                  )}
                </div>
                
                {/* We'd show the node details here - simplified for brevity */}
                <div className="flex items-center space-x-2 text-gray-600 mt-2">
                  <Link2 className="h-4 w-4" />
                  <span className="text-sm">View details and relationships</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }

  if (!selectedNode || !selectedNode.id) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <p className="text-muted-foreground text-center">Select a node to view its properties</p>
      </div>
    );
  }

  if (!nodeDetails) {
    return (
      <div className="p-4 h-full flex items-center justify-center">
        <p className="text-muted-foreground text-center">Loading node details...</p>
      </div>
    );
  }

  //- Determine node type for metric display
  const isSpecialNode = nodeDetails.category === 'Package' || nodeDetails.isAbstract || nodeDetails.category === 'Interface';

  //- Define primary and additional metrics
  const allMetrics = Object.entries(nodeDetails.metrics || {})
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key]) => ({
      key,
      displayName: key.replace(/_/g, '-') // Convert Dep_Out to Dep-out
    }));

  let primaryMetrics = [];
  let additionalMetrics = [];

  if (!isSpecialNode) {
    //- Non-package, non-abstract, non-interface: show Dep_Out and CAMC
    primaryMetrics = allMetrics.filter(m => ['Dep_Out', 'CAMC'].includes(m.key));
    additionalMetrics = allMetrics.filter(m => !['Dep_Out', 'CAMC'].includes(m.key));
  } else {
    //- Packages, abstract classes, interfaces: show first two metrics by default
    primaryMetrics = allMetrics.slice(0, 2);
    additionalMetrics = allMetrics.slice(2);
  }

  //- Generate recommendations based on node metrics and properties
  const generateRecommendations = () => {
    const recommendations = [];
    
    if (nodeDetails.metrics.CAMC !== undefined && nodeDetails.metrics.CAMC < 0.7) {
      recommendations.push({
        type: "Cohesion",
        text: `CAMC is low (${nodeDetails.metrics.CAMC.toFixed(2)}). Consider splitting this class to improve cohesion.`,
        icon: <AlertCircle className="h-5 w-5 text-gray-600" />
      });
    }
    
    if (nodeDetails.metrics.Dep_Out !== undefined && nodeDetails.metrics.Dep_Out > 5) {
      recommendations.push({
        type: "Coupling",
        text: `High dependency out (${nodeDetails.metrics.Dep_Out}). Consider reducing dependencies on this class.`,
        icon: <AlertCircle className="h-5 w-5 text-gray-600" />
      });
    }
    
    if (nodeDetails.isAbstract && nodeDetails.methods?.length === 0) {
      recommendations.push({
        type: "Design",
        text: "Abstract class/interface with no methods. Consider adding abstract methods or converting to concrete class.",
        icon: <AlertCircle className="h-5 w-5 text-gray-600" />
      });
    }
    
    return recommendations;
  };

  const recommendations = generateRecommendations();

  // Handle any type of relationship display
  const hasRelationships = nodeDetails.parents?.length > 0 || 
                          nodeDetails.children?.length > 0 || 
                          nodeDetails.implements?.length > 0 || 
                          nodeDetails.realizedBy?.length > 0 ||
                          nodeDetails.associations?.length > 0 ||
                          nodeDetails.dependencies?.length > 0;

  return (
    <>
      <div className="p-6 pb-24 bg-white rounded-lg"> {/* Added pb-24 to ensure spacing for status bar */}
        {/* Header section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-black">{nodeDetails.label}</h2>
            <p className="text-gray-500 capitalize">
              {nodeDetails.category.toLowerCase()}
            </p>
          </div>
          {nodeDetails.package && (
            <Badge className="bg-white text-black border border-gray-200 font-medium">
              {nodeDetails.package}
            </Badge>
          )}
        </div>

        {/* Metrics section */}
        {(primaryMetrics.length > 0 || (showMetricsForCurrentNode && additionalMetrics.length > 0)) && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Metrics</h3>
            <div className="grid grid-cols-2 gap-3">
              {primaryMetrics.map(metricInfo => {
                const metricValue = metricInfo.key === 'Dep_Out' 
                  ? normalizeDepOut(nodeDetails.metrics[metricInfo.key])
                  : nodeDetails.metrics[metricInfo.key];
                const badgeStyle = getMetricBadgeStyle(metricInfo.key, nodeDetails.metrics[metricInfo.key]);
                return (
                  <div key={metricInfo.key} className="p-3 border rounded-lg bg-white">
                    <p className="text-sm text-gray-500">{metricInfo.displayName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-lg font-medium text-black">
                        {typeof metricValue === 'number' ? metricValue.toFixed(2) : String(metricValue)}
                      </p>
                      {badgeStyle.label && (
                        <Badge className={`px-2 py-1 text-sm ${badgeStyle.className}`}>
                          {badgeStyle.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {showMetricsForCurrentNode && additionalMetrics.map(metricInfo => {
                const metricValue = metricInfo.key === 'Dep_Out' 
                  ? normalizeDepOut(nodeDetails.metrics[metricInfo.key])
                  : nodeDetails.metrics[metricInfo.key];
                const badgeStyle = getMetricBadgeStyle(metricInfo.key, nodeDetails.metrics[metricInfo.key]);
                return (
                  <div key={metricInfo.key} className="p-3 border rounded-lg bg-white">
                    <p className="text-sm text-gray-500">{metricInfo.displayName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-lg font-medium text-black">
                        {typeof metricValue === 'number' ? metricValue.toFixed(2) : String(metricValue)}
                      </p>
                      {badgeStyle.label && (
                        <Badge className={`px-2 py-1 text-sm ${badgeStyle.className}`}>
                          {badgeStyle.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {additionalMetrics.length > 0 && (
              <Button
                variant="link"
                className="mt-3 text-gray-600 hover:text-gray-900"
                onClick={() => toggleMetricsVisibility(selectedNode.id)}
              >
                {showMetricsForCurrentNode ? 'Hide Additional Metrics' : 'Show All Metrics'}
              </Button>
            )}
          </div>
        )}

        {/* Relationships section */}
        {/* Recommendations section */}
        {recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Recommendations</h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start">
                    <div className="mr-3 flex-shrink-0 pt-0.5">{rec.icon}</div>
                    <div>
                      <p className="font-medium text-black">{rec.type}</p>
                      <p className="text-gray-700">{rec.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refactor button */}
        <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
          <span className="mr-2">→</span> Refactor
        </Button>
      </div>
    </>
  );
}