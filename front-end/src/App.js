import React, { useState, useEffect, useRef } from "react";
import MetricsTable from "./MetricsTable";
import MatrixTable from "./MatrixTable";
import "./styles.css";

const App = () => {
  const [metrics, setMetrics] = useState({});
  const [matrices, setMatrices] = useState({});
  const wsRef = useRef(null); // Store WebSocket instance

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/metrics");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "metrics") {
        setMetrics(message.data);
      } else if (message.type === "matrix") {
        setMatrices((prev) => ({
          ...prev,
          [message.matrixName]: message.data,
        }));
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleCalculateMetrics = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send("calculate_metrics");
      console.log("Requested metrics calculation");
    } else {
      console.error("WebSocket is not connected");
    }
  };

  return (
    <div className="App">
      <h1>SDMetrics Results</h1>
      <button onClick={handleCalculateMetrics}>Calculate Metrics</button>
      <h2>Scalar Metrics</h2>
      <MetricsTable metrics={metrics} />
      <h2>Matrices</h2>
      {Object.keys(matrices).map((matrixName) => (
        <div key={matrixName}>
          <h3>{matrixName}</h3>
          <MatrixTable matrix={matrices[matrixName]} />
        </div>
      ))}
    </div>
  );
};

export default App;