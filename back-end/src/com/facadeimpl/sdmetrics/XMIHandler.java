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
            if ("POST".equals(exchange.getRequestMethod())) {
                String requestBody = ResponseUtils.readRequestBody(exchange);
                JsonNode jsonNode = MAPPER.readTree(requestBody);

                if (jsonNode.has("content") && jsonNode.has("fileName")) {
                    String xmiContent = jsonNode.get("content").asText();
                    String fileName = jsonNode.get("fileName").asText();
                    facade.processXMI(xmiContent, fileName);
                    sendSuccessResponse(exchange, "XMI processed successfully");
                } else if (jsonNode.has("content") && jsonNode.has("type") && "update_xmi".equals(jsonNode.get("type").asText())) {
                    String newXmiContent = jsonNode.get("content").asText();
                    facade.processXMI(newXmiContent, "edited.xmi");
                    sendSuccessResponse(exchange, "XMI updated successfully");
                } else {
                    ResponseUtils.sendErrorResponse(exchange, "Invalid request body");
                }
            } else if ("GET".equals(exchange.getRequestMethod())) {
                Map<String, String> response = new HashMap<>();
                response.put("xmiContent", facade.getLatestXMIContent());
                ResponseUtils.sendJsonResponse(exchange, 200, response);
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
