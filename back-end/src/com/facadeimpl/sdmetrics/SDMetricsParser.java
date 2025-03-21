package com.facadeimpl.sdmetrics;

import com.sdmetrics.metrics.Metric;
import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.model.MetaModel;
import com.sdmetrics.model.Model;
import com.sdmetrics.model.ModelElement;
import com.sdmetrics.model.XMIReader;
import com.sdmetrics.model.XMITransformations;
import com.sdmetrics.util.XMLParser;

import java.io.*;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

public class SDMetricsParser {
    private final String metaModelURL;
    private final String xmiTransURL;
    private final String metricsURL;

    public SDMetricsParser(String metaModelURL, String xmiTransURL, String metricsURL) {
        this.metaModelURL = metaModelURL;
        this.xmiTransURL = xmiTransURL;
        this.metricsURL = metricsURL;
    }

    public void parseXMI(String xmiContent, String fileName) throws Exception {
        // SDMetrics’ XMLParser requires a file path, so use a temporary file
        File tempFile = File.createTempFile("xmi_", ".xmi");
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(tempFile))) {
            writer.write(xmiContent);
            System.out.println(xmiContent);
        }

        try {
            // Step 1: Parse meta-model and transformations
            XMLParser parser = new XMLParser();
            MetaModel metaModel = new MetaModel();
            parser.parse(metaModelURL, metaModel.getSAXParserHandler());

            XMITransformations trans = new XMITransformations(metaModel);
            parser.parse(xmiTransURL, trans.getSAXParserHandler());

            // Step 2: Parse XMI content using SDMetrics’ custom parser
            Model model = new Model(metaModel);
            XMIReader xmiReader = new XMIReader(trans, model);
            parser.parse(tempFile.getAbsolutePath(), xmiReader);

            // Step 3: Load metrics definitions
            MetricStore metricStore = new MetricStore(metaModel);
            parser.parse(metricsURL, metricStore.getSAXParserHandler());
            MetricsEngine metricsEngine = new MetricsEngine(metricStore, model);

            // No longer saving elements to SQLite; metrics are stored in MetricsDataStore instead
        } catch (Exception e) {
            System.err.println("Invalid XMI: " + e.getMessage());
            throw e;
        } finally {
            tempFile.delete(); // Clean up temporary file
        }
    }
}