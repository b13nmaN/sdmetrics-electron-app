package com.facadeimpl.sdmetrics;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
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
                List<com.facadeimpl.sdmetrics.model.DiagramElement> elements = facade.getAllElements();
                ResponseUtils.sendJsonResponse(exchange, 200, elements);
            } else if ("POST".equals(exchange.getRequestMethod()) || "PUT".equals(exchange.getRequestMethod())) {
                String requestBody = ResponseUtils.readRequestBody(exchange);
                JsonNode jsonNode = MAPPER.readTree(requestBody);

                if (jsonNode.has("elementId") && jsonNode.has("attribute") && jsonNode.has("newValue")) {
                    String id = jsonNode.get("elementId").asText();
                    String attribute = jsonNode.get("attribute").asText();
                    String newValue = jsonNode.get("newValue").asText();
                    updateElementAttribute(id, attribute, newValue);
                    sendSuccessResponse(exchange, "Element updated successfully");
                } else {
                    ResponseUtils.sendErrorResponse(exchange, "Invalid request body");
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

    private void sendSuccessResponse(HttpExchange exchange, String message) throws IOException {
        Map<String, String> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", message);
        ResponseUtils.sendJsonResponse(exchange, 200, response);
    }
}