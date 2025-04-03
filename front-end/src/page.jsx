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
      }

      // Try to load XMI JSON data
      try {
        const parsedData = await apiService.getParsedXMI();
        setJsonData(parsedData);
        console.log("Loaded parsed XMI data:", parsedData);
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
    // Find the node in our data
    if (!matrices || !activeMatrixTab) {
      setSelectedNode(null);
      return;
    }
    
    // If nodeId is null (deselect) or not found
    if (!nodeId) {
      setSelectedNode(null);
      return;
    }
    
    // Create a node object with information from the matrices
    const node = {
      id: nodeId,
      label: nodeId,
      // Find relationships for this node
      relationships: findNodeRelationships(nodeId),
    };
    
    setSelectedNode(node);
  };

  // Helper function to find relationships for a node from all matrices
  const findNodeRelationships = (nodeId) => {
    if (!matrices) return [];
    
    const relationships = [];
    
    // Check each matrix for relationships involving this node
    Object.entries(matrices).forEach(([matrixName, matrix]) => {
      // Check if node is a source (row)
      if (matrix.rows[nodeId]) {
        matrix.rows[nodeId].forEach((value, colIndex) => {
          if (value > 0) {
            const targetName = matrix.columns[colIndex];
            relationships.push({
              type: matrixName.replace(/_/g, " "),
              direction: "outgoing",
              target: targetName,
              value
            });
          }
        });
      }
      
      // Check if node is a target (column)
      const colIndex = matrix.columns.indexOf(nodeId);
      if (colIndex >= 0) {
        Object.entries(matrix.rows).forEach(([rowName, rowValues]) => {
          const value = rowValues[colIndex];
          if (value > 0) {
            relationships.push({
              type: matrixName.replace(/_/g, " "),
              direction: "incoming",
              source: rowName,
              value
            });
          }
        });
      }
    });
    
    return relationships;
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
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
          
          {matrices && (
            <div className="ml-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">Matrix:</span>
              <select 
                value={activeMatrixTab}
                onChange={(e) => handleMatrixTabChange(e.target.value)}
                className="text-sm border rounded p-1"
              >
                {Object.keys(matrices).map((matrixName) => (
                  <option key={matrixName} value={matrixName}>
                    {matrixName.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          )}
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