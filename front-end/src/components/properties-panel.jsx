// src/components/PropertiesPanel.jsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Keep if you plan to use notes editing
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Edit, FileText, Link2, Save, Brain, X } from "lucide-react"; // Keep Edit, Save, FileText if notes feature is planned
import { useEffect, useState } from "react";
import { getDirectLLMDesignRecommendations } from "@/services/llm-recommendations";
import ReactMarkdown from 'react-markdown';

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

const useNodeDetails = (nodeId, jsonData, matrices) => {
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
        notes: '',
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
        details.metrics = { ...(foundNodeInfo.metrics || {}) };
        details.attributes = foundNodeInfo.attributes || [];
        details.methods = foundNodeInfo.methods || [];
        details.isAbstract = foundNodeInfo.isAbstract || false;
        if (nodeCategory === 'Interface') details.isAbstract = true;

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
        details.notes = foundNodeInfo.notes || '';
      } else {
        const pkgData = jsonData.packages?.find(p => p.name === nodeId);
        if (pkgData) {
          nodeCategory = 'Package';
          nodePackageName = nodeId;
          details.metrics = { ...(pkgData.metrics || {}) };
          if (pkgData.classes) details.children.push(...pkgData.classes.map(c => c.name));
          if (pkgData.interfaces) details.children.push(...pkgData.interfaces.map(i => i.name));
          if (pkgData.dependencies) details.dependencies.push(...pkgData.dependencies);
          details.notes = pkgData.notes || '';
        } else {
          nodeCategory = 'Unknown';
          nodePackageName = 'Unknown';
        }
      }
      
      details.package = nodePackageName;
      details.category = nodeCategory;

      let depOutToDisplay;
      const depOutFromMetricsRaw = details.metrics.Dep_Out;
      let depOutFromMetricsValue;

      if (depOutFromMetricsRaw !== undefined && depOutFromMetricsRaw !== null) {
        const numVal = Number(depOutFromMetricsRaw);
        if (!isNaN(numVal)) {
          depOutFromMetricsValue = numVal;
        }
      }

      let calculatedDepCountFromMatrix = 0;
      let canCalculateFromMatrix = false;

      if (details.category === 'Class' && nodeId && matrices?.Class_Dependencies) {
        const { rows, columns } = matrices.Class_Dependencies;
        if (rows && rows[nodeId] && columns) {
          canCalculateFromMatrix = true;
          const dependencyArray = rows[nodeId];
          if (Array.isArray(dependencyArray)) {
            dependencyArray.forEach((value, colIndex) => {
              if (value > 1) {
                const targetClass = columns[colIndex];
                if (targetClass && nodeId !== targetClass) {
                  calculatedDepCountFromMatrix++;
                }
              }
            });
          }
        }
      }

      if (depOutFromMetricsValue === 0) {
        if (details.category === 'Class' && canCalculateFromMatrix) {
            depOutToDisplay = calculatedDepCountFromMatrix;
        } else {
            depOutToDisplay = 0;
        }
      } else if (depOutFromMetricsValue !== undefined && depOutFromMetricsValue !== null) {
        depOutToDisplay = depOutFromMetricsValue;
      } else {
        if (details.category === 'Class' && canCalculateFromMatrix) {
          depOutToDisplay = calculatedDepCountFromMatrix;
        } else {
          depOutToDisplay = 0;
        }
      }
      
      details.metrics.Dep_Out = depOutToDisplay;
      return details;
    };

    setNodeDetails(getNodeDetails());
  }, [nodeId, jsonData, matrices]);

  return nodeDetails;
};

// Get all nodes from the jsonData
const getAllNodes = (jsonData) => {
  if (!jsonData) return [];
  const nodes = [];
  if (jsonData.packages) {
    jsonData.packages.forEach(pkg => {
      nodes.push({ id: pkg.name, label: pkg.name, category: 'Package', package: pkg.name });
      if (pkg.classes) {
        pkg.classes.forEach(cls => {
          nodes.push({ id: cls.name, label: cls.name, category: 'Class', package: pkg.name, isAbstract: cls.isAbstract || false });
        });
      }
      if (pkg.interfaces) {
        pkg.interfaces.forEach(intf => {
          nodes.push({ id: intf.name, label: intf.name, category: 'Interface', package: pkg.name, isAbstract: true });
        });
      }
    });
  }
  return nodes;
};

// Helper function to build a focused context string for the LLM
const buildFocusedContextForLLM = (nodeDetails, jsonData) => {
  if (!nodeDetails) return "Selected node details are not available.";
  if (!jsonData) return "Overall system data (jsonData) is not available.";

  let context = `Context for Analysis of Element: "${nodeDetails.label}"\n`;
  context += `Type: ${nodeDetails.category}\n`;
  context += `Package: ${nodeDetails.package || 'N/A'}\n`;
  if (nodeDetails.isAbstract) context += "This element is ABSTRACT.\n";

  context += "\nMetrics:\n";
  if (nodeDetails.metrics && Object.keys(nodeDetails.metrics).length > 0) {
    for (const [key, value] of Object.entries(nodeDetails.metrics)) {
      context += `  - ${key}: ${typeof value === 'number' ? value.toFixed(2) : String(value)}\n`;
    }
  } else {
    context += "  - No specific metrics available for this element.\n";
  }

  if (nodeDetails.attributes && nodeDetails.attributes.length > 0) {
    context += "\nAttributes (showing up to 10):\n";
    nodeDetails.attributes.slice(0, 10).forEach(attr => {
        context += `  - ${typeof attr === 'string' ? attr : (attr.name + (attr.type ? `: ${attr.type}` : ''))}\n`;
    });
    if (nodeDetails.attributes.length > 10) context += `  ... (and ${nodeDetails.attributes.length - 10} more attributes)\n`;
  }

  if (nodeDetails.methods && nodeDetails.methods.length > 0) {
    context += "\nMethods (showing up to 10 names):\n";
    nodeDetails.methods.slice(0, 10).forEach(method => {
        context += `  - ${typeof method === 'string' ? method : (method.name + '()')}\n`;
    });
    if (nodeDetails.methods.length > 10) context += `  ... (and ${nodeDetails.methods.length - 10} more methods)\n`;
  }
  
  context += "\nKey Relationships:\n";
  if (nodeDetails.parents && nodeDetails.parents.length > 0) context += `  - Inherits from/Extends: ${nodeDetails.parents.join(', ')}\n`;
  if (nodeDetails.implements && nodeDetails.implements.length > 0) context += `  - Implements: ${nodeDetails.implements.join(', ')}\n`;
  
  if (nodeDetails.category === 'Package' && nodeDetails.children && nodeDetails.children.length > 0) {
    context += `  - Contains Elements (up to 15): ${nodeDetails.children.slice(0,15).join(', ')}\n`;
    if (nodeDetails.children.length > 15) context += `  ... (and ${nodeDetails.children.length - 15} more elements)\n`;
  } else if (nodeDetails.category !== 'Package' && nodeDetails.children && nodeDetails.children.length > 0) {
    context += `  - Parent of (Subclasses/Sub-interfaces - up to 10): ${nodeDetails.children.slice(0,10).join(', ')}\n`;
    if (nodeDetails.children.length > 10) context += `  ... (and ${nodeDetails.children.length - 10} more children)\n`;
  }
  
  if (nodeDetails.realizedBy && nodeDetails.realizedBy.length > 0) context += `  - Realized by (Classes implementing this interface - up to 10): ${nodeDetails.realizedBy.slice(0,10).join(', ')}\n`;

  const allConnections = [];
  (nodeDetails.associations || []).forEach(assoc => {
      const target = assoc.target || assoc.source;
      if(target) allConnections.push(`${target} (Association${assoc.direction ? ', '+assoc.direction : ''})`);
  });
  (nodeDetails.dependencies || []).forEach(dep => {
      const target = dep.target || dep.source;
      if(target) allConnections.push(`${target} (Dependency${dep.direction ? ', '+dep.direction : ''}${dep.weight && dep.weight > 1 ? ', weight: '+dep.weight : ''})`);
  });

  if (allConnections.length > 0) {
    context += `\nDirect Connections (Associations/Dependencies - up to 15):\n`;
    allConnections.slice(0, 15).forEach(conn => context += `  - ${conn}\n`);
    if (allConnections.length > 15) context += `  ... (and ${allConnections.length - 15} more connections)\n`;
  }

  const relatedElementNames = new Set();
  if (nodeDetails.parents) nodeDetails.parents.forEach(p => relatedElementNames.add(p));
  if (nodeDetails.children && nodeDetails.category !== 'Package') nodeDetails.children.forEach(c => relatedElementNames.add(c));
  if (nodeDetails.implements) nodeDetails.implements.forEach(i => relatedElementNames.add(i));
  if (nodeDetails.realizedBy) nodeDetails.realizedBy.forEach(r => relatedElementNames.add(r));
  allConnections.forEach(conn => {
      const nameMatch = conn.match(/^([^\s(]+)/);
      if (nameMatch) relatedElementNames.add(nameMatch[1]);
  });
  relatedElementNames.delete(nodeDetails.label);

  if (relatedElementNames.size > 0) {
    context += "\nBrief on Directly Related Elements (Name - Type - up to 10):\n";
    let count = 0;
    for (const elementName of relatedElementNames) {
        if (count++ >= 10) { context += "  ... (and more related elements)\n"; break; }
        let relatedNodeCat = "Unknown";
        jsonData.packages?.forEach(pkg => {
            if (pkg.classes?.find(c => c.name === elementName)) relatedNodeCat = "Class";
            else if (pkg.interfaces?.find(i => i.name === elementName)) relatedNodeCat = "Interface";
            else if (pkg.name === elementName) relatedNodeCat = "Package";
        });
        if (relatedNodeCat === "Unknown" && jsonData.parentClasses?.find(p => p.name === elementName)) relatedNodeCat = "Class";
        else if (relatedNodeCat === "Unknown" && jsonData.interfaces?.find(i => i.name === elementName)) relatedNodeCat = "Interface";
        context += `  - ${elementName} (${relatedNodeCat})\n`;
    }
  }

  if (jsonData && jsonData.packages) {
    context += "\nOverall System Package Structure (brief):\n";
    if (jsonData.packages.length > 10) {
        context += `  - Total ${jsonData.packages.length} packages. Examples: ${jsonData.packages.slice(0,5).map(p=>p.name).join(', ')}...\n`;
    } else {
        jsonData.packages.forEach(pkg => {
            context += `  - Package: ${pkg.name} (contains ~${pkg.classes?.length || 0} classes, ~${pkg.interfaces?.length || 0} interfaces)\n`;
        });
    }
  }
  
  const MAX_CONTEXT_CHARS = 18000;
  if (context.length > MAX_CONTEXT_CHARS) {
    console.warn("Focused context was truncated due to excessive length. Original length:", context.length);
    context = context.substring(0, MAX_CONTEXT_CHARS) + "\n\n... (Context above was truncated due to length to fit token limits)";
  }
  return context;
};


export default function PropertiesPanel({ selectedNode, jsonData, matrices, viewAllNodes = false, xmiContent }) { // xmiContent is not directly used for LLM now, but might be useful for other features
  const nodeDetails = useNodeDetails(selectedNode?.id, jsonData, matrices);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [allNodes, setAllNodes] = useState([]);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [llmRecommendations, setLlmRecommendations] = useState("");
  const [isLoadingLLM, setIsLoadingLLM] = useState(false);
  const [llmError, setLlmError] = useState(null);


  useEffect(() => {
    if (viewAllNodes) {
      setAllNodes(getAllNodes(jsonData));
    } else {
      setAllNodes([]);
    }
  }, [viewAllNodes, jsonData]);

  const handleViewAIRecommendations = async () => {
    if (!nodeDetails || !nodeDetails.id || !jsonData) {
      setLlmError("Selected node details or overall system data is not available to generate focused context for AI.");
      setShowLLMModal(true);
      return;
    }
    if (!import.meta.env.VITE_TOGETHER_API_KEY) {
        setLlmError("VITE_TOGETHER_API_KEY is not configured. Cannot call LLM API. Please check your .env.local file and restart the development server.");
        setShowLLMModal(true);
        return;
    }

    setIsLoadingLLM(true);
    setLlmError(null);
    setLlmRecommendations("");
    setShowLLMModal(true);

    const focusedContext = buildFocusedContextForLLM(nodeDetails, jsonData);
    console.log("Focused context for LLM (approx length):", focusedContext.length);
    // For more detailed debugging if needed: console.log("Full Focused Context:\n", focusedContext);

    const violationsForLLM = [];
    const metrics = nodeDetails.metrics || {};
    // CAMC Threshold: lower is worse, so < 0.7 is a violation
    if (metrics.CAMC !== undefined && metrics.CAMC !== null && !isNaN(parseFloat(metrics.CAMC)) && parseFloat(metrics.CAMC) < 0.7) {
      violationsForLLM.push({ ElementName: nodeDetails.label, ViolatedMetric: "CAMC", MetricValue: parseFloat(metrics.CAMC).toFixed(6), Threshold: 0.7 });
    }
    // Dep_Out Threshold: higher is worse, so > 5 is a violation
    if (metrics.Dep_Out !== undefined && metrics.Dep_Out !== null && !isNaN(parseInt(metrics.Dep_Out)) && parseInt(metrics.Dep_Out) > 5) {
      violationsForLLM.push({ ElementName: nodeDetails.label, ViolatedMetric: "Dep_Out", MetricValue: parseInt(metrics.Dep_Out), Threshold: 5 });
    }

    try {
      const recommendationsText = await getDirectLLMDesignRecommendations(focusedContext, violationsForLLM, nodeDetails.label);
      setLlmRecommendations(recommendationsText);
    } catch (error) {
      console.error("Failed to get LLM recommendations:", error);
      setLlmError(error.message || "Failed to fetch recommendations. Check console for details.");
    } finally {
      setIsLoadingLLM(false);
    }
  };

  if (viewAllNodes) {
    return (
      <ScrollArea className="h-full">
        <div className="p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">All Nodes ({allNodes.length})</h2>
          <div className="space-y-4">
            {allNodes.map(node => (
              <div key={node.id} className="border rounded-lg p-3 bg-white">
                <div className="flex flex-wrap justify-between items-start mb-2">
                  <div className="min-w-0 flex-grow">
                    <h3 className="text-lg font-bold truncate">{node.label}</h3>
                    <p className="text-gray-500 capitalize text-sm">{node.category.toLowerCase()}</p>
                  </div>
                  {node.package && (
                    <Badge className="bg-white text-black border border-gray-200 font-medium ml-2 mt-1">
                      {node.package}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-gray-600 mt-2">
                  <Link2 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">View details and relationships</span>
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

  const isSpecialNode = nodeDetails.category === 'Package' || nodeDetails.isAbstract || nodeDetails.category === 'Interface';

  const allMetrics = Object.entries(nodeDetails.metrics || {})
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key]) => ({
      key,
      displayName: key.replace(/_/g, '-')
    }));

  let primaryMetrics = [];
  let additionalMetrics = [];

  if (!isSpecialNode) {
    primaryMetrics = allMetrics.filter(m => ['Dep_Out', 'CAMC'].includes(m.key));
    additionalMetrics = allMetrics.filter(m => !['Dep_Out', 'CAMC'].includes(m.key));
  } else {
    primaryMetrics = allMetrics.slice(0, 2);
    additionalMetrics = allMetrics.slice(2);
  }

  const generateLocalRecommendations = () => {
    const recommendations = [];
    const metrics = nodeDetails.metrics || {};
    
    if (metrics.CAMC !== undefined && metrics.CAMC < 0.7) {
      recommendations.push({
        type: "Cohesion",
        text: `CAMC is low (${metrics.CAMC.toFixed(2)}). Consider splitting this class to improve cohesion.`,
        icon: <AlertCircle className="h-5 w-5 text-gray-600" />
      });
    }
    
    if (metrics.Dep_Out !== undefined && metrics.Dep_Out > 5) {
      recommendations.push({
        type: "Coupling",
        text: `High dependency out (${metrics.Dep_Out}). Consider reducing dependencies on this class.`,
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

  const localRecommendations = generateLocalRecommendations();


  return (
    <ScrollArea className="h-full">
      <div className="p-4 pb-16 bg-white min-w-0">
        <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
          <div className="min-w-0 flex-grow">
            <h2 className="text-xl font-bold text-black truncate">{nodeDetails.label}</h2>
            <p className="text-gray-500 capitalize text-sm">
              {nodeDetails.category.toLowerCase()}
            </p>
          </div>
          {nodeDetails.package && (
            <Badge className="bg-white text-black border border-gray-200 font-medium flex-shrink-0">
              {nodeDetails.package}
            </Badge>
          )}
        </div>

        {(primaryMetrics.length > 0 || (showAllMetrics && additionalMetrics.length > 0)) && (
          <div className="mb-4">
            <h3 className="text-base font-medium mb-2">Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {primaryMetrics.map(metricInfo => {
                const metricValue = nodeDetails.metrics[metricInfo.key];
                const badgeStyle = getMetricBadgeStyle(metricInfo.key, metricValue);
                return (
                  <div key={metricInfo.key} className="p-2 border rounded-lg bg-white">
                    <p className="text-sm text-gray-500">{metricInfo.displayName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-base font-medium text-black">
                        {typeof metricValue === 'number' ? metricValue.toFixed(2) : String(metricValue)}
                      </p>
                      {badgeStyle.label && (
                        <Badge className={`px-2 py-0.5 text-xs ${badgeStyle.className}`}>
                          {badgeStyle.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {showAllMetrics && additionalMetrics.map(metricInfo => {
                const metricValue = nodeDetails.metrics[metricInfo.key];
                const badgeStyle = getMetricBadgeStyle(metricInfo.key, metricValue);
                return (
                  <div key={metricInfo.key} className="p-2 border rounded-lg bg-white">
                    <p className="text-sm text-gray-500">{metricInfo.displayName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-base font-medium text-black">
                        {typeof metricValue === 'number' ? metricValue.toFixed(2) : String(metricValue)}
                      </p>
                      {badgeStyle.label && (
                        <Badge className={`px-2 py-0.5 text-xs ${badgeStyle.className}`}>
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
                className="mt-2 text-gray-600 hover:text-gray-900 p-0 h-auto"
                onClick={() => setShowAllMetrics(!showAllMetrics)}
              >
                {showAllMetrics ? 'Hide Additional Metrics' : 'Show All Metrics'}
              </Button>
            )}
          </div>
        )}

        {localRecommendations.length > 0 && (
          <div className="mb-4">
            <h3 className="text-base font-medium mb-2">Recommendations (Rule-Based)</h3>
            <div className="space-y-2">
              {localRecommendations.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start">
                    <div className="mr-2 flex-shrink-0 pt-0.5">{rec.icon}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-black">{rec.type}</p>
                      <p className="text-gray-700 text-sm">{rec.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5"
              onClick={handleViewAIRecommendations}
              disabled={isLoadingLLM || !jsonData || !selectedNode?.id}
            >
              <Brain className="mr-2 h-5 w-5" />
              {isLoadingLLM ? "Generating AI Insights..." : "Get AI Design Recommendations"}
            </Button>
        </div>

        <div className="mt-4">
          <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5" disabled>
            <span className="mr-2 text-lg">→</span> Refactor (Coming Soon)
          </Button>
        </div>

        {showLLMModal && (
          <div className="fixed inset-0 bg-transparent flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out"> {/* MODIFIED HERE */}
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-100">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <Brain className="mr-3 h-6 w-6 text-indigo-600" />
                  AI Design Recommendations
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowLLMModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <ScrollArea className="flex-grow pr-2 -mr-2">
                <div className="prose prose-sm lg:prose-base max-w-none text-gray-700">
                  {isLoadingLLM &&
                    <div className="flex flex-col items-center justify-center h-64">
                        <svg className="animate-spin h-10 w-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-3 text-gray-600">Generating insights... This may take a moment.</p>
                    </div>
                  }
                  {llmError && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                                <p className="font-bold">Error</p>
                                <p>{llmError}</p>
                               </div>}
                  {!isLoadingLLM && !llmError && llmRecommendations && (
                    <ReactMarkdown
                        components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-gray-800" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3 text-gray-800 border-b pb-1" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-5 mb-2 text-gray-700" {...props} />,
                            p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                            code: ({node, inline, className, children, ...props}) => {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline && match ? (
                                <pre className={`${className} bg-gray-100 p-3 rounded-md overflow-x-auto text-sm my-3`} {...props}><code>{children}</code></pre>
                                ) : (
                                <code className={`${className} bg-pink-100 text-pink-700 px-1 py-0.5 rounded text-sm`} {...props}>
                                    {children}
                                </code>
                                )
                            },
                            pre: ({node, ...props}) => <div className="my-4">{props.children}</div>
                        }}
                    >{llmRecommendations}</ReactMarkdown>
                  )}
                  {!isLoadingLLM && !llmError && !llmRecommendations && (
                     <p className="text-gray-500 text-center py-10">No recommendations available at this moment or an issue occurred retrieving them.</p>
                  )}
                </div>
              </ScrollArea>
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <Button onClick={() => setShowLLMModal(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}