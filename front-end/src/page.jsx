import { useState, useEffect } from "react";
import { Tabs } from "@/components/ui/tabs";
import { NavBar } from "@/components/NavBar";
import { LeftPanel } from "@/components/LeftPanel";
import { RightPanel } from "@/components/RightPanel";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FolderOpen, Save, Download, RefreshCw, Upload } from "lucide-react";
import apiService from "@/services/apiService";
import { fileOps } from "@/services/apiService";

export default function Home() {
  const [activeTab, setActiveTab] = useState("visualizations");
  const [selectedNode, setSelectedNode] = useState(null);
  const [perspective, setPerspective] = useState("software-engineer");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [xmiContent, setXmiContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [matrices, setMatrices] = useState(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  // console.log("jsonData fro page.jsx line: 30", jsonData);
  console.log("Metrics from page.jsx line: 31", metrics);


  // Load initial data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch matrices data from the server
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await apiService.getInitialData();
      
      // Process file path and XMI content if available
      if (data.filepath) {
        const result = await fileOps.readXMIFile(data.filepath);
        if (result) {
          setFilePath(result.filepath);
          setXmiContent(result.content);
        }
      }
      
      // Set matrices data if available
      if (data.matrices) {
        setMatrices(data.matrices);
        // console.log("Loaded matrices:", data.matrices);
        if (Object.keys(data.matrices).length > 0) {
          setActiveMatrixTab(Object.keys(data.matrices)[0]);
        }
      }
      
      // Set metrics if available
      if (data.metrics) {
        setMetrics(data.metrics);
        // console.log("Loaded metrics:", data.metrics);
      }

      // Try to load XMI JSON data
      try {
        const parsedData = await apiService.getParsedXMI();
        const parsedData_ = JSON.parse(parsedData);
        setJsonData(parsedData_);
      } catch (jsonErr) {
        console.error("Error loading parsed XMI:", jsonErr);
      }

    } catch (err) {
      console.error("Error loading initial data:", err);
      setError("Failed to load initial data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeSelect = (nodeId) => {
    console.log("jsonData line:  83", jsonData);
    if (!nodeId) {
      setSelectedNode(null);
      return;
    }
    if (!jsonData || !matrices) {
      console.warn("jsonData or matrices not loaded yet. Cannot select node.");
      // Optionally, set a basic node object if you want to show just the ID
      setSelectedNode({ id: nodeId, label: nodeId, category: 'Unknown', package: 'Unknown', metrics: {} });
      return;
    }

    let nodeDetails = {
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
      implements: [], // Interfaces this class implements
      realizedBy: [], // Classes that realize this interface
      associations: [],
      dependencies: [],
    };

    let foundNodeInfo = null;
    let nodePackageName = '';
    let nodeCategory = '';

    // 1. Search in jsonData.packages (primary source for classes and interfaces)
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

    // 2. Fallback search in jsonData.parentClasses (if not found in packages)
    if (!foundNodeInfo) {
      const parentClassDef = jsonData.parentClasses?.find(p => p.name === nodeId);
      if (parentClassDef) {
        // This entry might have different structure for metrics/attributes than package entry.
        // Prioritize package entry if available.
        foundNodeInfo = { ...parentClassDef, metrics: parentClassDef.metrics || {} }; 
        nodePackageName = parentClassDef.package || 'Unknown';
        nodeCategory = 'Class';
      }
    }
    
    // 3. Fallback search in jsonData.interfaces (top-level, if applicable)
    if (!foundNodeInfo) {
        const topLevelInterface = jsonData.interfaces?.find(i => i.name === nodeId);
        if (topLevelInterface) {
            foundNodeInfo = topLevelInterface;
            nodePackageName = topLevelInterface.package || 'Unknown';
            nodeCategory = 'Interface';
        }
    }


    if (foundNodeInfo) {
      nodeDetails.metrics = foundNodeInfo.metrics || {};
      nodeDetails.attributes = foundNodeInfo.attributes || [];
      nodeDetails.methods = foundNodeInfo.methods || [];
      nodeDetails.isAbstract = foundNodeInfo.isAbstract || false; // isAbstract from class/interface definition
      if (nodeCategory === 'Interface') nodeDetails.isAbstract = true; // Interfaces are implicitly abstract

      // Specific handling for Class
      if (nodeCategory === 'Class') {
        if (foundNodeInfo.parents) nodeDetails.parents.push(...foundNodeInfo.parents);
        if (foundNodeInfo.implements) nodeDetails.implements.push(...foundNodeInfo.implements);
        
        // Children from jsonData.parentClasses (where current node is the parent)
        const parentEntryForChildren = jsonData.parentClasses?.find(p => p.name === nodeId);
        if (parentEntryForChildren && parentEntryForChildren.children) {
          nodeDetails.children.push(...parentEntryForChildren.children);
        }
      }
      // Specific handling for Interface
      else if (nodeCategory === 'Interface') {
        if (foundNodeInfo.realizedBy) nodeDetails.realizedBy.push(...foundNodeInfo.realizedBy);
        // Interfaces can extend other interfaces (parents)
        if (foundNodeInfo.parents) nodeDetails.parents.push(...foundNodeInfo.parents);
      }
    } else {
      // Could be a package node itself
      const pkgData = jsonData.packages?.find(p => p.name === nodeId);
      if (pkgData) {
          nodeCategory = 'Package';
          nodePackageName = nodeId; // Package name is its own name
          nodeDetails.metrics = pkgData.metrics || {};
          // For packages, "children" could list classes/interfaces within it
          if (pkgData.classes) nodeDetails.children.push(...pkgData.classes.map(c => c.name));
          if (pkgData.interfaces) nodeDetails.children.push(...pkgData.interfaces.map(i => i.name));
      } else {
          console.warn(`Node ${nodeId} has no detailed info in jsonData.`);
          nodeCategory = 'Unknown';
          nodePackageName = 'Unknown';
      }
    }
    
    nodeDetails.package = nodePackageName;
    nodeDetails.category = nodeCategory;


    // Populate relationships from matrices
    // Inheritance (parents from matrix - Child is Row, Parent is Column)
    if (matrices.Class_Inheritance && matrices.Class_Inheritance.rows[nodeId] && nodeCategory === 'Class') {
      matrices.Class_Inheritance.rows[nodeId].forEach((val, idx) => {
        if (val === 1) {
          const parentName = matrices.Class_Inheritance.columns[idx];
          if (!nodeDetails.parents.includes(parentName)) nodeDetails.parents.push(parentName);
        }
      });
    }
    // Inheritance (children from matrix - Parent is Row, Child is Column)
    if (matrices.Class_Inheritance && matrices.Class_Inheritance.columns.includes(nodeId) && nodeCategory === 'Class') {
        const parentColIdx = matrices.Class_Inheritance.columns.indexOf(nodeId);
        Object.entries(matrices.Class_Inheritance.rows).forEach(([childName, inheritFlags]) => {
            if (inheritFlags[parentColIdx] === 1 && !nodeDetails.children.includes(childName)) {
                nodeDetails.children.push(childName);
            }
        });
    }


    // Implementations (if class, interfaces it implements from matrix - Interface is Row, Class is Column)
    if (matrices.Interface_Realizations && nodeCategory === 'Class') {
        const classColIndex = matrices.Interface_Realizations.columns.indexOf(nodeId);
        if (classColIndex !== -1) {
            Object.entries(matrices.Interface_Realizations.rows).forEach(([interfaceName, realizations]) => {
                if (realizations[classColIndex] === 1 && !nodeDetails.implements.includes(interfaceName)) {
                    nodeDetails.implements.push(interfaceName);
                }
            });
        }
    }
    // Realizations (if interface, classes that realize it from matrix - Interface is Row, Class is Column)
    if (matrices.Interface_Realizations && matrices.Interface_Realizations.rows[nodeId] && nodeCategory === 'Interface') {
        matrices.Interface_Realizations.rows[nodeId].forEach((val, idx) => {
            if (val === 1) {
                const className = matrices.Interface_Realizations.columns[idx];
                if (!nodeDetails.realizedBy.includes(className)) nodeDetails.realizedBy.push(className);
            }
        });
    }
    

    // Associations and Dependencies from Class_Dependencies matrix
    if (matrices.Class_Dependencies) {
      // Outgoing
      if (matrices.Class_Dependencies.rows[nodeId]) {
        matrices.Class_Dependencies.rows[nodeId].forEach((value, colIndex) => {
          if (value > 0) {
            const targetClass = matrices.Class_Dependencies.columns[colIndex];
            if (targetClass !== nodeId) {
              if (value === 1) nodeDetails.associations.push({ target: targetClass, type: 'association', direction: 'outgoing' });
              else nodeDetails.dependencies.push({ target: targetClass, type: 'dependency', weight: value, direction: 'outgoing' });
            }
          }
        });
      }
      // Incoming
      const colIdx = matrices.Class_Dependencies.columns.indexOf(nodeId);
      if (colIdx !== -1) {
        Object.entries(matrices.Class_Dependencies.rows).forEach(([sourceClass, relations]) => {
          const value = relations[colIdx];
          if (value > 0 && sourceClass !== nodeId) {
            if (value === 1) nodeDetails.associations.push({ source: sourceClass, type: 'association', direction: 'incoming' });
            else nodeDetails.dependencies.push({ source: sourceClass, type: 'dependency', weight: value, direction: 'incoming' });
          }
        });
      }
    }
    setSelectedNode(nodeDetails);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));

  const handleFileOpen = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fileOps.readXMIFile();
      if (!result) return; // User canceled or error occurred
      
      setFilePath(result.filepath);
      setXmiContent(result.content);
      
      // Process on backend
      const processResult = await apiService.processXMI(result.filepath);
      
      // Update matrices and metrics with new data
      if (processResult.matrices) {
        setMatrices(processResult.matrices);
        if (Object.keys(processResult.matrices).length > 0) {
          setActiveMatrixTab(Object.keys(processResult.matrices)[0]);
        }
      }
      
      if (processResult.metrics) {
        setMetrics(processResult.metrics);
      }
    } catch (err) {
      console.error("Error opening file:", err);
      setError("Failed to open file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSave = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!xmiContent) {
        setError("No content to save");
        return;
      }
      
      const savedPath = await fileOps.writeXMIFile(filePath, xmiContent);
      if (savedPath) {
        setFilePath(savedPath);
        // Show success notification if needed
      }
    } catch (err) {
      console.error("Error saving file:", err);
      setError("Failed to save file: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle changing the active matrix tab
  const handleMatrixTabChange = (tabName) => {
    setActiveMatrixTab(tabName);
    // Reset selected node when changing matrices
    setSelectedNode(null);
  };

  return (
    <main className="flex flex-col h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full overflow-hidden">
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="px-4 py-2 flex items-center gap-2 border-b">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleFileOpen}
                  disabled={isLoading}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open File</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleFileSave}
                  disabled={isLoading || !xmiContent}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save File</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={fetchInitialData}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {error && <p className="text-red-500 text-sm ml-2">{error}</p>}
          {isLoading && <p className="text-blue-500 text-sm ml-2">Loading...</p>}
          {filePath && <p className="text-gray-500 text-sm ml-2 truncate max-w-md">{filePath}</p>}
          
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <LeftPanel
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filter={filter}
            setFilter={setFilter}
            perspective={perspective}
            setPerspective={setPerspective}
            selectedNode={selectedNode}
            matrices={matrices}
            activeMatrixTab={activeMatrixTab}
            jsonData={jsonData} // Pass JSON data to LeftPanel
          />
          <RightPanel
            onNodeSelect={handleNodeSelect}
            perspective={perspective}
            zoomLevel={zoomLevel}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            xmiContent={xmiContent}
            filePath={filePath}
            setXmiContent={setXmiContent}
            matrices={matrices}
            activeMatrixTab={activeMatrixTab}
            jsonData={jsonData} // Pass JSON data to RightPanel
            
          />
        </div>
      </Tabs>
      <StatusBar 
        matrices={matrices} 
        activeMatrixTab={activeMatrixTab}
        metrics={metrics}
      />
    </main>
  );
}