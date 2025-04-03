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
  matrices,
  activeMatrixTab,
  jsonData
}) {
  return (
    <div className="w-4/5 flex flex-col overflow-hidden">
      <TabsContent value="visualizations" className="flex-1 m-0 relative h-full">
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
          matrices={matrices}
          activeMatrixTab={activeMatrixTab}
          onNodeSelect={onNodeSelect}
          perspective={perspective}
          zoomLevel={zoomLevel}
          jsonData={jsonData}
        />
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