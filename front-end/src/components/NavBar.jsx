// components/NavBar.jsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function NavBar({ activeTab, setActiveTab }) {
  return (
    <div className="border-b">
      <div className="container flex items-center justify-between py-2">
        <h1 className="text-xl font-bold">Graph Visualization</h1>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
      </div>
    </div>
  )
}