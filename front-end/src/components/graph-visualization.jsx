"use client"

import { useEffect, useRef, useMemo } from "react"
import cytoscape from "cytoscape"

export default function GraphVisualization({
  matrices,  // The matrices data from the backend
  activeMatrixTab, // The currently active matrix to visualize
  onNodeSelect,
  perspective,
  zoomLevel = 1
}) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  // Process matrices data into nodes and edges - adapts to any matrix structure
  const { nodes, edges } = useMemo(() => {
    const result = { nodes: [], edges: [] }
    
    // Return empty if no matrices or no active tab
    if (!matrices || !activeMatrixTab || !matrices[activeMatrixTab]) {
      return result
    }

    const currentMatrix = matrices[activeMatrixTab]
    const { columns, rows } = currentMatrix
    
    // Generate unique nodes from both columns and row keys
    const uniqueNodes = new Set([...columns, ...Object.keys(rows)])
    
    // Create nodes
    result.nodes = Array.from(uniqueNodes).map(nodeName => ({
      id: nodeName,
      label: nodeName,
      category: determineCategory(nodeName, activeMatrixTab)
    }))
    
    // Create edges based on relationships in the matrix
    let edgeCounter = 0
    Object.entries(rows).forEach(([rowName, rowValues]) => {
      rowValues.forEach((value, colIndex) => {
        if (value > 0) {  // If there's a relationship (value > 0)
          const targetName = columns[colIndex]
          result.edges.push({
            id: `edge-${edgeCounter++}`,
            source: rowName,
            target: targetName,
            type: determineRelationshipType(activeMatrixTab, value),
            weight: value  // Store the weight/strength of the relationship
          })
        }
      })
    })
    
    return result
  }, [matrices, activeMatrixTab])

  // Helper function to determine node category based on naming conventions or matrix type
  function determineCategory(nodeName, matrixType) {
    // Different categorization based on matrix type
    switch (matrixType) {
      case "Class_Dependencies":
      case "Class_Inheritance":
      case "Class_Gen":
        return "Class"
      case "Interface_Implementations":
        return nodeName.startsWith("I") ? "Interface" : "Class"
      case "Package_Dependencies":
        return "Package"
      default:
        // Fallback categorization based on naming convention
        if (nodeName.startsWith("I") && nodeName.length > 1 && nodeName[1].toUpperCase() === nodeName[1]) {
          return "Interface"
        } else if (nodeName.includes("Package") || nodeName.includes("Module")) {
          return "Package"
        } else {
          return "Class"
        }
    }
  }

  // Helper function to determine relationship type based on matrix type and value
  function determineRelationshipType(matrixType, value) {
    switch (matrixType) {
      case "Class_Inheritance":
      case "Class_Gen":
        return "inheritance"
      case "Class_Dependencies":
        return "dependency"
      case "Interface_Implementations":
        return "implementation"
      case "Package_Dependencies":
        return "dependency"
      default:
        // Fallback to different types based on the value
        if (value === 1) return "association"
        if (value === 2) return "composition"
        if (value >= 3) return "aggregation"
        return "dependency"
    }
  }

  // Initialize cytoscape
  useEffect(() => {
    if (!containerRef.current) return

    // Create cytoscape instance
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#3b82f6", // blue-500
            label: "data(label)",
            color: "#ffffff",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "12px",
            width: "50px",
            height: "50px",
            "text-wrap": "wrap",
            "text-max-width": "50px",
            "border-width": 2,
            "border-color": "#2563eb", // blue-600
          },
        },
        {
          selector: 'node[category="Interface"]',
          style: {
            "background-color": "#8b5cf6", // violet-500
            "border-color": "#7c3aed", // violet-600
            "shape": "roundrectangle",
          },
        },
        {
          selector: 'node[category="Package"]',
          style: {
            "background-color": "#10b981", // emerald-500
            "border-color": "#059669", // emerald-600
            "shape": "roundrectangle",
            "width": "60px",
            "height": "40px",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "line-color": "#94a3b8", // slate-400
            "target-arrow-color": "#94a3b8", // slate-400
          },
        },
        {
          selector: 'edge[type="inheritance"]',
          style: {
            "line-color": "#ef4444", // red-500
            "target-arrow-color": "#ef4444", // red-500
            "line-style": "solid",
            width: 3,
          },
        },
        {
          selector: 'edge[type="implementation"]',
          style: {
            "line-color": "#8b5cf6", // violet-500
            "target-arrow-color": "#8b5cf6", // violet-500
            "line-style": "dashed",
            width: 3,
          },
        },
        {
          selector: 'edge[type="association"]',
          style: {
            "line-color": "#f97316", // orange-500
            "target-arrow-color": "#f97316", // orange-500
            "line-style": "solid",
            "target-arrow-shape": "none",
          },
        },
        {
          selector: 'edge[type="dependency"]',
          style: {
            "line-color": "#22c55e", // green-500
            "target-arrow-color": "#22c55e", // green-500
            "line-style": "dashed",
          },
        },
        {
          selector: 'edge[type="composition"]',
          style: {
            "line-color": "#0ea5e9", // sky-500
            "target-arrow-color": "#0ea5e9", // sky-500
            "line-style": "solid",
            "source-arrow-shape": "diamond",
          },
        },
        {
          selector: 'edge[type="aggregation"]',
          style: {
            "line-color": "#14b8a6", // teal-500
            "target-arrow-color": "#14b8a6", // teal-500
            "line-style": "solid",
            "source-arrow-shape": "diamond",
            "source-arrow-fill": "hollow",
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#1d4ed8", // blue-700
            "border-width": 3,
            "border-color": "#0f172a", // slate-900
          },
        },
        {
          selector: "edge:selected",
          style: {
            width: 4,
            "line-color": "#1d4ed8", // blue-700
            "target-arrow-color": "#1d4ed8", // blue-700
          },
        },
      ],
      layout: {
        name: "cose",
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      },
    })

    // Add event listener for node selection
    cyRef.current.on("tap", "node", (evt) => {
      const node = evt.target
      onNodeSelect(node.id())
    })

    // Add event listener for background click to deselect
    cyRef.current.on("tap", (evt) => {
      if (evt.target === cyRef.current) {
        onNodeSelect(null)
      }
    })

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }
    }
  }, [])

  // Update elements when nodes or edges change
  useEffect(() => {
    if (!cyRef.current) return
    
    // Create Cytoscape-compatible elements array
    const elements = [
      ...nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          category: node.category,
        },
      })),
      ...edges.map((edge) => ({
        data: {
          id: edge.id || `edge-${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          weight: edge.weight || 1,
        },
      })),
    ]

    // Remove old elements and add new ones
    cyRef.current.elements().remove()
    cyRef.current.add(elements)

    // Apply layout if we have elements
    if (elements.length > 0) {
      cyRef.current
        .layout({
          name: "cose",
          idealEdgeLength: 100,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 30,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: 400000,
          edgeElasticity: 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        })
        .run()
    }
  }, [nodes, edges])

  // Apply perspective changes
  useEffect(() => {
    if (!cyRef.current) return

    // Reset styles
    cyRef.current.nodes().removeClass("highlight")
    cyRef.current.edges().removeClass("highlight")

    // Apply perspective-specific styles
    switch (perspective) {
      case "software-engineer":
        // Highlight inheritance relationships
        cyRef.current.edges('[type="inheritance"]').addClass("highlight")
        break
      case "computer-scientist":
        // Highlight connectivity (implementation and association relationships)
        cyRef.current.edges('[type="implementation"], [type="association"]').addClass("highlight")
        break
      case "mathematician":
        // Highlight dependencies
        cyRef.current.edges('[type="dependency"]').addClass("highlight")
        break
      default:
        // No specific highlighting for other perspectives
        break
    }
  }, [perspective])

  // Apply zoom level changes
  useEffect(() => {
    if (!cyRef.current) return
    cyRef.current.zoom(zoomLevel)
  }, [zoomLevel])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-white"
      style={{
        backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    />
  )
}