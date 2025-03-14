package com.facadeimpl.sdmetrics;

import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@ServerEndpoint("/metrics")
public class MetricsWebSocketEndpoint {
    private static final Map<String, Map<String, Object>> metricsData = new ConcurrentHashMap<>();
    private static final Map<String, Object> matrixData = new ConcurrentHashMap<>();
    private static final Map<Session, Boolean> sessions = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session) {
        sessions.put(session, true);
        System.out.println("New WebSocket connection: " + session.getId());
        try {
            session.getBasicRemote().sendText("{\"type\": \"metrics\", \"data\": " + new com.google.code.gson.Gson().toJson(metricsData) + "}");
            session.getBasicRemote().sendText("{\"type\": \"matrices\", \"data\": " + new com.google.code.gson.Gson().toJson(matrixData) + "}");
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
    }

    public static void sendMetrics(Map<String, Map<String, Object>> metrics) {
        metricsData.clear();
        metricsData.putAll(metrics);
        String json = "{\"type\": \"metrics\", \"data\": " + new com.google.code.gson.Gson().toJson(metrics) + "}";
        broadcast(json);
    }

    public static void sendMatrix(String matrixName, Object matrix) {
        matrixData.put(matrixName, matrix);
        String json = "{\"type\": \"matrix\", \"matrixName\": \"" + matrixName + "\", \"data\": " + new com.google.code.gson.Gson().toJson(matrix) + "}";
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