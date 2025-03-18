package com.facadeimpl.sdmetrics.model;

import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonProperty;

public class DiagramElement {
    private String id;
    private String name;
    private String type;
    private int x;
    private int y;
    private Map<String, Object> attributes;
    private Map<String, Object> metrics;

    public DiagramElement(@JsonProperty("id") String id, 
                          @JsonProperty("name") String name, 
                          @JsonProperty("type") String type) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.x = x;
        this.y = y;
        this.attributes = new HashMap<>();
        this.metrics = new HashMap<>();
    }

    // Getters and setters
    public String getId() { return id; }
    public String getName() { return name; }
    public String getType() { return type; }
    public int getX() { return x; }
    public int getY() { return y; }
    public Map<String, Object> getAttributes() { return attributes; }
    public Map<String, Object> getMetrics() { return metrics; }
    public void setName(String name) { this.name = name; }
    public void setX(int x) { this.x = x; }
    public void setY(int y) { this.y = y; }
    public void setAttributes(Map<String, Object> attributes) { this.attributes = attributes; }
    public void setMetrics(Map<String, Object> metrics) { this.metrics = metrics; }
}
