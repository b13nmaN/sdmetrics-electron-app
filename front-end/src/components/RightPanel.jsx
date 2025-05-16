// RightPanel.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Move, Search, XCircle, X as XIcon, Zap, AlertTriangle } from "lucide-react"; // Added Zap and AlertTriangle
import GraphVisualization from "@/components/graph-visualization";
import FilteredGraphView from "@/components/FilteredGraphView";
import XMIEditor from "@/components/xmi-editor";
import MetricsDisplay from "@/components/MetricsDisplay";

export function RightPanel({
  onNodeSelect,
  perspective,
  zoomLevel,
  handleZoomIn,
  handleZoomOut,
  xmiContent,
  filePath,
  setXmiContent,
  matrices,
  activeMatrixTab,
  jsonData
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [graphSearchTermInput, setGraphSearchTermInput] = useState("");
  const [submittedGraphSearchTerm, setSubmittedGraphSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [activeHighlight, setActiveHighlight] = useState(null); // 'coupling', 'cohesion', or null

  // Thresholds (could be made configurable later)
  const HIGHLIGHT_THRESHOLDS = useMemo(() => ({
    coupling: 5, // e.g., if total degree (afferent + efferent) > 5
    lcom: 2     // e.g., if LCOM4 > 2 (higher LCOM4 means lower cohesion)
  }), []);
  
  const inputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const allNodeNames = useMemo(() => {
    if (!jsonData) return [];
    const names = new Set();
    jsonData.packages?.forEach(pkg => {
      if (pkg?.name) names.add(pkg.name);
      pkg.classes?.forEach(cls => { if (cls?.name) names.add(cls.name); });
      pkg.interfaces?.forEach(intf => { if (intf?.name) names.add(intf.name); });
    });
    jsonData.parentClasses?.forEach(pI => { if (pI?.name) names.add(pI.name); });
    return Array.from(names).sort();
  }, [jsonData]);

  const handleSearchIconClick = () => {
    if (isSearchExpanded) {
      setGraphSearchTermInput(""); 
      setSuggestions([]);
    }
    setIsSearchExpanded(!isSearchExpanded);
  };

  const handleInputChange = (e) => {
    const term = e.target.value;
    setGraphSearchTermInput(term);
    if (term.trim() === "") {
      setSuggestions([]);
    } else {
      const filteredSuggestions = allNodeNames.filter(name =>
        name.toLowerCase().includes(term.toLowerCase())
      );
      setSuggestions(filteredSuggestions.slice(0, 10));
    }
  };

  const handleSuggestionClick = (nodeName) => {
    setGraphSearchTermInput(nodeName);
    setSubmittedGraphSearchTerm(nodeName);
    onNodeSelect(nodeName); // This will trigger selection in GraphVisualization
    setSuggestions([]);
    setIsSearchExpanded(false);
    setActiveHighlight(null); // Clear special highlights when a node is directly searched/selected
  };

  const handleSearchSubmit = () => {
    const termToSearch = graphSearchTermInput.trim();
    setSubmittedGraphSearchTerm(termToSearch);
    setActiveHighlight(null); // Clear special highlights

    if (termToSearch === "") {
      onNodeSelect(null);
    } else {
      if (allNodeNames.includes(termToSearch)) {
        onNodeSelect(termToSearch);
      } else {
        onNodeSelect(null); // Or provide feedback that node wasn't found
      }
    }
    setSuggestions([]);
    setIsSearchExpanded(false);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const clearInput = () => {
    setGraphSearchTermInput("");
    setSuggestions([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  const clearSearchAndCollapse = () => {
    setGraphSearchTermInput("");
    setSubmittedGraphSearchTerm("");
    onNodeSelect(null);
    setSuggestions([]);
    // setActiveHighlight(null); // Keep active highlight if user just exits search filter mode
    setIsSearchExpanded(false);
  };

  useEffect(() => {
      // Clear search input when jsonData changes, but keep special highlights
      setGraphSearchTermInput("");
      setSubmittedGraphSearchTerm("");
      onNodeSelect(null);
      setSuggestions([]);
      setIsSearchExpanded(false);
  }, [jsonData]); // Only react to jsonData changes

  useEffect(() => {
    if (isSearchExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        if (isSearchExpanded) {
           setIsSearchExpanded(false);
           setSuggestions([]);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchExpanded]);

  const handleHighlightToggle = (type) => {
    setActiveHighlight(prev => (prev === type ? null : type));
    setSubmittedGraphSearchTerm(""); // Exit filtered view when toggling highlights
    onNodeSelect(null); // Deselect any specific node
  };


  return (
    <div className="w-4/5 flex flex-col overflow-y-hidden">
      <TabsContent value="visualizations" className="flex-1 m-0 relative h-full overflow-y-hidden">
        
        {/* "View All Nodes" / Exit Filter Button */}
        {submittedGraphSearchTerm && (
          <Button
            variant="outline"
            size="icon"
            onClick={clearSearchAndCollapse}
            className="absolute top-4 left-4 z-20 h-10 w-10"
            aria-label="View all nodes"
          >
            <XIcon className="h-5 w-5" />
          </Button>
        )}

        {/* Animated Search Bar */}
        <div 
          ref={searchContainerRef} 
          className={`absolute top-4 z-20 transition-all duration-300 ease-in-out ${
            submittedGraphSearchTerm ? 'left-16' : 'left-4'
          }`}
        >
          <div className="relative flex items-center bg-white p-1 rounded-md shadow-sm border border-gray-200 h-10">
            <Button variant="ghost" size="icon" onClick={handleSearchIconClick} className="h-8 w-8 flex-shrink-0" aria-label="Toggle search">
              <Search className="h-5 w-5" />
            </Button>
            <div 
              className={`flex items-center space-x-1 overflow-hidden transition-all duration-300 ease-in-out ${isSearchExpanded ? 'max-w-[280px] opacity-100 ml-1 px-1' : 'max-w-0 opacity-0'}`}
            >
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search node ID..."
                value={graphSearchTermInput}
                onChange={handleInputChange}
                onKeyPress={handleSearchKeyPress}
                className="h-8 text-sm flex-grow min-w-0 border-0 focus-visible:ring-0"
              />
        
              {graphSearchTermInput && (
                <Button variant="ghost" size="icon" onClick={clearInput} className="h-8 w-8 flex-shrink-0" aria-label="Clear search input">
                  <XCircle className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </Button>
              )}
            </div>
          </div>

          {isSearchExpanded && suggestions.length > 0 && graphSearchTermInput.trim() !== "" && (
            <ul 
                className="absolute bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto z-30 mt-1"
                style={{ 
                    left: 'calc(4px + 32px + 4px + 4px)', 
                    width: '280px' 
                }}
            >
              {suggestions.map(suggestion => (
                <li
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Zoom/Move & Highlight buttons - only show if not in filtered view */}
        {!submittedGraphSearchTerm && (
          <div className="absolute top-4 right-4 flex space-x-2 z-10">
            <Button variant="outline" size="icon" onClick={handleZoomIn} aria-label="Zoom In" className="h-10 w-10">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut} aria-label="Zoom Out" className="h-10 w-10">
              <ZoomOut className="h-4 w-4" />
            </Button>
            {/* Pan/Move functionality is usually handled by graph library directly via drag */}
            {/* <Button variant="outline" size="icon" aria-label="Pan/Move" className="h-10 w-10">
              <Move className="h-4 w-4" />
            </Button> */}

            {/* Highlight Toggle Buttons */}
            <Button
              variant={activeHighlight === 'coupling' ? 'default' : 'outline'}
              size="sm" // Use sm for text buttons or keep icon-like if just icon
              onClick={() => handleHighlightToggle('coupling')}
              className="h-10 px-3 text-xs flex items-center gap-1"
              title="Show highly coupled classes"
            >
              <Zap size={14} /> Coupling
            </Button>
            <Button
              variant={activeHighlight === 'cohesion' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleHighlightToggle('cohesion')}
              className="h-10 px-3 text-xs flex items-center gap-1"
              title="Show classes with low cohesion"
            >
             <AlertTriangle size={14} /> Cohesion
            </Button>
             {activeHighlight && (
                <Button variant="ghost" size="icon" onClick={() => handleHighlightToggle(null)} className="h-10 w-10" aria-label="Clear highlights">
                    <XIcon className="h-4 w-4" />
                </Button>
            )}
          </div>
        )}

        {/* Conditional Rendering of Graph View */}
        {submittedGraphSearchTerm ? (
          <FilteredGraphView
            matrices={matrices}
            jsonData={jsonData}
            onNodeSelect={onNodeSelect}
            searchTerm={submittedGraphSearchTerm}
            // Pass highlight props if FilteredGraphView should also support them
            // activeHighlight={activeHighlight} 
            // highlightThresholds={HIGHLIGHT_THRESHOLDS}
          />
        ) : (
          <GraphVisualization
            matrices={matrices}
            activeMatrixTab={activeMatrixTab} 
            onNodeSelect={onNodeSelect}
            perspective={perspective}
            zoomLevel={zoomLevel} 
            jsonData={jsonData}
            activeHighlight={activeHighlight}
            highlightThresholds={HIGHLIGHT_THRESHOLDS}
          />
        )}
      </TabsContent>
      
      <TabsContent value="overview" className="flex-1 m-0 p-6 h-full overflow-auto">
        <Card>
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
            <CardDescription>
              This application visualizes class relationships from XMI files as directed graphs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Use the Visualizations tab to explore the class relationships and metrics.</p>
            <p className="mt-2">
              <strong>Highly Coupled Classes:</strong> Classes with many connections (dependencies, associations) to other classes. Indicated by <Zap size={14} className="inline align-text-bottom"/> icon.
            </p>
            <p className="mt-1">
              <strong>Low Cohesion Classes:</strong> Classes whose members (methods, attributes) are not well related or grouped. Indicated by <AlertTriangle size={14} className="inline align-text-bottom"/> icon. (Based on LCOM4 metric).
            </p>
            {matrices && activeMatrixTab && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Current Matrix: {activeMatrixTab.replace(/_/g, " ")}</h3>
                <p>This matrix represents relationships between software elements.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="metrics" className="flex-1 m-0 p-6 h-full overflow-auto">
        <MetricsDisplay matrices={matrices} activeMatrixTab={activeMatrixTab} />
      </TabsContent>
      
      <TabsContent value="editor" className="flex-1 m-0 h-full overflow-hidden">
        <XMIEditor xmiContent={xmiContent} filePath={filePath} setXmiContent={setXmiContent} />
      </TabsContent>
    </div>
  );
}