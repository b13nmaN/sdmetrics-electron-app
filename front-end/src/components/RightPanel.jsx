import { TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import GraphVisualization from "@/components/graph-visualization";
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
  nodes,
  edges
}) {
  return (
    <div className="w-4/5 flex flex-col">
      <TabsContent value="visualizations" className="flex-1 m-0 relative">
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Move className="h-4 w-4" />
          </Button>
        </div>
        <GraphVisualization
          nodes={nodes}
          edges={edges}
          onNodeSelect={onNodeSelect}
          perspective={perspective}
          zoomLevel={zoomLevel}
        />
      </TabsContent>
      <TabsContent value="overview" className="flex-1 m-0 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
            <CardDescription>
              This application visualizes class relationships from XMI files as directed graphs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Use the Visualizations tab to explore the class relationships and metrics.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="metrics" className="flex-1 m-0 p-6">
        <MetricsDisplay />
      </TabsContent>
      <TabsContent value="editor" className="flex-1 m-0">
        <XMIEditor xmiContent={xmiContent} filePath={filePath} setXmiContent={setXmiContent} />
      </TabsContent>
    </div>
  );
}