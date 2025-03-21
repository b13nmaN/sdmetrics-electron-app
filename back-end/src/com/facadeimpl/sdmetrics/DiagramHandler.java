package com.facadeimpl.sdmetrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class DiagramHandler implements HttpHandler {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final SDMetricFacade facade;

    public DiagramHandler(SDMetricFacade facade) {
        this.facade = facade;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            if ("GET".equals(exchange.getRequestMethod())) {
                // No persistent elements without SQLite; return empty list or remove this endpoint
                List<Object> elements = Collections.emptyList();
                ResponseUtils.sendJsonResponse(exchange, 200, elements);
            } else if ("POST".equals(exchange.getRequestMethod()) || "PUT".equals(exchange.getRequestMethod())) {
                ResponseUtils.sendErrorResponse(exchange, "Element updates not supported without database");
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