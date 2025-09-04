// RightPanel.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Search, XCircle, X as XIcon, Zap, AlertTriangle, List } from "lucide-react"; // Added List, removed Move
import GraphVisualization from "@/components/graph-visualization";
import FilteredGraphView from "@/components/FilteredGraphView";
import XMIEditor from "@/components/xmi-editor";
import MetricsDisplay from "@/components/MetricsDisplay";
import Overview from './Overview';

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
  const [isLegendVisible, setIsLegendVisible] = useState(false); 
  const [activeHighlight, setActiveHighlight] = useState(null); // 'coupling', 'cohesion', or null

  // Thresholds (could be made configurable later)
  const HIGHLIGHT_THRESHOLDS = useMemo(() => ({
    coupling: 5, // e.g., if total degree (afferent + efferent) > 5
    lcom: 2     // e.g., if LCOM4 > 2 (higher LCOM4 means lower cohesion)
  }), []);
  
  const legendItemsData = useMemo(() => [
    { style: { type: 'node', shape: 'round-rectangle', bgColor: '#E0F2FE', borderColor: '#38BDF8', borderW: 2 }, label: 'Package' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#3b82f6', borderColor: '#2563eb', borderW: 2 }, label: 'Class' },
    { style: { type: 'node', shape: 'triangle', bgColor: '#F59E0B', borderColor: '#D97706', borderW: 2 }, label: 'Parent Class' },
    { style: { type: 'node', shape: 'round-rectangle', bgColor: '#8b5cf6', borderColor: '#7c3aed', borderW: 2 }, label: 'Interface' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#3b82f6', borderColor: '#2563eb', borderW: 2, borderStyle: 'dashed', fontStyle: 'italic' }, label: 'Abstract Class' },
    { style: { type: 'edge', lineStyle: 'solid', color: '#ef4444', arrow: 'hollow-triangle' }, label: 'Inheritance' },
    { style: { type: 'edge', lineStyle: 'dashed', color: '#8b5cf6', arrow: 'hollow-triangle', dashPattern: '6,3' }, label: 'Implementation' },
    { style: { type: 'edge', lineStyle: 'dashed', color: '#22c55e', arrow: 'vee', dashPattern: '4,2' }, label: 'Dependency' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#E53E3E', borderColor: '#C53030', borderW: 2 }, label: 'Highly Coupled Class' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#DD6B20', borderColor: '#C05621', borderW: 2 }, label: 'Low Cohesion Class' },
  ], []);

  const LegendIcon = ({ style }) => {
    const iconContainerClasses = "flex-shrink-0 flex items-center justify-center";
    const borderWidth = style.borderW || 2;

    if (style.type === 'node') {
      let shapeClasses = "w-5 h-5";
      let borderStyleCss = style.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid';
      let finalStyle = {
        backgroundColor: style.bgColor,
        borderColor: style.borderColor,
        borderWidth: `${borderWidth}px`,
      };

      if (style.shape === 'ellipse') shapeClasses += " rounded-full";
      else if (style.shape === 'round-rectangle') shapeClasses += " rounded-sm";
      else if (style.shape === 'triangle') {
        return (
          <div className={`${iconContainerClasses} w-5 h-5 relative`}>
            <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: `18px solid ${style.borderColor}`, position: 'absolute', top: '0px', left: '0px', zIndex: 1 }}/>
            <div style={{ width: 0, height: 0, borderLeft: `calc(10px - ${borderWidth}px) solid transparent`, borderRight: `calc(10px - ${borderWidth}px) solid transparent`, borderBottom: `calc(18px - ${borderWidth}px) solid ${style.bgColor}`, position: 'absolute', top: `${borderWidth}px`, left: `${borderWidth}px`, zIndex: 2 }}/>
          </div>
        );
      }
      return <div className={`${iconContainerClasses} ${shapeClasses} ${borderStyleCss}`} style={finalStyle}></div>;
    } else { // Edge
      const lineCssStyle = {};
      const isSolid = !style.lineStyle || style.lineStyle === 'solid';
      if (isSolid) lineCssStyle.backgroundColor = style.color;
      else { const [dash, gap] = (style.dashPattern || '4,2').split(',').map(Number); lineCssStyle.backgroundImage = `linear-gradient(to right, ${style.color} ${dash}px, transparent ${dash}px)`; lineCssStyle.backgroundSize = `${dash + gap}px 2px`; lineCssStyle.backgroundRepeat = 'repeat-x'; }

      return (
        <div className={`${iconContainerClasses} w-[35px] h-[15px] relative`}>
          <div className="w-full h-[2px] absolute top-1/2 -translate-y-1/2" style={lineCssStyle}></div>
          {style.arrow && style.arrow !== 'none' && 
            <div className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: (style.arrow === 'vee' || style.arrow === 'hollow-triangle') ? `7px solid ${style.color}` : 'none' }}> 
              {style.arrow === 'hollow-triangle' && <div className="absolute top-[-3px] left-[-6px] w-0 h-0" style={{ borderTop: '3px solid transparent', borderBottom: '3px solid transparent', borderLeft: `4px solid var(--legend-bg-color, white)` }} />}
            </div>
          }
        </div>
      );
    }
  };

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
      <TabsContent value="overview" className="flex-1 m-0 h-full overflow-auto">
      <div className="p-6 h-full">
        <Overview />
      </div>
    </TabsContent>
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
            <Button variant="outline" size="icon" onClick={() => setIsLegendVisible(!isLegendVisible)} aria-label="Toggle Legend" className="h-10 w-10">
                <List className="h-4 w-4" />
            </Button>
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

        {/* Legend Display */}
        <div 
          id="uml-legend-right-panel"
          style={{ '--legend-bg-color': 'rgba(255, 255, 255, 0.95)' }} 
          className={`
            absolute bottom-4 left-4 bg-[var(--legend-bg-color)] p-3 
            border border-gray-300/80 rounded-lg shadow-xl 
            grid grid-cols-2 gap-x-4 gap-y-2 
            text-xs z-[1000] max-w-[420px]
            transition-all duration-300 ease-in-out
            ${isLegendVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
          `}
        >
          {legendItemsData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <LegendIcon style={item.style} />
              <span className={`whitespace-nowrap ${item.style.fontStyle === 'italic' ? 'italic' : ''}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </TabsContent>

    <TabsContent value="metrics" className="flex-1 m-0 h-full overflow-auto">
      <div className="p-6 h-full">
        <MetricsDisplay matrices={matrices} activeMatrixTab={activeMatrixTab} />
      </div>
    </TabsContent>
      

    </div>
  );
}