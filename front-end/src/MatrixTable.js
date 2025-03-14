import React from "react";

const MatrixTable = ({ matrix }) => {
  if (!matrix.columns || !matrix.rows) return <p>No matrix data available</p>;

  return (
    <table border="1">
      <thead>
        <tr>
          <th></th>
          {matrix.columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.entries(matrix.rows).map(([rowName, values]) => (
          <tr key={rowName}>
            <td>{rowName}</td>
            {values.map((value, idx) => (
              <td key={idx}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default MatrixTable;