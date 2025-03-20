package com.facadeimpl.sdmetrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class MetricsRESTEndpoint {
    private static final Map<String, Map<String, Object>> metricsData = new ConcurrentHashMap<>();
    private static final Map<String, Object> matrixData = new ConcurrentHashMap<>();
    private static SDMetricFacade facade;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private HttpServer server;

    public MetricsRESTEndpoint(int port, SDMetricFacade facadeInstance) throws IOException {
        facade = facadeInstance;
        server = HttpServer.create(new InetSocketAddress(port), 0);
        
        // Configure routes
        server.createContext("/api/metrics", new MetricsHandler());
        server.createContext("/api/xmi", new XMIHandler());
        server.createContext("/api/diagram", new DiagramHandler());
        server.createContext("/api/calculate", new CalculateMetricsHandler());
        
        server.setExecutor(null);
    }

    public void start() {
        server.start();
        System.out.println("HTTP server started on port: " + server.getAddress().getPort());
    }

    public void stop() {
        server.stop(0);
        System.out.println("HTTP server stopped");
    }

    public static void setMetricsData(Map<String, Map<String, Object>> metrics) {
        metricsData.clear();
        metricsData.putAll(metrics);
    }

    public static void setMatrixData(String matrixName, Object matrix) {
        matrixData.put(matrixName, matrix);
    }

    public static void sendError(String errorMessage) {
        System.err.println("ERROR: " + errorMessage);
    }

    // Handler for metrics endpoints
    class MetricsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if ("GET".equals(exchange.getRequestMethod())) {
                    sendJsonResponse(exchange, 200, metricsData);
                } else {
                    exchange.sendResponseHeaders(405, 0); // Method Not Allowed
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, e.getMessage());
            } finally {
                exchange.close();
            }
        }
    }

    // Handler for XMI upload and updates
    class XMIHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if ("POST".equals(exchange.getRequestMethod())) {
                    String requestBody = readRequestBody(exchange);
                    JsonNode jsonNode = MAPPER.readTree(requestBody);
                    
                    if (jsonNode.has("content") && jsonNode.has("fileName")) {
                        String xmiContent = jsonNode.get("content").asText();
                        String fileName = jsonNode.get("fileName").asText();
                        
                        facade.processXMI(xmiContent, fileName);
                        
                        Map<String, String> response = new HashMap<>();
                        response.put("status", "success");
                        response.put("message", "XMI processed successfully");
                        sendJsonResponse(exchange, 200, response);
                    } else if (jsonNode.has("content") && jsonNode.has("type") && "update_xmi".equals(jsonNode.get("type").asText())) {
                        String newXmiContent = jsonNode.get("content").asText();
                        
                        facade.processXMI(newXmiContent, "edited.xmi");
                        
                        Map<String, String> response = new HashMap<>();
                        response.put("status", "success");
                        response.put("message", "XMI updated successfully");
                        sendJsonResponse(exchange, 200, response);
                    } else {
                        sendErrorResponse(exchange, "Invalid request body");
                    }
                } else if ("GET".equals(exchange.getRequestMethod())) {
                    String xmiContent = facade.getLatestXMIContent();
                    Map<String, String> response = new HashMap<>();
                    response.put("xmiContent", xmiContent);
                    sendJsonResponse(exchange, 200, response);
                } else {
                    exchange.sendResponseHeaders(405, 0); // Method Not Allowed
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, e.getMessage());
            } finally {
                exchange.close();
            }
        }
    }

    // Handler for diagram elements
    class DiagramHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                if ("GET".equals(exchange.getRequestMethod())) {
                    List<com.facadeimpl.sdmetrics.model.DiagramElement> elements = facade.getAllElements();
                    sendJsonResponse(exchange, 200, elements);
                } else if ("POST".equals(exchange.getRequestMethod()) || "PUT".equals(exchange.getRequestMethod())) {
                    String requestBody = readRequestBody(exchange);
                    JsonNode jsonNode = MAPPER.readTree(requestBody);
                    
                    if (jsonNode.has("elementId") && jsonNode.has("attribute") && jsonNode.has("newValue")) {
                        String id = jsonNode.get("elementId").asText();
                        String attribute = jsonNode.get("attribute").asText();
                        String newValue = jsonNode.get("newValue").asText();
                        
                        updateElementAttribute(id, attribute, newValue);
                        
                        Map<String, String> response = new HashMap<>();
                        response.put("status", "success");
                        response.put("message", "Element updated successfully");
                        sendJsonResponse(exchange, 200, response);
                    } else {
                        sendErrorResponse(exchange, "Invalid request body");
                    }
                } else {
                    exchange.sendResponseHeaders(405, 0); // Method Not Allowed
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, e.getMessage());
            } finally {
                exchange.close();
            }
        }
    }

    // Handler for triggering metrics calculation
    class CalculateMetricsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                // Handle preflight OPTIONS request
                if ("OPTIONS".equals(exchange.getRequestMethod())) {
                    addCorsHeaders(exchange);
                    exchange.sendResponseHeaders(204, -1); // No content
                    return;
                }
                if ("POST".equals(exchange.getRequestMethod())) {
                    if (facade != null) {
                        facade.calculateAndSendMetrics();
                        
                        Map<String, String> response = new HashMap<>();
                        response.put("status", "success");
                        response.put("message", "Metrics calculated successfully");
                        sendJsonResponse(exchange, 200, response);
                    } else {
                        sendErrorResponse(exchange, "Facade not initialized");
                    }
                } else {
                    exchange.sendResponseHeaders(405, 0); // Method Not Allowed
                }
            } catch (Exception e) {
                sendErrorResponse(exchange, e.getMessage());
            } finally {
                exchange.close();
            }
        }
    }

    // Helper methods
    private void updateElementAttribute(String elementId, String attribute, String newValue) {
        List<com.facadeimpl.sdmetrics.model.DiagramElement> elements = facade.getAllElements();
        for (com.facadeimpl.sdmetrics.model.DiagramElement element : elements) {
            if (element.getId().equals(elementId)) {
                if ("name".equals(attribute)) {
                    element.setName(newValue);
                } else {
                    element.getAttributes().put(attribute, newValue);
                }
                facade.getDiagramDAO().saveElement(element);
                break;
            }
        }
    }

    private String readRequestBody(HttpExchange exchange) throws IOException {
        InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
        BufferedReader br = new BufferedReader(isr);
        return br.lines().collect(Collectors.joining(System.lineSeparator()));
    }

    private void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "http://localhost:5173");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        exchange.getResponseHeaders().add("Access-Control-Max-Age", "3600");
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        String jsonResponse = MAPPER.writeValueAsString(data);
        byte[] responseBytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
        
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        addCorsHeaders(exchange); // Ensure CORS headers are added to every response
        exchange.sendResponseHeaders(statusCode, responseBytes.length);
        
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }

    private void sendErrorResponse(HttpExchange exchange, String errorMessage) throws IOException {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("status", "error");
        errorResponse.put("message", errorMessage);
        
        sendJsonResponse(exchange, 400, errorResponse); // Use sendJsonResponse to ensure CORS headers
    }
}