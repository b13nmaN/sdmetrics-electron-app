// components/NavBar.jsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function NavBar({ activeTab, setActiveTab }) {
  return (
    
    <div className="border-b px-10">
    <div className="mx-auto px-4 flex items-center justify-between py-2"> 
      <h1 className="text-xl font-bold">Graph Visualization</h1>
      <TabsList className="ml-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
        <TabsTrigger value="metrics">Metrics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
    </div>
  </div>
  )
}