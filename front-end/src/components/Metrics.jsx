import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const MetricsDisplay = () => {
  const [metrics, setMetrics] = useState({});
  const [matrices, setMatrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState(null);
  
  const apiBaseUrl = "http://localhost:8080/api"; // Adjust this to your API's base URL

  // Function to fetch metrics data
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${apiBaseUrl}/metrics`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
      
      // Also trigger metrics calculation
      await fetch(`${apiBaseUrl}/calculate`, {
        method: 'POST'
      });
      
      // Now fetch matrices if any are stored
      try {
        // This is a placeholder since we don't have a specific endpoint to get all matrices
        // You might need to adjust based on your actual API structure
        const matrixResponse = await fetch(`${apiBaseUrl}/metrics`);
        if (matrixResponse.ok) {
          const matrixData = await matrixResponse.json();
          // Extract matrix data if it exists in the response
          if (matrixData && matrixData.matrices) {
            setMatrices(matrixData.matrices);
            if (Object.keys(matrixData.matrices).length > 0) {
              setActiveMatrixTab(Object.keys(matrixData.matrices)[0]);
            }
          }
        }
      } catch (matrixError) {
        console.error("Error fetching matrices:", matrixError);
        // Don't set the main error state, just log it
      }
      
    } catch (err) {
      setError(err.message);
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics on initial load
  useEffect(() => {
    fetchMetrics();
  }, []);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchMetrics();
  };

  // Check if we have any metrics data
  const hasMetricsData = Object.keys(metrics).length > 0;
  
  // Check if we have any matrix data
  const hasMatrixData = Object.keys(matrices).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Software Metrics Analysis</h2>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          className="flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Metrics
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && <p className="text-muted-foreground">Loading metrics data...</p>}

      {!loading && !error && !hasMetricsData && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No metrics data available. Upload an XMI file and click "Refresh Metrics" to calculate metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {hasMetricsData && (
        <Card>
          <CardHeader>
            <CardTitle>Element Metrics</CardTitle>
            <CardDescription>
              Calculated metrics for each element in the model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Element</TableHead>
                    {Object.keys(metrics).length > 0 && 
                      Object.values(metrics)[0] && 
                      Object.keys(Object.values(metrics)[0]).map((metricName) => (
                        <TableHead key={metricName}>{metricName}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(metrics).map(([elementName, elementMetrics]) => (
                    <TableRow key={elementName}>
                      <TableCell className="font-medium">{elementName}</TableCell>
                      {Object.values(elementMetrics).map((value, index) => (
                        <TableCell key={index}>{value.toString()}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasMatrixData && (
        <Card>
          <CardHeader>
            <CardTitle>Dependency Matrices</CardTitle>
            <CardDescription>
              Relationship matrices between model elements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeMatrixTab} onValueChange={setActiveMatrixTab}>
              <TabsList className="mb-4">
                {Object.keys(matrices).map((matrixName) => (
                  <TabsTrigger key={matrixName} value={matrixName}>
                    {matrixName}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {Object.entries(matrices).map(([matrixName, matrixData]) => (
                <TabsContent key={matrixName} value={matrixName}>
                  {matrixData && matrixData.columns && matrixData.rows ? (
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[150px]">Element</TableHead>
                            {matrixData.columns.map((col) => (
                              <TableHead key={col}>{col}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(matrixData.rows).map(([rowName, values]) => (
                            <TableRow key={rowName}>
                              <TableCell className="font-medium">{rowName}</TableCell>
                              {values.map((value, colIndex) => (
                                <TableCell key={colIndex}>
                                  {value > 0 ? value : "-"}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Matrix data format is invalid</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MetricsDisplay;