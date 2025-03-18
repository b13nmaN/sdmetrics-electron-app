package com.facadeimpl.sdmetrics;

import jakarta.websocket.*;
import jakarta.websocket.server.ServerEndpoint;

import com.facadeimpl.sdmetrics.db.DiagramElement;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper; // Import Jackson
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@ServerEndpoint("/metrics")
public class MetricsWebSocketEndpoint {
    private static final Map<String, Map<String, Object>> metricsData = new ConcurrentHashMap<>();
    private static final Map<String, Object> matrixData = new ConcurrentHashMap<>();
    private static final Map<Session, Boolean> sessions = new ConcurrentHashMap<>();
    private static SDMetricFacade facade;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static void setFacade(SDMetricFacade facadeInstance) {
        facade = facadeInstance;
    }

    @OnOpen
    public void onOpen(Session session) {
        sessions.put(session, true);
        System.out.println("New WebSocket connection: " + session.getId());
        sendAllElements(session);
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
    
    public static void sendError(String message) {
        broadcast("{\"type\": \"error\", \"message\": \"" + message + "\"}");
    }

    @OnMessage
    public void onMessage(Session session, String message) {
        System.out.println("Message from client: " + message);
        try {
            JsonNode jsonNode = MAPPER.readTree(message);
            String type = jsonNode.get("type").asText();

            switch (type) {
                case "update_xmi":
                    String newXmiContent = jsonNode.get("content").asText();
                    facade.processXMI(newXmiContent, "edited.xmi"); // Re-parse and update
                    sendAllElements(session);
                    break;
                case "upload_xmi":
                    String xmiContent = jsonNode.get("content").asText();
                    String fileName = jsonNode.get("fileName").asText();
                    facade.processXMI(xmiContent, fileName);
                    sendAllElements(session);
                    break;
                case "update_attribute":
                    updateAttribute(jsonNode);
                    sendAllElements(session);
                    break;
                // case "load_diagram":
                //     sendAllElements(session);
                //     break;
                case "calculate_metrics":
                    if (facade != null) {
                        facade.calculateAndSendMetrics();
                    } else {
                        System.err.println("Facade not initialized!");
                    }
                    break;
            }
        } catch (Exception e) {
            e.printStackTrace();
            try {
                session.getBasicRemote().sendText("{\"status\":\"error\", \"message\":\"" + e.getMessage() + "\"}");
            } catch (IOException ex) {
                ex.printStackTrace();
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

    private void sendAllElements(Session session) {
        try {
            List<com.facadeimpl.sdmetrics.model.DiagramElement> elements = facade.getAllElements();
            String xmiContent = facade.getLatestXMIContent();
            Map<String, Object> response = new HashMap<>();
            response.put("elements", elements);
            response.put("xmiContent", xmiContent);
            String json = MAPPER.writeValueAsString(response);
            session.getBasicRemote().sendText(json);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void updateAttribute(JsonNode jsonNode) {
        String id = jsonNode.get("elementId").asText();
        String attribute = jsonNode.get("attribute").asText();
        String newValue = jsonNode.get("newValue").asText();

        List<com.facadeimpl.sdmetrics.model.DiagramElement> elements = facade.getAllElements();
        for (com.facadeimpl.sdmetrics.model.DiagramElement element : elements) {
            if (element.getId().equals(id)) {
                if ("name".equals(attribute)) {
                    element.setName(newValue);
                } else {
                    element.getAttributes().put(attribute, newValue);
                }
                facade.getDiagramDAO().saveElement(element); // Access DAO via facade
                break;
            }
        }
    }
}