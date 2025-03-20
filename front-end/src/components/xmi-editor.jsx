// XMIEditor.js
"use client"
import { useState, useEffect, useRef } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { EditorHeader } from "./Header"
import { EditorPanel } from "./EditorPanel"
import { GraphPanel } from "./GraphPanel"
import { EditorFooter } from "./Footer"



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

// Simple XMI parser (this would be more complex in a real implementation)
const parseXMI = (xmiString) => {
  // This is a simplified parser for demonstration
  // A real implementation would use a proper XML parser and traverse the DOM

  const classes = []
  const relationships = []

  // Extract class names with regex (simplified)
  const classRegex = /<uml:Class.*?xmi:id="(.*?)".*?name="(.*?)"/g
  let match

  while ((match = classRegex.exec(xmiString)) !== null) {
    classes.push({
      id: match[1],
      name: match[2],
      x: Math.random() * 400 + 50,
      y: Math.random() * 200 + 50,
    })
  }
}


export default function XMIEditor() {
  const [xmiCode, setXmiCode] = useState(sampleXMI)
  const [graph, setGraph] = useState({ classes: [], relationships: [] })
  const [zoom, setZoom] = useState(1)
  const [elements, setElements] = useState([])
  const [ws, setWs] = useState(null)
  const [error, setError] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [fileName, setFileName] = useState("model.xmi")
  const [isServerMode, setIsServerMode] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const fileInputRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

 // WebSocket setup with reconnection logic
 const setupWebSocket = () => {
  if (!isServerMode) return null

  setIsReconnecting(true)

  try {
    const websocket = new WebSocket("ws://localhost:8080/metrics")

    websocket.onopen = () => {
      console.log("Connected to WebSocket server")
      setIsConnected(true)
      setError(null)
      setIsReconnecting(false)
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.elements && data.xmiContent) {
          setElements(data.elements)
          setXmiCode(data.xmiContent)
          setError(null)
        } else if (data.type === "error") {
          setError(data.message)
        } else if (data.type === "metrics") {
          // Handle metrics updates if needed
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err)
        setError("Failed to parse server response. Using local mode.")
      }
    }

    websocket.onerror = (err) => {
      console.error("WebSocket error:", err)
      setError("Cannot connect to server. Using local mode.")
      setIsConnected(false)
      setIsServerMode(false)
      setIsReconnecting(false)
    }

    websocket.onclose = (event) => {
      console.log("WebSocket connection closed", event)
      setIsConnected(false)
      setIsReconnecting(false)

      // Only attempt to reconnect if we're still in server mode
      if (isServerMode && !event.wasClean) {
        // Clear any existing timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }

        // Set a timeout to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isServerMode) {
            console.log("Attempting to reconnect...")
            setupWebSocket()
          }
        }, 5000) // Try to reconnect after 5 seconds
      }
    }

    setWs(websocket)
    return websocket
  } catch (err) {
    console.error("Failed to establish WebSocket connection:", err)
    setError("Failed to connect to server. Using local mode.")
    setIsConnected(false)
    setIsServerMode(false)
    setIsReconnecting(false)
    return null
  }
}

// Initialize WebSocket connection
useEffect(() => {
  const websocket = setupWebSocket()

  // Cleanup function
  return () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.close()
    }
  }
}, [isServerMode])

// Parse XMI when code changes
useEffect(() => {
  try {
    const parsedGraph = parseXMI(xmiCode)
    setGraph(parsedGraph)
  } catch (error) {
    console.error("Error parsing XMI:", error)
  }
}, [xmiCode])

const handleCodeChange = (e) => {
  const newCode = e.target.value
  setXmiCode(newCode)

  // If connected to WebSocket, send the updated code
  if (isServerMode && ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(
        JSON.stringify({
          type: "update_xmi",
          content: newCode,
          fileName: fileName,
        }),
      )
    } catch (err) {
      console.error("Error sending data to server:", err)
    }
  }
}

// File upload handler
const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return

  setFileName(file.name)
  const reader = new FileReader()

  reader.onload = (event) => {
    const content = event.target.result
    setXmiCode(content)

    // If connected to WebSocket, send the file content
    if (isServerMode && ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: "upload_xmi",
            content: content,
            fileName: file.name,
          }),
        )
      } catch (err) {
        console.error("Error sending file to server:", err)
      }
    }
  }

  reader.onerror = () => {
    setError("Failed to read the file")
  }

  reader.readAsText(file)
}

// Removed duplicate handleFileUpload function definition.

const triggerFileUpload = () => {
  if (fileInputRef.current) {
    fileInputRef.current.click()
  } else {
    console.error("File input ref is not assigned")
    setError("File upload is not available. Please try again.")
  }
}

const handleZoomIn = () => {
  setZoom((prev) => Math.min(prev + 0.1, 2))
}

const handleZoomOut = () => {
  setZoom((prev) => Math.max(prev - 0.1, 0.5))
}

const handleSave = () => {
  const blob = new Blob([xmiCode], { type: "application/xml" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const toggleServerMode = () => {
  const newMode = !isServerMode
  setIsServerMode(newMode)

  if (newMode) {
    // If switching to server mode, try to connect
    setupWebSocket()
  } else {
    // If switching to local mode, close any existing connection
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close()
    }
    setIsConnected(false)
    setError(null)
  }
}

const handleReconnect = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close()
  }
  setupWebSocket()
}


  return (
    <div className="flex flex-col h-screen"> 
        {/* <EditorHeader
        fileName={fileName}
        isServerMode={isServerMode}
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        onFileUpload={triggerFileUpload}
        onSave={handleSave}
        onModeToggle={toggleServerMode}
        onReconnect={handleReconnect}
        fileInputRef={fileInputRef}
      /> */}
      {/* {error && (
        <Alert variant="destructive" className="m-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )} */}

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={50} minSize={30}>
          <EditorPanel
            fileName={fileName}
            xmiCode={xmiCode}
            onCodeChange={handleCodeChange}
            onFileUpload={triggerFileUpload}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <GraphPanel
            graph={graph}
            zoom={zoom}
            isServerMode={isServerMode}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            nodes={sampleNodes}
            edges={sampleEdges}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EditorFooter isServerMode={isServerMode} isConnected={isConnected} />
    </div>
  )
}