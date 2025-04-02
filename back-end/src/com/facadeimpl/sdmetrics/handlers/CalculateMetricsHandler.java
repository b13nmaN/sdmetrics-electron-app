package com.facadeimpl.sdmetrics.handlers;

import com.facadeimpl.sdmetrics.MetricsDataStore;
import com.facadeimpl.sdmetrics.ResponseUtils;
import com.facadeimpl.sdmetrics.SDMetricFacade;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class CalculateMetricsHandler implements HttpHandler {
    private final SDMetricFacade facade;

    public CalculateMetricsHandler(SDMetricFacade facade) {
        this.facade = facade;
        System.out.println("CalculateMetricsHandler initialized with facade: " + (facade != null ? "not null" : "null"));
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        System.out.println("Handling request in CalculateMetricsHandler...");
        System.out.println("Request URI: " + exchange.getRequestURI());
        System.out.println("Request Method: " + exchange.getRequestMethod());
        System.out.println("Request Headers: " + exchange.getRequestHeaders().entrySet());

        try {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                System.out.println("Processing OPTIONS request...");
                ResponseUtils.addCorsHeaders(exchange);
                System.out.println("CORS headers added: " + exchange.getResponseHeaders().entrySet());
                exchange.sendResponseHeaders(204, -1); // No content
                System.out.println("OPTIONS response sent with status 204");
                return;
            }

            if ("POST".equals(exchange.getRequestMethod())) {
                System.out.println("Processing POST request...");
                if (facade != null) {
                    System.out.println("Facade is not null, calculating metrics...");
                    String lastFilePath = facade.getLastFilePath();
                    if (lastFilePath != null && !lastFilePath.isEmpty()) {
                        // Process the XMI file and calculate metrics
                        facade.processXMI(lastFilePath);
                        System.out.println("Metrics calculated, sending success response...");
                        
                        Map<String, Object> response = new HashMap<>();
                        response.put("status", "success");
                        response.put("message", "Metrics calculated successfully");

                        // Add metrics and matrices to the response
                        response.put("metrics", MetricsDataStore.getMetricsData());
                        response.put("matrices", MetricsDataStore.getMatrixData());
                        ResponseUtils.sendJsonResponse(exchange, 200, response);
                        
                        System.out.println("Success response sent");
                    } else {
                        System.out.println("No file path set, sending error response...");
                        ResponseUtils.sendErrorResponse(exchange, "No file has been processed yet");
                        System.out.println("Error response sent: No file path");
                    }
                } else {
                    System.out.println("Facade is null, sending error response...");
                    ResponseUtils.sendErrorResponse(exchange, "Facade not initialized");
                    System.out.println("Error response sent: Facade not initialized");
                }
            } else {
                System.out.println("Method not allowed: " + exchange.getRequestMethod());
                exchange.sendResponseHeaders(405, 0); // Method Not Allowed
                System.out.println("Response sent with status 405 (Method Not Allowed)");
            }
        } catch (Exception e) {
            System.err.println("Exception occurred while handling request: " + e.getMessage());
            e.printStackTrace();
            System.out.println("Sending error response due to exception...");
            ResponseUtils.sendErrorResponse(exchange, e.getMessage());
            System.out.println("Error response sent with message: " + e.getMessage());
        } finally {
            System.out.println("Closing exchange...");
            exchange.close();
            System.out.println("Exchange closed");
        }
    }
}