import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Code, Table as TableIcon, TrendingUp, Loader2 } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"; // Fixed import
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import apiService from "@/services/apiService";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28"];

// Helper function to get color for heatmap cell (Light mode)
const getHeatmapColor = (value, maxValue) => {
  if (value <= 0 || maxValue === 0) return "bg-gray-100 text-gray-500"; // For 0 or '-'
  const intensity = Math.min(Math.max(value / maxValue, 0.1), 1); // Ensure intensity is between 0.1 and 1
  
  // Using a blue scale for light mode
  if (intensity < 0.2) return "bg-blue-100 text-blue-700";
  if (intensity < 0.4) return "bg-blue-200 text-blue-800";
  if (intensity < 0.6) return "bg-blue-300 text-blue-900";
  if (intensity < 0.8) return "bg-blue-400 text-white";
  return "bg-blue-500 text-white";
};


const MetricsDisplay = () => {
  const [metrics, setMetrics] = useState({});
  const [matrices, setMatrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matrixViewMode, setMatrixViewMode] = useState("heatmap"); // 'heatmap' or 'json'
  const [selectedMetricKey, setSelectedMetricKey] = useState(null);

  const fetchMetricsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getInitialData();
      if (data.metrics) {
        setMetrics(data.metrics);
        // Set initial selected metric for the chart
        const firstElementMetrics = Object.values(data.metrics)[0];
        if (firstElementMetrics && Object.keys(firstElementMetrics).length > 0) {
          setSelectedMetricKey(Object.keys(firstElementMetrics)[0]);
        }
      }
      if (data.matrices) {
        setMatrices(data.matrices);
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
      await apiService.calculateMetrics(); // This might take time
      const data = await apiService.getInitialData(); // Fetch fresh data
      if (data.metrics) {
        setMetrics(data.metrics);
        const firstElementMetrics = Object.values(data.metrics)[0];
         if (firstElementMetrics && Object.keys(firstElementMetrics).length > 0) {
          // If no metric is selected or selected is no longer valid, pick the first one
          const currentMetricKeys = Object.keys(firstElementMetrics);
          if (!selectedMetricKey || !currentMetricKeys.includes(selectedMetricKey)) {
            setSelectedMetricKey(currentMetricKeys[0]);
          }
        } else {
          setSelectedMetricKey(null);
        }
      }
      if (data.matrices) {
        setMatrices(data.matrices);
      }
    } catch (err) {
      setError(err.message);
      console.error("Error refreshing metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricsData();
  }, []);

  const metricKeys = useMemo(() => {
    if (!metrics || Object.keys(metrics).length === 0) return [];
    const allKeys = new Set();
    Object.values(metrics).forEach(elementMetrics => {
      Object.keys(elementMetrics).forEach(key => allKeys.add(key));
    });
    return Array.from(allKeys);
  }, [metrics]);

  const chartData = useMemo(() => {
    if (!selectedMetricKey || Object.keys(metrics).length === 0) return [];
    return Object.entries(metrics).map(([elementName, elementMetrics]) => ({
      name: elementName,
      [selectedMetricKey]: elementMetrics[selectedMetricKey] || 0,
    })).sort((a, b) => b[selectedMetricKey] - a[selectedMetricKey]); // Sort descending
  }, [metrics, selectedMetricKey]);

  const hasMetricsData = Object.keys(metrics).length > 0 && metricKeys.length > 0;
  const hasMatrixData = Object.keys(matrices).length > 0;

  // Calculate max value for each matrix for heatmap normalization
  const matrixMaxValues = useMemo(() => {
    const maxVals = {};
    Object.entries(matrices).forEach(([matrixName, matrixData]) => {
      if (matrixData && matrixData.rows) {
        let currentMax = 0;
        Object.values(matrixData.rows).forEach(rowValues => {
          rowValues.forEach(val => {
            if (val > currentMax) currentMax = val;
          });
        });
        maxVals[matrixName] = currentMax;
      } else {
        maxVals[matrixName] = 0;
      }
    });
    return maxVals;
  }, [matrices]);

  const cardAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  return (
    <motion.div 
      className="flex flex-col h-full p-4 md:p-6 space-y-6 bg-gray-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-center py-4 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 sm:mb-0">Software Metrics Dashboard</h1>
        <Button onClick={handleRefresh} variant="outline" className="flex items-center gap-2" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh Metrics
        </Button>
      </div>
      
      <AnimatePresence>
        {error && (
          <motion.div {...cardAnimation}>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      {loading && !hasMetricsData && !hasMatrixData && (
        <div className="flex flex-col items-center justify-center flex-grow h-64">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground mt-4 text-lg">Loading metrics data...</p>
        </div>
      )}
      
      <div className="space-y-8 overflow-auto">
        {!loading && !error && !hasMetricsData && !hasMatrixData && (
          <motion.div {...cardAnimation}>
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground text-lg">
                  No metrics data available. Please upload an XMI file and click "Refresh Metrics".
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {hasMetricsData && (
          <motion.div {...cardAnimation}>
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <CardTitle className="text-2xl text-gray-700">Element Metrics</CardTitle>
                    <CardDescription>Visualize specific metrics across all elements</CardDescription>
                  </div>
                  {metricKeys.length > 0 && (
                    <div className="mt-4 sm:mt-0 w-full sm:w-auto max-w-xs">
                      <Select value={selectedMetricKey} onValueChange={setSelectedMetricKey}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a metric" />
                        </SelectTrigger>
                        <SelectContent>
                          {metricKeys.map(key => (
                            <SelectItem key={key} value={key} className="hover:bg-gray-100">
                              {key}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedMetricKey && chartData.length > 0 ? (
                  <div style={{ width: '100%', height: 300 + chartData.length * 10 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 50, bottom: 5 }} 
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#4A5568" />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={150} 
                            tick={{ fontSize: 12, fill: '#4A5568' }}
                            interval={0} 
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '0.375rem',
                            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)'
                          }}
                          labelStyle={{ color: '#1e293b', fontWeight: '600' }} 
                          itemStyle={{ color: '#334155' }}
                        />
                        <Legend wrapperStyle={{ color: '#4A5568' }} />
                        <Bar dataKey={selectedMetricKey} fill={COLORS[0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">
                    {chartData.length === 0 && selectedMetricKey ? `No data available for metric: ${selectedMetricKey}.` : "Select a metric to display the chart."}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        
        {hasMatrixData && (
          <motion.div {...cardAnimation}>
            <Card className="shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-700">Dependency Matrices</CardTitle>
                  <CardDescription>Relationship matrices between model elements</CardDescription>
                </div>
                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  <Button 
                    variant={matrixViewMode === "heatmap" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setMatrixViewMode("heatmap")}
                    className="flex items-center gap-1"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Heatmap
                  </Button>
                  <Button 
                    variant={matrixViewMode === "json" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setMatrixViewMode("json")}
                    className="flex items-center gap-1"
                  >
                    <Code className="h-4 w-4" />
                    JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <Tabs defaultValue={Object.keys(matrices)[0]} className="w-full">
                  <TabsList className="mb-4 grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.keys(matrices).map((matrixName) => (
                      <TabsTrigger 
                        key={matrixName} 
                        value={matrixName}
                      >
                        {matrixName}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <AnimatePresence mode="wait">
                    {Object.entries(matrices).map(([matrixName, matrixData]) => (
                      <TabsContent key={matrixName} value={matrixName} asChild>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          {matrixViewMode === "heatmap" ? (
                            matrixData && matrixData.columns && matrixData.rows ? (
                              <div className="overflow-x-auto rounded-md border border-gray-200">
                                <Table className="min-w-full">
                                  <TableHeader className="sticky top-0 bg-gray-100 z-10">
                                    <TableRow>
                                      <TableHead className="w-[150px] sticky left-0 bg-gray-100 z-20 shadow-sm whitespace-nowrap px-2 py-3 text-gray-600">Element</TableHead>
                                      {matrixData.columns.map((col) => (
                                        <TableHead key={col} className="whitespace-nowrap px-2 py-3 text-center text-gray-600">{col}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Object.entries(matrixData.rows).map(([rowName, values]) => (
                                      <TableRow key={rowName} className="border-gray-200">
                                        <TableCell className="font-medium sticky left-0 bg-white backdrop-blur-sm z-10 shadow-sm text-gray-700 whitespace-nowrap px-2 py-2">{rowName}</TableCell>
                                        {values.map((value, colIndex) => (
                                          <TableCell 
                                            key={colIndex} 
                                            className={`text-center px-2 py-2 ${getHeatmapColor(value, matrixMaxValues[matrixName])}`}
                                            title={`Value: ${value}`}
                                          >
                                            {value > 0 ? value : "-"}
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ) : (
                              <p className="text-muted-foreground">Matrix data format is invalid or empty.</p>
                            )
                          ) : (
                            <div className="overflow-auto max-h-[400px] bg-gray-100 p-4 rounded-md border border-gray-200">
                              <pre className="text-sm text-gray-800">
                                {JSON.stringify(matrixData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </motion.div>
                      </TabsContent>
                    ))}
                  </AnimatePresence>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MetricsDisplay;