package com.facadeimpl.sdmetrics;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class CalculateMetricsHandler implements HttpHandler {
    private final SDMetricFacade facade;

    public CalculateMetricsHandler(SDMetricFacade facade) {
        this.facade = facade;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                ResponseUtils.addCorsHeaders(exchange);
                exchange.sendResponseHeaders(204, -1); // No content
                return;
            }
            if ("POST".equals(exchange.getRequestMethod())) {
                if (facade != null) {
                    facade.calculateAndSendMetrics();
                    sendSuccessResponse(exchange, "Metrics calculated successfully");
                } else {
                    ResponseUtils.sendErrorResponse(exchange, "Facade not initialized");
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

    private void sendSuccessResponse(HttpExchange exchange, String message) throws IOException {
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", message);
        ResponseUtils.sendJsonResponse(exchange, 200, response);
    }
}