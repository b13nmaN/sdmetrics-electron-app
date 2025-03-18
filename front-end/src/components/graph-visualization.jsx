"use client"

import { useEffect, useRef } from "react"
import cytoscape from "cytoscape"

export default function GraphVisualization({ nodes, edges, onNodeSelect, perspective, zoomLevel = 1 }) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

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
          selector: "node:selected",
          style: {
            "background-color": "#1d4ed8", // blue-700
            "border-width": 3,
            "border-color": "#0f172a", // slate-900
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

    const elements = [
      ...nodes.map((node) => ({
        data: {
          id: node.id,
          label: node.label,
          category: node.category,
        },
      })),
      ...edges.map((edge, idx) => ({
        data: {
          id: `edge-${idx}`,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        },
      })),
    ]

    cyRef.current.elements().remove()
    cyRef.current.add(elements)

    // Apply layout
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
        // Highlight cycles (simplified example - just highlighting inheritance)
        cyRef.current.edges('[type="inheritance"]').addClass("highlight")
        break
      case "computer-scientist":
        // Highlight connectivity (simplified - highlighting associations)
        cyRef.current.edges('[type="association"]').addClass("highlight")
        break
      case "mathematician":
        // Highlight density (simplified - highlighting dependencies)
        cyRef.current.edges('[type="dependency"]').addClass("highlight")
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

