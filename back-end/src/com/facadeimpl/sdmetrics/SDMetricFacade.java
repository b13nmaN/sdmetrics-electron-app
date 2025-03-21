package com.facadeimpl.sdmetrics;

import com.sdmetrics.model.Model;
import com.sdmetrics.model.ModelElement;
import com.sdmetrics.metrics.Metric;
import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.metrics.Matrix;
import com.sdmetrics.metrics.MatrixData;
import com.sdmetrics.metrics.MatrixEngine;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

public class SDMetricFacade {
    private Model model;
    private MetricStore metricStore;
    private MetricsEngine metricsEngine;
    private final SDMetricsParser sdMetricsParser;
    private MetricsServer metricsServer;
    private String lastFilePath; // Track last used file path
    
    private static final String LAST_PATH_FILE = "last_path.txt"; // File to store lastFilePath
    private static final Set<String> METRICS_TO_INCLUDE = new HashSet<>();
    private static final Set<String> MATRICES_TO_INCLUDE = new HashSet<>();

    static {
        METRICS_TO_INCLUDE.add("Dep_Out"); METRICS_TO_INCLUDE.add("Dep_In");
        METRICS_TO_INCLUDE.add("NumAssEl_ssc"); METRICS_TO_INCLUDE.add("NumAssEl_sb");
        METRICS_TO_INCLUDE.add("NumAssEl_nsb"); METRICS_TO_INCLUDE.add("EC_Attr");
        METRICS_TO_INCLUDE.add("IC_Attr"); METRICS_TO_INCLUDE.add("EC_Par");
        METRICS_TO_INCLUDE.add("IC_Par"); METRICS_TO_INCLUDE.add("Assoc");
        METRICS_TO_INCLUDE.add("Ca"); METRICS_TO_INCLUDE.add("Ce");
        METRICS_TO_INCLUDE.add("DepPack"); METRICS_TO_INCLUDE.add("MsgSent");
        METRICS_TO_INCLUDE.add("MsgRecv"); METRICS_TO_INCLUDE.add("Assoc_Out");
        METRICS_TO_INCLUDE.add("Assoc_In"); METRICS_TO_INCLUDE.add("MsgSent_Outside");
        METRICS_TO_INCLUDE.add("MsgRecv_Outside"); METRICS_TO_INCLUDE.add("LCOM1");
        METRICS_TO_INCLUDE.add("TCC"); METRICS_TO_INCLUDE.add("AUC");
        METRICS_TO_INCLUDE.add("PCI");
    }

    public SDMetricFacade(String metaModelURL, String xmiTransURL, String metricsURL, int httpPort) throws Exception {
        this.sdMetricsParser = new SDMetricsParser(metaModelURL, xmiTransURL, metricsURL); // No DiagramDAO
        // Load last file path from file
        this.lastFilePath = loadLastFilePath();
        
        // Start REST server using MetricsServer
        metricsServer = new MetricsServer(httpPort, this);
        metricsServer.start();
        System.out.println("REST server started on port: " + httpPort);
    }

    public void processXMI(String filepath) throws Exception {
        this.lastFilePath = filepath;
        saveLastFilePath(filepath); // Save to file
        
        // Read XMI content from the file path
        String xmiContent = new String(Files.readAllBytes(Paths.get(filepath)), StandardCharsets.UTF_8);
        String fileName = Paths.get(filepath).getFileName().toString();
        
        // Process the XMI content
        sdMetricsParser.parseXMI(xmiContent, fileName);
        calculateAndSendMetrics(); // Trigger metrics calculation after parsing
    }

    public String getLastFilePath() {
        return lastFilePath;
    }

    public void calculateAndSendMetrics() {
        Map<String, Map<String, Object>> metricsData = new HashMap<>();

        for (ModelElement element : model) {
            Map<String, Object> elementMetrics = new HashMap<>();
            Collection<Metric> metrics = metricStore.getMetrics(element.getType());
            for (Metric metric : metrics) {
                if (!metric.isInternal() && METRICS_TO_INCLUDE.contains(metric.getName())) {
                    Object metricValue = metricsEngine.getMetricValue(element, metric);
                    elementMetrics.put(metric.getName(), metricValue != null ? metricValue : "N/A");
                }
            }
            if (!elementMetrics.isEmpty()) {
                metricsData.put(element.getFullName(), elementMetrics);
            }
        }

        MetricsDataStore.setMetricsData(metricsData);
        calculateAndSendMatrices();
    }

    private void calculateAndSendMatrices() {
        MatrixEngine matrixEngine = new MatrixEngine(metricsEngine);
        Collection<Matrix> matrices = metricStore.getMatrices();

        for (Matrix matrix : matrices) {
            if (MATRICES_TO_INCLUDE.isEmpty() || MATRICES_TO_INCLUDE.contains(matrix.getName())) {
                try {
                    MatrixData matrixData = matrixEngine.calculate(matrix);
                    sendMatrix(matrixData);
                } catch (Exception e) {
                    System.err.println("Error calculating matrix " + matrix.getName() + ": " + e.getMessage());
                }
            }
        }
    }

    private void sendMatrix(MatrixData matrixData) {
        if (matrixData.isEmpty()) {
            System.out.println("Matrix " + matrixData.getMatrixDefinition().getName() + " is empty.");
            return;
        }

        Map<String, Object> matrixJson = new HashMap<>();
        String[] columns = new String[matrixData.getNumberOfColumns()];
        for (int col = 0; col < matrixData.getNumberOfColumns(); col++) {
            columns[col] = matrixData.getColumnElement(col).getName();
        }
        matrixJson.put("columns", columns);

        Map<String, int[]> rows = new HashMap<>();
        for (int row = 0; row < matrixData.getNumberOfRows(); row++) {
            int[] values = new int[matrixData.getNumberOfColumns()];
            for (int col = 0; col < matrixData.getNumberOfColumns(); col++) {
                Integer value = matrixData.getValueAt(row, col);
                values[col] = value != null ? value : 0;
            }
            rows.put(matrixData.getRowElement(row).getName(), values);
        }
        matrixJson.put("rows", rows);

        MetricsDataStore.setMatrixData(matrixData.getMatrixDefinition().getName(), matrixJson);
    }

    // Load last file path from last_path.txt
    private String loadLastFilePath() {
        try {
            return Files.readString(Paths.get(LAST_PATH_FILE), StandardCharsets.UTF_8).trim();
        } catch (IOException e) {
            System.out.println("No last_path.txt found or error reading it: " + e.getMessage());
            return null; // Return null if file doesn’t exist or can’t be read
        }
    }

    // Save last file path to last_path.txt
    private void saveLastFilePath(String filepath) {
        try {
            Files.writeString(Paths.get(LAST_PATH_FILE), filepath, StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.err.println("Error writing to last_path.txt: " + e.getMessage());
        }
    }

    public void stopServer() throws Exception {
        if (metricsServer != null) {
            metricsServer.stop();
        }
    }
}