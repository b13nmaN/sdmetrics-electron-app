package com.facadeimpl.sdmetrics;

import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import com.fasterxml.jackson.databind.ObjectMapper; // Import Jackson
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@ServerEndpoint("/metrics")
public class MetricsWebSocketEndpoint {
    private static final Map<String, Map<String, Object>> metricsData = new ConcurrentHashMap<>();
    private static final Map<String, Object> matrixData = new ConcurrentHashMap<>();
    private static final Map<Session, Boolean> sessions = new ConcurrentHashMap<>();
    private static SDMetricFacade facade; // Reference to the facade
    private static final ObjectMapper MAPPER = new ObjectMapper(); // Single Jackson instance

    // Setter for the facade instance
    public static void setFacade(SDMetricFacade facadeInstance) {
        facade = facadeInstance;
    }

    @OnOpen
    public void onOpen(Session session) {
        sessions.put(session, true);
        System.out.println("New WebSocket connection: " + session.getId());
        try {
            session.getBasicRemote().sendText("{\"type\": \"metrics\", \"data\": " + MAPPER.writeValueAsString(metricsData) + "}");
            session.getBasicRemote().sendText("{\"type\": \"matrices\", \"data\": " + MAPPER.writeValueAsString(matrixData) + "}");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
        System.out.println("WebSocket connection closed: " + session.getId());
    }

    @OnError
    public void onError(Session session, Throwable throwable) {
        System.err.println("WebSocket error: " + throwable.getMessage());
    }

    @OnMessage
    public void onMessage(Session session, String message) {
        System.out.println("Message from client: " + message);
        if ("calculate_metrics".equals(message)) {
            if (facade != null) {
                facade.calculateAndSendMetrics(); // Trigger calculation
            } else {
                System.err.println("Facade not initialized!");
            }
        }
    }

    public static void sendMetrics(Map<String, Map<String, Object>> metrics) {
        metricsData.clear();
        metricsData.putAll(metrics);
        String json;
        try {
            json = "{\"type\": \"metrics\", \"data\": " + MAPPER.writeValueAsString(metrics) + "}";
        } catch (Exception e) {
            json = "{\"type\": \"metrics\", \"data\": \"Error serializing metrics\"}";
            e.printStackTrace();
        }
        broadcast(json);
    }

    public static void sendMatrix(String matrixName, Object matrix) {
        matrixData.put(matrixName, matrix);
        String json;
        try {
            json = "{\"type\": \"matrix\", \"matrixName\": \"" + matrixName + "\", \"data\": " + MAPPER.writeValueAsString(matrix) + "}";
        } catch (Exception e) {
            json = "{\"type\": \"matrix\", \"matrixName\": \"" + matrixName + "\", \"data\": \"Error serializing matrix\"}";
            e.printStackTrace();
        }
        broadcast(json);
    }

    private static void broadcast(String message) {
        for (Session session : sessions.keySet()) {
            try {
                if (session.isOpen()) {
                    session.getBasicRemote().sendText(message);
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}