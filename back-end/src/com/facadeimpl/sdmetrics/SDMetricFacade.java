package com.facadeimpl.sdmetrics;

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
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.websocket.jakarta.server.config.JakartaWebSocketServletContainerInitializer;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;

public class SDMetricFacade {
    private MetaModel metaModel;
    private Model model;
    private MetricStore metricStore;
    private MetricsEngine metricsEngine;
    private Server jettyServer;

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

    public SDMetricFacade(String metaModelURL, String xmiTransURL, String xmiFile, String metricsURL, int wsPort) throws Exception {
        XMLParser parser = new XMLParser();
        metaModel = new MetaModel();
        parser.parse(metaModelURL, metaModel.getSAXParserHandler());
        XMITransformations trans = new XMITransformations(metaModel);
        parser.parse(xmiTransURL, trans.getSAXParserHandler());
        model = new Model(metaModel);
        XMIReader xmiReader = new XMIReader(trans, model);
        parser.parse(xmiFile, xmiReader);
        metricStore = new MetricStore(metaModel);
        parser.parse(metricsURL, metricStore.getSAXParserHandler());
        metricsEngine = new MetricsEngine(metricStore, model);

        // Start Jetty server with WebSocket
        jettyServer = new Server(wsPort);
        ServletContextHandler context = new ServletContextHandler(ServletContextHandler.SESSIONS);
        context.setContextPath("/");
        jettyServer.setHandler(context);

        JakartaWebSocketServletContainerInitializer.configure(context, (servletContext, wsContainer) -> {
            wsContainer.addEndpoint(MetricsWebSocketEndpoint.class);
        });

        jettyServer.start();
        System.out.println("Jetty WebSocket server started on port: " + wsPort);

        // Set this instance in the WebSocket endpoint
        MetricsWebSocketEndpoint.setFacade(this);
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

        MetricsWebSocketEndpoint.sendMetrics(metricsData);
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

        MetricsWebSocketEndpoint.sendMatrix(matrixData.getMatrixDefinition().getName(), matrixJson);
    }

    public void stopServer() throws Exception {
        if (jettyServer != null) {
            jettyServer.stop();
        }
    }
}