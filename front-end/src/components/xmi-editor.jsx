// XMIEditor.js
"use client"
import { useState, useEffect, useRef } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditorHeader } from "./Header"
import { EditorPanel } from "./EditorPanel"
import { GraphPanel } from "./GraphPanel"
import { EditorFooter } from "./Footer"
import apiService from "@/services/apiService"

// Sample data for demonstration
const sampleNodes = [
  { id: "student", label: "Student", category: "Entity" },
  { id: "person", label: "Person", category: "Entity" },
  { id: "course", label: "Course", category: "Entity" },
  { id: "enrollment", label: "Enrollment", category: "Association" },
  { id: "department", label: "Department", category: "Entity" },
  { id: "faculty", label: "Faculty", category: "Entity" },
  { id: "address", label: "Address", category: "Value Object" },
  { id: "grade", label: "Grade", category: "Value Object" },
]

const sampleEdges = [
  { source: "student", target: "person", type: "inheritance" },
  { source: "student", target: "enrollment", type: "association" },
  { source: "enrollment", target: "course", type: "association" },
  { source: "course", target: "department", type: "dependency" },
  { source: "faculty", target: "person", type: "inheritance" },
  { source: "faculty", target: "department", type: "association" },
  { source: "person", target: "address", type: "association" },
  { source: "enrollment", target: "grade", type: "dependency" },
]

// Sample XMI data
const sampleXMI = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmlns:xmi="http://www.omg.org/XMI" xmlns:uml="http://www.eclipse.org/uml2/5.0.0/UML">
  <uml:Model xmi:id="_root" name="SampleModel">
    <packagedElement xmi:type="uml:Class" xmi:id="_class1" name="User">
      <ownedAttribute xmi:id="_attr1" name="id" type="Integer"/>
      <ownedAttribute xmi:id="_attr2" name="name" type="String"/>
      <ownedOperation xmi:id="_op1" name="login"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="_class2" name="Account">
      <ownedAttribute xmi:id="_attr3" name="accountId" type="Integer"/>
      <ownedAttribute xmi:id="_attr4" name="balance" type="Double"/>
      <ownedOperation xmi:id="_op2" name="withdraw"/>
      <ownedOperation xmi:id="_op3" name="deposit"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Association" xmi:id="_assoc1">
      <memberEnd xmi:idref="_end1"/>
      <memberEnd xmi:idref="_end2"/>
      <ownedEnd xmi:id="_end1" type="_class1" association="_assoc1"/>
      <ownedEnd xmi:id="_end2" type="_class2" association="_assoc1"/>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`

export default function XMIEditor({
  // props
  xmiContent,
  fileName,
}) {

  console.log("XMIEditor: ", xmiContent, fileName)
  // const [xmiCode, setXmiCode] = useState(xmiContent)
  const [zoom, setZoom] = useState(1)
  // const [elements, setElements] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  // const [fileName, setFileName] = useState(fileName)
  // const [diagramUpdating, setDiagramUpdating] = useState(false)
  // const fileInputRef = useRef(null)

  // Fetch the latest XMI content on component mount
  // useEffect(() => {
  //   fetchLatestXMI()
  //   fetchAllElements()
  // }, [])

  // const fetchLatestXMI = async () => {
  //   setLoading(true)
  //   setError(null)
  //   try {
  //     const response = await apiService.getLatestXMI()
  //     if (response && response.xmiContent) {
  //       setXmiCode(response.xmiContent)
  //     }
  //   } catch (err) {
  //     console.error("Error fetching XMI content:", err)
  //     // Don't set error state here, as there might not be any XMI content yet
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // const fetchAllElements = async () => {
  //   setDiagramUpdating(true)
  //   try {
  //     const elementsData = await apiService.getAllElements()
  //     if (elementsData) {
  //       setElements(elementsData)
  //       // If we want to update the graph based on the elements
  //       // We could process the elements here and update the graph state
  //     }
  //   } catch (err) {
  //     console.error("Error fetching diagram elements:", err)
  //     setError("Failed to load diagram elements")
  //   } finally {
  //     setDiagramUpdating(false)
  //   }
  // }

  // const updateDiagram = async () => {
  //   setDiagramUpdating(true)
  //   setError(null)
  //   try {
  //     // First, save the current XMI content
  //     await apiService.updateXMI(xmiCode)
      
  //     // Then, calculate metrics (if needed)
  //     await apiService.calculateMetrics()
      
  //     // Finally, fetch the updated elements
  //     await fetchAllElements()
      
  //     setSuccess("Diagram updated successfully")
  //   } catch (err) {
  //     console.error("Error updating diagram:", err)
  //     setError(`Failed to update diagram: ${err.message}`)
  //   } finally {
  //     setDiagramUpdating(false)
  //   }
  // }

  // Parse XMI when code changes
  // useEffect(() => {
  //   try {
  //     const parsedGraph = parseXMI(xmiCode)
  //     setGraph(parsedGraph)
  //   } catch (error) {
  //     console.error("Error parsing XMI:", error)
  //   }
  // }, [xmiCode])

  // const handleCodeChange = (e) => {
  //   const newCode = e.target.value
  //   setXmiCode(newCode)
  //   setSuccess(null)
  // }

  // File upload handler
  // const handleFileUpload = (e) => {
  //   const file = e.target.files[0]
  //   if (!file) return

  //   setFileName(file.name)
  //   const reader = new FileReader()

  //   reader.onload = async (event) => {
  //     const content = event.target.result
  //     setXmiCode(content)
  //     setSuccess(null)
  //   }

  //   reader.onerror = () => {
  //     setError("Failed to read the file")
  //   }

  //   reader.readAsText(file)
  // }

  // const triggerFileUpload = () => {
  //   if (fileInputRef.current) {
  //     fileInputRef.current.click()
  //   } else {
  //     console.error("File input ref is not assigned")
  //     setError("File upload is not available. Please try again.")
  //   }
  // }

  // const handleSave = async () => {
  //   if (!xmiCode) {
  //     setError("No XMI content to save")
  //     return
  //   }
    
  //   setLoading(true)
  //   setError(null)
  //   setSuccess(null)
    
  //   try {
  //     await apiService.uploadXMI(xmiCode, fileName)
  //     setSuccess("XMI content saved successfully")
  //   } catch (err) {
  //     setError(`Save failed: ${err.message}`)
  //     console.error("Error saving XMI:", err)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // const handleDownload = () => {
  //   const blob = new Blob([xmiCode], { type: "application/xml" })
  //   const url = URL.createObjectURL(blob)
  //   const a = document.createElement("a")
  //   a.href = url
  //   a.download = fileName
  //   document.body.appendChild(a)
  //   a.click()
  //   document.body.removeChild(a)
  //   URL.revokeObjectURL(url)
  // }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5))
  }

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

      {/* <div className="flex justify-end p-2 bg-gray-50 border-b">
        <Button 
          onClick={updateDiagram} 
          disabled={diagramUpdating}
          className="mr-2"
        >
          {diagramUpdating ? "Updating..." : "Update Diagram"}
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={loading}
          variant="outline" 
          className="mr-2"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
        <Button 
          onClick={handleDownload} 
          variant="outline"
        >
          Download
        </Button>
      </div> */}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <EditorPanel
            fileName={fileName}
            xmiCode={xmiContent}
            // onCodeChange={handleCodeChange}
            // onFileUpload={triggerFileUpload}
            // fileInputRef={fileInputRef}
            // handleFileUpload={handleFileUpload}
            // loading={loading}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <GraphPanel
            // graph={graph}
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            nodes={sampleNodes}
            edges={sampleEdges}
            // loading={loading || diagramUpdating}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EditorFooter 
        fileName={fileName}
      />
    </div>
  )
}