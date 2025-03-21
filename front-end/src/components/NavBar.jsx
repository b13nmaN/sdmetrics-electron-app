// components/NavBar.jsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function NavBar({ activeTab, setActiveTab }) {
  return (
    <div className="border-b border-b-border px-10">
      <div className="mx-auto px-4 flex items-center justify-between py-2"> 
        <div className="flex items-center gap-2">
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 64 64" 
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
          >
            <circle cx="32" cy="32" r="4" fill="#000000" />
            <circle cx="20" cy="20" r="3" fill="#000000" />
            <circle cx="44" cy="20" r="2.5" fill="#000000" />
            <circle cx="20" cy="44" r="3" fill="#000000" />
            <circle cx="44" cy="44" r="3.5" fill="#000000" />
            <circle cx="14" cy="32" r="2.5" fill="#000000" />
            <circle cx="50" cy="32" r="3" fill="#000000" />
            <circle cx="32" cy="14" r="2.8" fill="#000000" />
            <circle cx="32" cy="50" r="3.2" fill="#000000" />
            <line x1="32" y1="32" x2="20" y2="20" stroke="#000000" strokeWidth="1" />
            <line x1="32" y1="32" x2="44" y2="20" stroke="#000000" strokeWidth="0.8" />
            <line x1="32" y1="32" x2="20" y2="44" stroke="#000000" strokeWidth="1" />
            <line x1="32" y1="32" x2="44" y2="44" stroke="#000000" strokeWidth="1.2" />
            <line x1="32" y1="32" x2="14" y2="32" stroke="#000000" strokeWidth="0.9" />
            <line x1="32" y1="32" x2="50" y2="32" stroke="#000000" strokeWidth="1" />
            <line x1="32" y1="32" x2="32" y2="14" stroke="#000000" strokeWidth="0.8" />
            <line x1="32" y1="32" x2="32" y2="50" stroke="#000000" strokeWidth="1.1" />
            <line x1="20" y1="20" x2="14" y2="32" stroke="#000000" strokeWidth="0.7" />
            <line x1="44" y1="20" x2="50" y2="32" stroke="#000000" strokeWidth="0.7" />
          </svg>
          <span className="text-xl font-bold">UML Insights</span>
        </div>
        <TabsList className="ml-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visualizations">Visualizations</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="editor">Editor</TabsTrigger>
        </TabsList>
      </div>
    </div>
  )
}