import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import apiService from "@/services/apiService";

const MetricsDisplay = () => {
  const [metrics, setMetrics] = useState({});
  const [matrices, setMatrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMatrixTab, setActiveMatrixTab] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getInitialData(); // Use getInitialData for consistency
      if (data.metrics) setMetrics(data.metrics);
      if (data.matrices) {
        setMatrices(data.matrices);
        if (Object.keys(data.matrices).length > 0) setActiveMatrixTab(Object.keys(data.matrices)[0]);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiService.calculateMetrics();
      const data = await apiService.getInitialData();
      if (data.metrics) setMetrics(data.metrics);
      if (data.matrices) {
        setMatrices(data.matrices);
        if (Object.keys(data.matrices).length > 0) setActiveMatrixTab(Object.keys(data.matrices)[0]);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error refreshing metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const hasMetricsData = Object.keys(metrics).length > 0;
  const hasMatrixData = Object.keys(matrices).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Software Metrics Analysis</h2>
        <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2" disabled={loading}>
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
            <CardDescription>Calculated metrics for each element in the model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Element</TableHead>
                    {Object.values(metrics)[0] &&
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
            <CardDescription>Relationship matrices between model elements</CardDescription>
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
                                <TableCell key={colIndex}>{value > 0 ? value : "-"}</TableCell>
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