import React from "react";

const MetricsTable = ({ metrics }) => {
  if (Object.keys(metrics).length === 0) return <p>No metrics data available</p>;

  const metricNames = Object.keys(Object.values(metrics)[0] || {});
  return (
    <table border="1">
      <thead>
        <tr>
          <th>Element</th>
          {metricNames.map((name) => (
            <th key={name}>{name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(metrics).map(([element, values]) => (
          <tr key={element}>
            <td>{element}</td>
            {metricNames.map((name) => (
              <td key={name}>{values[name]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MetricsTable;