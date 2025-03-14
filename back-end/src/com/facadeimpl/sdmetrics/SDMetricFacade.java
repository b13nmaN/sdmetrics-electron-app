package com.facadeimpl.sdmetrics;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Collection;
import java.util.Set;
import java.util.HashSet;
import com.sdmetrics.model.MetaModel;
import com.sdmetrics.model.Model;
import com.sdmetrics.model.ModelElement;
import com.sdmetrics.model.XMIReader;
import com.sdmetrics.model.XMITransformations;
import com.sdmetrics.util.XMLParser;
import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.metrics.Metric;
import com.sdmetrics.metrics.Matrix;
import com.sdmetrics.metrics.MatrixData;
import com.sdmetrics.metrics.MatrixEngine;

public class SDMetricFacade {
    private MetaModel metaModel;
    private Model model;
    private MetricStore metricStore;
    private MetricsEngine metricsEngine;

    // Set of coupling and cohesion metric names to include
    private static final Set<String> METRICS_TO_INCLUDE = new HashSet<>();
    private static final Set<String> MATRICES_TO_INCLUDE = new HashSet<>();

    static {
        // Coupling Metrics
        METRICS_TO_INCLUDE.add("Dep_Out");
        METRICS_TO_INCLUDE.add("Dep_In");
        METRICS_TO_INCLUDE.add("NumAssEl_ssc");
        METRICS_TO_INCLUDE.add("NumAssEl_sb");
        METRICS_TO_INCLUDE.add("NumAssEl_nsb");
        METRICS_TO_INCLUDE.add("EC_Attr");
        METRICS_TO_INCLUDE.add("IC_Attr");
        METRICS_TO_INCLUDE.add("EC_Par");
        METRICS_TO_INCLUDE.add("IC_Par");
        METRICS_TO_INCLUDE.add("Assoc");
        METRICS_TO_INCLUDE.add("Ca");
        METRICS_TO_INCLUDE.add("Ce");
        METRICS_TO_INCLUDE.add("DepPack");
        METRICS_TO_INCLUDE.add("MsgSent");
        METRICS_TO_INCLUDE.add("MsgRecv");
        METRICS_TO_INCLUDE.add("Assoc_Out");
        METRICS_TO_INCLUDE.add("Assoc_In");
        METRICS_TO_INCLUDE.add("MsgSent_Outside");
        METRICS_TO_INCLUDE.add("MsgRecv_Outside");

        // Cohesion Metrics
        METRICS_TO_INCLUDE.add("LCOM1");
        METRICS_TO_INCLUDE.add("TCC");
        METRICS_TO_INCLUDE.add("AUC");
        METRICS_TO_INCLUDE.add("PCI");

        // Leave MATRICES_TO_INCLUDE empty to process all matrices
    }

    public SDMetricFacade(String metaModelURL, String xmiTransURL, String xmiFile, String metricsURL) throws Exception {
        XMLParser parser = new XMLParser();

        // Parse the metamodel
        metaModel = new MetaModel();
        parser.parse(metaModelURL, metaModel.getSAXParserHandler());

        // Parse the XMI transformations
        XMITransformations trans = new XMITransformations(metaModel);
        parser.parse(xmiTransURL, trans.getSAXParserHandler());

        // Parse the UML model (XMI file)
        model = new Model(metaModel);
        XMIReader xmiReader = new XMIReader(trans, model);
        parser.parse(xmiFile, xmiReader);

        // Create and load the MetricStore with metric definitions
        metricStore = new MetricStore(metaModel);
        parser.parse(metricsURL, metricStore.getSAXParserHandler());
        metricsEngine = new MetricsEngine(metricStore, model);
    }

    public void calculateAndExportMetricsToCSV(String scalarOutputFile) throws IOException {
        // Export scalar metrics to CSV
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(scalarOutputFile))) {
            // Write header
            StringBuilder header = new StringBuilder("Element");
            for (String metricName : METRICS_TO_INCLUDE) {
                header.append(",").append(metricName);
            }
            writer.write(header.toString());
            writer.newLine();

            // Write data for each element
            for (ModelElement element : model) {
                StringBuilder row = new StringBuilder(element.getFullName());
                Collection<Metric> metrics = metricStore.getMetrics(element.getType());
                for (String metricName : METRICS_TO_INCLUDE) {
                    Object metricValue = null;
                    for (Metric metric : metrics) {
                        if (!metric.isInternal() && metric.getName().equals(metricName)) {
                            metricValue = metricsEngine.getMetricValue(element, metric);
                            break;
                        }
                    }
                    row.append(",").append(metricValue != null ? metricValue.toString() : "N/A");
                }
                writer.write(row.toString());
                writer.newLine();
            }
        }

        // Export matrices to separate CSV files
        calculateAndExportMatricesToCSV();
    }

    public void calculateAndExportMatricesToCSV() throws IOException {
        MatrixEngine matrixEngine = new MatrixEngine(metricsEngine);
        Collection<Matrix> matrices = metricStore.getMatrices();

        for (Matrix matrix : matrices) {
            if (MATRICES_TO_INCLUDE.isEmpty() || MATRICES_TO_INCLUDE.contains(matrix.getName())) {
                try {
                    MatrixData matrixData = matrixEngine.calculate(matrix);
                    exportMatrixToCSV(matrixData);
                } catch (Exception e) {
                    System.err.println("Error calculating matrix " + matrix.getName() + ": " + e.getMessage());
                }
            }
        }
    }

    private void exportMatrixToCSV(MatrixData matrixData) throws IOException {
        if (matrixData.isEmpty()) {
            System.out.println("Matrix " + matrixData.getMatrixDefinition().getName() + " is empty. Skipping CSV export.");
            return;
        }

        String fileName = matrixData.getMatrixDefinition().getName() + ".csv";
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(fileName))) {
            // Write column headers
            StringBuilder header = new StringBuilder(",");
            for (int col = 0; col < matrixData.getNumberOfColumns(); col++) {
                header.append(matrixData.getColumnElement(col).getName()).append(",");
            }
            writer.write(header.toString());
            writer.newLine();

            // Write rows with values
            for (int row = 0; row < matrixData.getNumberOfRows(); row++) {
                StringBuilder rowData = new StringBuilder(matrixData.getRowElement(row).getName() + ",");
                for (int col = 0; col < matrixData.getNumberOfColumns(); col++) {
                    Integer value = matrixData.getValueAt(row, col);
                    rowData.append(value != null ? value : 0).append(",");
                }
                writer.write(rowData.toString());
                writer.newLine();
            }
            System.out.println("Exported matrix to " + fileName);
        }
    }

    // Main method for testing (adjust paths as needed)
    public static void main(String[] args) {
        try {
            SDMetricFacade facade = new SDMetricFacade(
                "path/to/metamodel.xml",
                "path/to/xmi_transformations.xml",
                "path/to/university_uml.xmi",
                "path/to/metrics.xml"
            );
            facade.calculateAndExportMetricsToCSV("metrics_output.csv");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}