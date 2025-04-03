package com.facadeimpl.sdmetrics;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.sdmetrics.metrics.Metric;
import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.metrics.Matrix;
import com.sdmetrics.metrics.MatrixData;
import com.sdmetrics.metrics.MatrixEngine;
import com.sdmetrics.model.Model;
import com.sdmetrics.model.ModelElement;

public class SDMetricFacade {
    private final SDMetricsParser sdMetricsParser;
    private MetricsServer metricsServer;
    private String lastFilePath;
    
    private static final String LAST_PATH_FILE = "last_path.txt";
    private static final Set<String> METRICS_TO_INCLUDE = new HashSet<>();
    private static final Set<String> MATRICES_TO_INCLUDE = new HashSet<>();

    static {
        // Coupling Metrics
        METRICS_TO_INCLUDE.add("Dep_Out");
        METRICS_TO_INCLUDE.add("Dep_In");
        METRICS_TO_INCLUDE.add("NumAssEl_ssc");
        METRICS_TO_INCLUDE.add("NumAssEl_sb");
        METRICS_TO_INCLUDE.add("NumAssEl_nsb");
        METRICS_TO_INCLUDE.add("IC_Attr");
        METRICS_TO_INCLUDE.add("Assoc_Out");
        METRICS_TO_INCLUDE.add("Assoc_In");

        // Inheritance metrics
        METRICS_TO_INCLUDE.add("IFImpl");
        METRICS_TO_INCLUDE.add("NOC");
        METRICS_TO_INCLUDE.add("DIT");
        METRICS_TO_INCLUDE.add("CLD");
        METRICS_TO_INCLUDE.add("OpsInh");
        METRICS_TO_INCLUDE.add("AttrInh");

        // Cohesion metrics
        METRICS_TO_INCLUDE.add("CAMC");
        METRICS_TO_INCLUDE.add("LCOM_Parametertypes");
        METRICS_TO_INCLUDE.add("NHD");

        // Size metrics
        METRICS_TO_INCLUDE.add("TC_Attr");

        // Package metrics
        METRICS_TO_INCLUDE.add("R");
        METRICS_TO_INCLUDE.add("Ca");
        METRICS_TO_INCLUDE.add("Ce");
        METRICS_TO_INCLUDE.add("DepPack");

        // Interface metrics
        METRICS_TO_INCLUDE.add("NumAnc");
        METRICS_TO_INCLUDE.add("NumDesc");
        METRICS_TO_INCLUDE.add("EC_Attr");
        METRICS_TO_INCLUDE.add("EC_Par");
        METRICS_TO_INCLUDE.add("IC_Par");
        METRICS_TO_INCLUDE.add("Assoc");
    }

    public SDMetricFacade(String metaModelURL, String xmiTransURL, String metricsURL, int httpPort) throws Exception {
        // Initialize the parser with the required configuration files
        this.sdMetricsParser = new SDMetricsParser(metaModelURL, xmiTransURL, metricsURL);
        
        // Load the last file path used
        this.lastFilePath = loadLastFilePath();
        
        // Initialize and start the REST server
        this.metricsServer = new MetricsServer(httpPort, this);
        this.metricsServer.start();
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
        
        // Calculate metrics after parsing
        calculateAndSendMetrics();
    }

    public void calculateAndSendMetrics() {
        // Get components from parser
        Model model = sdMetricsParser.getModel();
        MetricStore metricStore = sdMetricsParser.getMetricStore();
        MetricsEngine metricsEngine = sdMetricsParser.getMetricsEngine();

        System.out.println("Starting metrics calculation...");
        Map<String, Map<String, Object>> metricsData = new HashMap<>();
        
        if (model == null) {
            System.err.println("Model is null, cannot calculate metrics");
            return;
        }
        
        // Calculate metrics for each model element
        for (ModelElement element : model) {
            String elementName = element.getFullName();
            System.out.println("Processing element: " + elementName);
            
            Map<String, Object> elementMetrics = new HashMap<>();
            Collection<Metric> metrics = metricStore.getMetrics(element.getType());
            
            if (metrics != null) {
                for (Metric metric : metrics) {
                    String metricName = metric.getName();
                    if (!metric.isInternal() && METRICS_TO_INCLUDE.contains(metricName)) {
                        try {
                            Object metricValue = metricsEngine.getMetricValue(element, metric);
                            elementMetrics.put(metricName, metricValue != null ? metricValue : "N/A");
                            System.out.println("  Metric " + metricName + " = " + metricValue);
                        } catch (Exception e) {
                            System.err.println("Error calculating metric " + metricName + " for " + elementName + ": " + e.getMessage());
                            elementMetrics.put(metricName, "Error");
                        }
                    }
                }
            }
            
            if (!elementMetrics.isEmpty()) {
                metricsData.put(elementName, elementMetrics);
            }
        }
        
        System.out.println("Completed metrics calculation. Total elements processed: " + metricsData.size());
        MetricsDataStore.setMetricsData(metricsData);
        
        // Calculate matrix data
        calculateAndSendMatrices();
        
        // Calculate and send interface realization matrix
        calculateAndSendInterfaceMatrix();
    }

    private void calculateAndSendMatrices() {
        // Get metrics engine from parser
        MetricsEngine metricsEngine = sdMetricsParser.getMetricsEngine();
        MetricStore metricStore = sdMetricsParser.getMetricStore();

        System.out.println("Starting matrix calculations...");
        MatrixEngine matrixEngine = new MatrixEngine(metricsEngine);
        Collection<Matrix> matrices = metricStore.getMatrices();
        
        for (Matrix matrix : matrices) {
            String matrixName = matrix.getName();
            if (MATRICES_TO_INCLUDE.isEmpty() || MATRICES_TO_INCLUDE.contains(matrixName)) {
                try {
                    System.out.println("Calculating matrix: " + matrixName);
                    MatrixData matrixData = matrixEngine.calculate(matrix);
                    sendMatrix(matrixData);
                } catch (Exception e) {
                    System.err.println("Error calculating matrix " + matrixName + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }
        }
        
        System.out.println("Matrix calculations completed");
    }
    
    /**
     * Creates and sends a custom matrix that shows interface-class realization relationships
     */
    private void calculateAndSendInterfaceMatrix() {
        Model model = sdMetricsParser.getModel();
        if (model == null) {
            System.err.println("Model is null, cannot calculate interface matrix");
            return;
        }
        
        System.out.println("Calculating Interface Realization Matrix...");
        
        // First, collect all interfaces and classes
        List<ModelElement> interfaces = new ArrayList<>();
        List<ModelElement> classes = new ArrayList<>();
        
        for (ModelElement element : model) {
            if (element.getType().getName().equalsIgnoreCase("interface")) {
                interfaces.add(element);
            } else if (element.getType().getName().equalsIgnoreCase("class")) {
                classes.add(element);
            }
        }
        
        System.out.println("Found " + interfaces.size() + " interfaces and " + classes.size() + " classes");
        
        // Create a matrix representation
        Map<String, Object> matrixJson = new HashMap<>();
        
        // Set column names (classes)
        String[] columns = new String[classes.size()];
        for (int i = 0; i < classes.size(); i++) {
            columns[i] = classes.get(i).getName();
        }
        matrixJson.put("columns", columns);
        
        // Create rows (interfaces)
        Map<String, int[]> rows = new HashMap<>();
        for (ModelElement iface : interfaces) {
            String interfaceName = iface.getName();
            String interfaceXMIID = iface.getXMIID();
            int[] values = new int[classes.size()];
            
            System.out.println("Processing interface: " + interfaceName + " (ID: " + interfaceXMIID + ")");
            
            // For each class, check if it implements this interface
            for (int i = 0; i < classes.size(); i++) {
                ModelElement cls = classes.get(i);
                boolean implementsInterface = checkInterfaceRealization(cls, iface);
                values[i] = implementsInterface ? 1 : 0;
                
                if (implementsInterface) {
                    System.out.println("  Class " + cls.getName() + " implements " + interfaceName);
                }
            }
            
            rows.put(interfaceName, values);
        }
        
        matrixJson.put("rows", rows);
        
        // Store the matrix data with a custom name
        MetricsDataStore.setMatrixData("Interface_Realizations", matrixJson);
        System.out.println("Interface Realization Matrix processed and stored");
    }
    
    /**
     * Checks if a class implements a specific interface using multiple detection approaches
     */
    private boolean checkInterfaceRealization(ModelElement classElement, ModelElement interfaceElement) {
        String interfaceXMIID = interfaceElement.getXMIID();
        
        // Approach 1: Check via "implements" attribute
        try {
            Collection<?> interfaces = classElement.getSetAttribute("implements");
            if (interfaces != null) {
                for (Object interfaceObj : interfaces) {
                    if (interfaceObj instanceof ModelElement) {
                        ModelElement impl = (ModelElement) interfaceObj;
                        if (impl.getXMIID().equals(interfaceXMIID)) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Attribute not found, continue to next approach
        }
        
        // Approach 2: Check via InterfaceRealization elements
        try {
            Collection<ModelElement> ownedElements = classElement.getOwnedElements();
            if (ownedElements != null) {
                for (ModelElement owned : ownedElements) {
                    if (owned.getType().getName().equalsIgnoreCase("interfacerealization")) {
                        try {
                            ModelElement contract = owned.getRefAttribute("contract");
                            if (contract != null && contract.getXMIID().equals(interfaceXMIID)) {
                                return true;
                            }
                        } catch (Exception e) {
                            // Attribute not found
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Error processing interface realizations
        }
        
        // Approach 3: Check if interface has realizations pointing to this class
        try {
            Collection<ModelElement> realizationElements = interfaceElement.getRelations("supplier");
            if (realizationElements != null) {
                for (ModelElement realization : realizationElements) {
                    if (realization.getType().getName().equalsIgnoreCase("interfacerealization")) {
                        try {
                            ModelElement client = realization.getRefAttribute("client");
                            if (client != null && client.getXMIID().equals(classElement.getXMIID())) {
                                return true;
                            }
                        } catch (Exception e) {
                            // Attribute not found
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Error processing supplier relations
        }
        
        return false;
    }

    private void sendMatrix(MatrixData matrixData) {
        String matrixName = matrixData.getMatrixDefinition().getName();
        
        if (matrixData.isEmpty()) {
            System.out.println("Matrix " + matrixName + " is empty. Skipping.");
            return;
        }
        
        System.out.println("Processing matrix: " + matrixName);
        
        // Convert matrix data to a JSON-friendly format
        Map<String, Object> matrixJson = new HashMap<>();
        
        // Extract column names
        String[] columns = new String[matrixData.getNumberOfColumns()];
        for (int col = 0; col < matrixData.getNumberOfColumns(); col++) {
            columns[col] = matrixData.getColumnElement(col).getName();
        }
        matrixJson.put("columns", columns);
        
        // Extract row data
        Map<String, int[]> rows = new HashMap<>();
        for (int row = 0; row < matrixData.getNumberOfRows(); row++) {
            String rowName = matrixData.getRowElement(row).getName();
            int[] values = new int[matrixData.getNumberOfColumns()];
            
            for (int col = 0; col < matrixData.getNumberOfColumns(); col++) {
                Integer value = matrixData.getValueAt(row, col);
                values[col] = value != null ? value : 0;
            }
            
            rows.put(rowName, values);
        }
        matrixJson.put("rows", rows);
        
        // Store the matrix data
        MetricsDataStore.setMatrixData(matrixName, matrixJson);
        System.out.println("Matrix " + matrixName + " processed and stored");
    }

    private String loadLastFilePath() {
        try {
            if (Files.exists(Paths.get(LAST_PATH_FILE))) {
                return Files.readString(Paths.get(LAST_PATH_FILE), StandardCharsets.UTF_8).trim();
            }
        } catch (IOException e) {
            System.out.println("Error reading last_path.txt: " + e.getMessage());
        }
        return null;
    }

    private void saveLastFilePath(String filepath) {
        try {
            Files.writeString(Paths.get(LAST_PATH_FILE), filepath, StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.err.println("Error writing to last_path.txt: " + e.getMessage());
        }
    }

    public String getLastFilePath() {
        return lastFilePath;
    }

    public String getMetaModelURL() {
        return sdMetricsParser.getMetaModelURL();
    }

    public String getXmiTransURL() {
        return sdMetricsParser.getXmiTransURL();
    }

    public String getMetricsURL() {
        return sdMetricsParser.getMetricsURL();
    }

    public void stopServer() throws Exception {
        if (metricsServer != null) {
            metricsServer.stop();
            System.out.println("REST server stopped");
        }
    }
}