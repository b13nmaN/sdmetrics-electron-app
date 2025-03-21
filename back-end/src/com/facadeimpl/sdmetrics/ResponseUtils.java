package com.facadeimpl.sdmetrics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class ResponseUtils {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        String jsonResponse = MAPPER.writeValueAsString(data);
        byte[] responseBytes = jsonResponse.getBytes(StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set("Content-Type", "application/json");
        addCorsHeaders(exchange);
        exchange.sendResponseHeaders(statusCode, responseBytes.length);

        try (OutputStream os = exchange.getResponseBody()) {  // Changed from getRequestBody to getResponseBody
            os.write(responseBytes);
        }
    }

    public static void sendErrorResponse(HttpExchange exchange, String errorMessage) throws IOException {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("status", "error");
        errorResponse.put("message", errorMessage);
        sendJsonResponse(exchange, 400, errorResponse);
    }

    public static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "http://localhost:5173");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        exchange.getResponseHeaders().add("Access-Control-Max-Age", "3600");
      }

    public static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
             BufferedReader br = new BufferedReader(isr)) {
            return br.lines().collect(Collectors.joining(System.lineSeparator()));
        }
    }
}