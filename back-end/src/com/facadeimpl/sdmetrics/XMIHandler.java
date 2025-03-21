package com.facadeimpl.sdmetrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class XMIHandler implements HttpHandler {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final SDMetricFacade facade;

    public XMIHandler(SDMetricFacade facade) {
        this.facade = facade;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            ResponseUtils.addCorsHeaders(exchange);
            
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1); // No content
                return;
            }
            
            if ("GET".equals(exchange.getRequestMethod())) {
                Map<String, Object> response = new HashMap<>();
                response.put("filepath", facade.getLastFilePath());
                response.put("metrics", MetricsDataStore.getMetricsData());
                response.put("matrices", MetricsDataStore.getMatrixData());
                ResponseUtils.sendJsonResponse(exchange, 200, response);
            } else if ("POST".equals(exchange.getRequestMethod())) {
                String requestBody = ResponseUtils.readRequestBody(exchange);
                JsonNode jsonNode = MAPPER.readTree(requestBody);

                if (jsonNode.has("filepath")) {
                    String filepath = jsonNode.get("filepath").asText();
                    facade.processXMI(filepath);
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("status", "success");
                    response.put("message", "XMI processed successfully");
                    response.put("metrics", MetricsDataStore.getMetricsData());
                    response.put("matrices", MetricsDataStore.getMatrixData());
                    ResponseUtils.sendJsonResponse(exchange, 200, response);
                } else {
                    ResponseUtils.sendErrorResponse(exchange, "Invalid request. Expected 'filepath' parameter.");
                }
            } else {
                exchange.sendResponseHeaders(405, 0); // Method Not Allowed
            }
        } catch (Exception e) {
            ResponseUtils.sendErrorResponse(exchange, e.getMessage());
        } finally {
            exchange.close();
        }
    }
}