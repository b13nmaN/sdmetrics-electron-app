package com.facadeimpl.sdmetrics;

import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.model.MetaModel;
import com.sdmetrics.model.Model;
import com.sdmetrics.model.XMIReader;
import com.sdmetrics.model.XMITransformations;
import com.sdmetrics.util.XMLParser;

import java.io.*;

public class SDMetricsParser {
    private final String metaModelURL;
    private final String xmiTransURL;
    private final String metricsURL;
    private MetaModel metaModel;
    private Model model;
    private MetricStore metricStore;
    private MetricsEngine metricsEngine;
    private File tempFile; 

    public SDMetricsParser(String metaModelURL, String xmiTransURL, String metricsURL) {
        this.metaModelURL = metaModelURL;
        this.xmiTransURL = xmiTransURL;
        this.metricsURL = metricsURL;
        this.tempFile = null;
        
        // Don't initialize meta model here since it needs tempFile
    }
    
    private void initializeMetaModel() throws Exception {
        if (tempFile == null) {
            throw new IllegalStateException("Temporary file not set. Call parseXMI first.");
        }

        XMLParser parser = new XMLParser();
        
        // Step 1: Parse meta-model
        this.metaModel = new MetaModel();
        parser.parse(metaModelURL, metaModel.getSAXParserHandler());

        // Step 2: Parse transformations
        XMITransformations trans = new XMITransformations(metaModel);
        parser.parse(xmiTransURL, trans.getSAXParserHandler());

        // Step 3: Parse XMI content
        this.model = new Model(metaModel);
        XMIReader xmiReader = new XMIReader(trans, model);
        parser.parse(tempFile.getAbsolutePath(), xmiReader);

        // Step 4: Load metrics definitions
        this.metricStore = new MetricStore(metaModel);
        parser.parse(metricsURL, metricStore.getSAXParserHandler());
        
        // Step 5: Initialize metrics engine
        this.metricsEngine = new MetricsEngine(metricStore, model);
        
        int elementCount = 0;
        for (var element : model) {
            elementCount++;
        }
        System.out.println("XMI parsing completed successfully. Model has " + elementCount + " elements.");
    }

    public void parseXMI(String xmiContent, String fileName) throws Exception {
        // Create temporary file
        this.tempFile = File.createTempFile("xmi_", ".xmi");
        this.tempFile.deleteOnExit(); // Mark for deletion on JVM exit
        
        // Write XMI content to temp file
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile))) {
            writer.write(xmiContent);
            System.out.println("Temporary file created: " + tempFile.getAbsolutePath());
            System.out.println("XMI content written to temp file");
        } catch (IOException e) {
            System.err.println("Error writing XMI content to temporary file: " + e.getMessage());
            throw e;
        }

        try {
            // Initialize model and metrics after creating temp file
            initializeMetaModel();
        } catch (Exception e) {
            System.err.println("Invalid XMI or initialization error: " + e.getMessage());
            throw e;
        }
        // Note: We don't delete the file here anymore since it's marked for deletion on exit
        // and might be needed for further processing
    }
    
    // Getters for the parsed model and metrics components
    public Model getModel() {
        return model;
    }
    
    public MetricStore getMetricStore() {
        return metricStore;
    }
    
    public MetricsEngine getMetricsEngine() {
        return metricsEngine;
    }
    
    public MetaModel getMetaModel() {
        return metaModel;
    }
    
    // Optional: Add cleanup method if needed
    public void cleanup() {
        if (tempFile != null && tempFile.exists()) {
            boolean deleted = tempFile.delete();
            if (!deleted) {
                System.err.println("Warning: Could not delete temporary file: " + tempFile.getAbsolutePath());
            }
            tempFile = null;
        }
    }
}