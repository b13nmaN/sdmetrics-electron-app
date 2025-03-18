
import { useState, useEffect } from "react"
import { Tabs } from "@/components/ui/tabs"
import { NavBar } from "@/components/NavBar"
import { LeftPanel } from "@/components/LeftPanel"
import { RightPanel } from "@/components/RightPanel"
import { StatusBar } from "@/components/StatusBar"

// Sample data remains the same
const sampleNodes = [/* ... */]
const sampleEdges = [/* ... */]

export default function Home() {
  const [activeTab, setActiveTab] = useState("visualizations")
  const [selectedNode, setSelectedNode] = useState(null)
  const [perspective, setPerspective] = useState("software-engineer")
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [nodes, setNodes] = useState(sampleNodes)
  const [edges, setEdges] = useState(sampleEdges)
  const [zoomLevel, setZoomLevel] = useState(1)

  const handleNodeSelect = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    setSelectedNode(node)
  }

  useEffect(() => {
    // Filter logic remains the same
  }, [searchTerm, filter])

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  return (
    <main className="flex flex-col h-screen bg-background">
      <Tabs
        defaultValue="visualizations"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full flex flex-col h-full"
      >
        <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
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
          />
        </div>
      </Tabs>
      <StatusBar nodes={nodes} edges={edges} />
    </main>
  )
}