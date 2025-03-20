package com.facadeimpl.sdmetrics;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;

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
        server.createContext("/api/diagram", new DiagramHandler(facade));
        server.createContext("/api/calculate", new CalculateMetricsHandler(facade));
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