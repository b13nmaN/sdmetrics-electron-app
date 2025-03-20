package com.facadeimpl.sdmetrics;

import com.sdmetrics.model.Model;
import com.sdmetrics.model.ModelElement;
import com.sdmetrics.metrics.Metric;
import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.metrics.Matrix;
import com.sdmetrics.metrics.MatrixData;
import com.sdmetrics.metrics.MatrixEngine;

import java.util.*;

public class SDMetricFacade {
    private Model model;
    private MetricStore metricStore;
    private MetricsEngine metricsEngine;
    private final SDMetricsParser sdMetricsParser;
    private MetricsServer metricsServer;
    
    private final DiagramDAO diagramDAO = new DiagramDAO();
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
        this.sdMetricsParser = new SDMetricsParser(diagramDAO, metaModelURL, xmiTransURL, metricsURL);
        
        // Start REST server using MetricsServer
        metricsServer = new MetricsServer(httpPort, this);
        metricsServer.start();
        System.out.println("REST server started on port: " + httpPort);
    }

    public void processXMI(String xmiContent, String fileName) throws Exception {
        sdMetricsParser.parseXMI(xmiContent, fileName);
        calculateAndSendMetrics(); // Trigger metrics calculation after parsing
    }

    public String getLatestXMIContent() {
        return diagramDAO.getLatestXMIContent();
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

        // Store metrics data using MetricsDataStore
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

        // Store matrix data using MetricsDataStore
        MetricsDataStore.setMatrixData(matrixData.getMatrixDefinition().getName(), matrixJson);
    }

    public List<com.facadeimpl.sdmetrics.model.DiagramElement> getAllElements() {
        return diagramDAO.getAllElements();
    }
    
    public DiagramDAO getDiagramDAO() {
        return diagramDAO;
    }

    public void stopServer() throws Exception {
        if (metricsServer != null) {
            metricsServer.stop();
        }
    }
}