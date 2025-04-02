package com.facadeimpl.sdmetrics.handlers;

import com.facadeimpl.sdmetrics.MetricsDataStore;
import com.facadeimpl.sdmetrics.ResponseUtils;
import com.facadeimpl.sdmetrics.SDMetricFacade;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;

public class MetricsHandler implements HttpHandler {
    private final SDMetricFacade facade;

    public MetricsHandler(SDMetricFacade facade) {
        this.facade = facade;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            if ("GET".equals(exchange.getRequestMethod())) {
                ResponseUtils.sendJsonResponse(exchange, 200, MetricsDataStore.getMetricsData());
            } else {
                exchange.sendResponseHeaders(405, 0); // Method Not Allowed
            }
        } catch (Exception e) {
            ResponseUtils.sendErrorResponse(exchange, e.getMessage());
        } finally {
            exchange.close();
        }
    }
}
