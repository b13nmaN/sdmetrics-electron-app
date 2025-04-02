package com.facadeimpl.sdmetrics;

import com.facadeimpl.sdmetrics.handlers.CalculateMetricsHandler;
import com.facadeimpl.sdmetrics.handlers.MetricsHandler;
import com.facadeimpl.sdmetrics.handlers.XMIHandler;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import com.facadeimpl.sdmetrics.handlers.XMIToJSONHandler;

public class MetricsServer {
    private final HttpServer server;
    private final SDMetricFacade facade;

    public MetricsServer(int port, SDMetricFacade facade) throws IOException {
        this.facade = facade;
        this.server = HttpServer.create(new InetSocketAddress(port), 0);
        configureRoutes();
        server.setExecutor(null); // Use default executor
    }

    private void configureRoutes() {
        server.createContext("/api/metrics", new MetricsHandler(facade));
        server.createContext("/api/xmi", new XMIHandler(facade));
        server.createContext("/api/calculate", new CalculateMetricsHandler(facade));
        // Add the new JSON endpoint
    try {
        System.out.println("Adding JSON endpoint...");
        server.createContext("/api/json", new XMIToJSONHandler(facade));
    } catch (Exception e) {
        System.err.println("Error setting up JSON handler: " + e.getMessage());
    }
    }

    public void start() {
        server.start();
        System.out.println("HTTP server started on port: " + server.getAddress().getPort());
    }

    public void stop() {
        server.stop(0);
        System.out.println("HTTP server stopped");
    }
}