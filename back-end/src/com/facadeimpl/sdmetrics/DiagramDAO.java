package com.facadeimpl.sdmetrics;

import com.facadeimpl.sdmetrics.model.DiagramElement;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class DiagramDAO {
    private static final String DB_URL = "jdbc:sqlite:resources/database.db";
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public DiagramDAO() {
        initDatabase();
    }

    private void initDatabase() {
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement()) {
            // Create config table for storing last file path
            stmt.execute("CREATE TABLE IF NOT EXISTS config (" +
                    "key TEXT PRIMARY KEY, " +
                    "value TEXT)");
            
            // Create elements table for diagram elements
            stmt.execute("CREATE TABLE IF NOT EXISTS elements (" +
                    "id TEXT PRIMARY KEY, " +
                    "name TEXT, " +
                    "type TEXT, " +
                    "attributes TEXT, " +
                    "metrics TEXT)");
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public void saveLastFilePath(String filepath) {
        String sql = "INSERT OR REPLACE INTO config (key, value) VALUES ('last_filepath', ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, filepath);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public String getLastFilePath() {
        String sql = "SELECT value FROM config WHERE key = 'last_filepath'";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) {
                return rs.getString("value");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public void saveElement(DiagramElement diagramElement) {
        String sql = "INSERT OR REPLACE INTO elements (id, name, type, attributes, metrics) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, diagramElement.getId());
            pstmt.setString(2, diagramElement.getName());
            pstmt.setString(3, diagramElement.getType());
            pstmt.setString(4, MAPPER.writeValueAsString(diagramElement.getAttributes()));
            pstmt.setString(5, MAPPER.writeValueAsString(diagramElement.getMetrics()));
            pstmt.executeUpdate();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @SuppressWarnings("unchecked")
    public List<DiagramElement> getAllElements() {
        List<DiagramElement> elements = new ArrayList<>();
        String sql = "SELECT * FROM elements";
        try (Connection conn = DriverManager.getConnection(DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                DiagramElement element = new DiagramElement(
                        rs.getString("id"),
                        rs.getString("name"),
                        rs.getString("type"));
                element.setAttributes(MAPPER.readValue(rs.getString("attributes"), Map.class));
                element.setMetrics(MAPPER.readValue(rs.getString("metrics"), Map.class));
                elements.add(element);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return elements;
    }
}