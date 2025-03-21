"use client";
import { useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorPanel } from "./EditorPanel";
import { GraphPanel } from "./GraphPanel";
import { EditorFooter } from "./Footer";
import apiService from "@/services/apiService";
import { fileOps } from "@/services/apiService";

export default function XMIEditor({ xmiContent, filePath, setXmiContent }) {
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSave = async () => {
    if (!filePath || !xmiContent) {
      setError("No file path or content to save");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await fileOps.writeXMIFile(filePath, xmiContent);
      const response = await apiService.processXMI(filePath);
      setSuccess("XMI saved and processed successfully");
    } catch (err) {
      setError(`Save failed: ${err.message}`);
      console.error("Error saving XMI:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e) => {
    setXmiContent(e.target.value);
    setSuccess(null);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));

  return (
    <div className="flex flex-col h-screen">
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="m-2 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end p-2 bg-gray-50 border-b">
        <Button onClick={handleSave} disabled={loading} variant="outline" className="mr-2">
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <EditorPanel fileName={filePath.split('/').pop()} xmiCode={xmiContent} onCodeChange={handleCodeChange} />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <GraphPanel zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
        </ResizablePanel>
      </ResizablePanelGroup>
      <EditorFooter fileName={filePath.split('/').pop()} />
    </div>
  );
}