import { useState, useEffect, useRef } from "react";
import { Tabs } from "@/components/ui/tabs";
import { NavBar } from "@/components/NavBar";
import { LeftPanel } from "@/components/LeftPanel";
import { RightPanel } from "@/components/RightPanel";
import { StatusBar } from "@/components/StatusBar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FolderOpen, Save, Download, Share2, RefreshCw, Upload, Code } from "lucide-react";
import apiService from "@/services/apiService";
import { fileOps } from "@/services/apiService";

// Sample data for demonstration
const sampleNodes = [
  { id: "student", label: "Student", category: "Entity" },
  { id: "person", label: "Person", category: "Entity" },
  { id: "course", label: "Course", category: "Entity" },
  { id: "enrollment", label: "Enrollment", category: "Association" },
  { id: "department", label: "Department", category: "Entity" },
  { id: "faculty", label: "Faculty", category: "Entity" },
  { id: "address", label: "Address", category: "Value Object" },
  { id: "grade", label: "Grade", category: "Value Object" },
];

const sampleEdges = [
  { source: "student", target: "person", type: "inheritance" },
  { source: "student", target: "enrollment", type: "association" },
  { source: "enrollment", target: "course", type: "association" },
  { source: "course", target: "department", type: "dependency" },
  { source: "faculty", target: "person", type: "inheritance" },
  { source: "faculty", target: "department", type: "association" },
  { source: "person", target: "address", type: "association" },
  { source: "enrollment", target: "grade", type: "dependency" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("visualizations");
  const [selectedNode, setSelectedNode] = useState(null);
  const [perspective, setPerspective] = useState("software-engineer");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [nodes, setNodes] = useState(sampleNodes);
  const [edges, setEdges] = useState(sampleEdges);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [xmiContent, setXmiContent] = useState("");
  const [filePath, setFilePath] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const { filepath, metrics, matrices } = await apiService.getInitialData();
        if (filepath) {
          const result = await fileOps.readXMIFile(filepath);
          if (result) {
            setFilePath(result.filepath);
            setXmiContent(result.content);
            // Optionally parse XMI to update nodes/edges if you have a parser
          }
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        setError("Failed to load initial data");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const handleNodeSelect = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId);
    setSelectedNode(node);
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.5));

  const handleFileOpen = async () => {
    try {
      setIsLoading(true);
      setError(null);
     
      const result = await fileOps.readXMIFile();
      if (!result) return; // User canceled or error occurred
     
      // Escape the backslashes in the filepath
      const escapedFilePath = result.filepath.replace(/\\/g, '\\\\');
      
      setFilePath(escapedFilePath);
      setXmiContent(result.content);
     
      // Process on backend with escaped filepath
      await apiService.processXMI(escapedFilePath);
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
            nodes={nodes}
            edges={edges}
          />
          <RightPanel
            nodes={nodes}
            edges={edges}
            onNodeSelect={handleNodeSelect}
            perspective={perspective}
            zoomLevel={zoomLevel}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            xmiContent={xmiContent}
            filePath={filePath}
            setXmiContent={setXmiContent} // Pass setter for editing
          />
        </div>
      </Tabs>
      <StatusBar nodes={nodes} edges={edges} />
    </main>
  );
}