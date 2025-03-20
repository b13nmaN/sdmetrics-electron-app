// Header.js
"use client"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { 
  FolderOpen, Save, Download, Share2, RefreshCw, Upload, Code 
} from "lucide-react"

export function EditorHeader({ 
  fileName, 
  isServerMode, 
  isConnected, 
  isReconnecting, 
  onFileUpload, 
  onSave, 
  onModeToggle, 
  onReconnect,
  fileInputRef 
}) {
  return (
    <header className="border-b p-2 bg-background flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">XMI Editor</h1>
        <Tabs defaultValue="file" className="ml-4">
          <TabsList>
            <TabsTrigger value="file">File</TabsTrigger>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="view">View</TabsTrigger>
            <TabsTrigger value="help">Help</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onFileUpload}>
                <FolderOpen className="h-4 w-4" />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xmi,.xml"
                  className="hidden"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open File</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onSave}>
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Share</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isServerMode ? "default" : "outline"}
                size="sm"
                onClick={onModeToggle}
                className="text-xs"
              >
                {isServerMode ? "Server Mode" : "Local Mode"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isServerMode ? "Using server for XMI processing" : "Processing XMI locally"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  )
}





