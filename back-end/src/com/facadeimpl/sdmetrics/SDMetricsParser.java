package com.facadeimpl.sdmetrics;


import com.facadeimpl.sdmetrics.model.DiagramElement;
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
    private final DiagramDAO diagramDAO;
    private final String metaModelURL;
    private final String xmiTransURL;
    private final String metricsURL;
    

    public SDMetricsParser(DiagramDAO diagramDAO, String metaModelURL, String xmiTransURL, String metricsURL) {
        this.diagramDAO = diagramDAO;
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

            // Step 4: Save XMI content and metadata
            diagramDAO.saveFile(fileName, xmiContent, new java.util.Date().toString());

            // Step 5: Convert and save model elements
            int x = 0, y = 0;
            for (ModelElement element : model) {
                DiagramElement diagramElement = new DiagramElement(
                        element.getXMIID(),
                        element.getName(),
                        element.getType().getName()
                );

                // Attributes: Use getSetAttribute for multi-valued attributes
                Map<String, Object> attributes = new HashMap<>();
                Collection<String> attrNames = element.getType().getAttributeNames();
                for (String attrName : attrNames) {
                    if (element.getType().isSetAttribute(attrName)) {
                        // Multi-valued attribute (e.g., ownedAttribute)
                        Collection<?> attrValues = element.getSetAttribute(attrName);
                        if (attrValues != null && !attrValues.isEmpty()) {
                            attributes.put(attrName, attrValues);
                        }
                    } else if (!"id".equals(attrName) && !"context".equals(attrName)) {
                        // Single-valued attribute (e.g., name, visibility)
                        String value = element.getPlainAttribute(attrName);
                        if (value != null && !value.isEmpty()) {
                            attributes.put(attrName, value);
                        }
                    }
                }
                diagramElement.setAttributes(attributes);

                // Relationships: Use getOwnedElements or getRelations for containment/relations
                Map<String, Object> relations = new HashMap<>();
                Collection<ModelElement> ownedElements = element.getOwnedElements();
                if (ownedElements != null && !ownedElements.isEmpty()) {
                    relations.put("ownedElements", ownedElements.stream()
                            .map(ModelElement::getXMIID)
                            .toArray());
                }
                // Add incoming relations if needed
                Collection<ModelElement> incoming = element.getRelations("context");
                if (incoming != null && !incoming.isEmpty()) {
                    relations.put("context", incoming.stream()
                            .map(ModelElement::getXMIID)
                            .toArray());
                }

                // Metrics
                Map<String, Object> metrics = new HashMap<>();
                Collection<Metric> metricDefs = metricStore.getMetrics(element.getType());
                for (Metric metric : metricDefs) {
                    if (!metric.isInternal()) {
                        Object value = metricsEngine.getMetricValue(element, metric);
                        metrics.put(metric.getName(), value != null ? value : "N/A");
                    }
                }
                diagramElement.setMetrics(metrics);

                diagramDAO.saveElement(diagramElement);
            }
        } catch (Exception e) {
                MetricsWebSocketEndpoint.sendError("Invalid XMI: " + e.getMessage());
                throw e;
        } finally {
            tempFile.delete(); // Clean up temporary file
        }
    }
}