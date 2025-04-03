package com.facadeimpl.sdmetrics.handlers;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;

import com.facadeimpl.sdmetrics.ResponseUtils;
import com.facadeimpl.sdmetrics.SDMetricFacade;
import com.facadeimpl.sdmetrics.XMIToJSONParser;

public class XMIToJSONHandler implements HttpHandler {
    private final SDMetricFacade facade;
    private final XMIToJSONParser jsonParser;
    
    public XMIToJSONHandler(SDMetricFacade facade) throws Exception {
        this.facade = facade;
        // Use the same configuration files as the facade
        this.jsonParser = new XMIToJSONParser(
        facade.getMetaModelURL(),
        facade.getXmiTransURL(),
        facade.getMetricsURL()
    );
    }
    
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            String lastFilePath = facade.getLastFilePath();
            if (lastFilePath == null || !Files.exists(Paths.get(lastFilePath))) {
                String response = "{\"error\": \"No XMI file has been processed yet\"}";
                ResponseUtils.sendErrorResponse(exchange, response);;
                return;
            }

            System.out.println("Handling request in XMIToJSONHandler...");
            
            // Read the XMI content
            System.out.println("Reading XMI content from: " + lastFilePath);
            String xmiContent = new String(Files.readAllBytes(Paths.get(lastFilePath)));
            String fileName = Paths.get(lastFilePath).getFileName().toString();
            
            // Parse XMI to JSON
            System.out.println("Parsing XMI to JSON...");
            String jsonOutput = jsonParser.parseToJson(xmiContent, fileName);
            // System.out.println("Sending JSON response: " + jsonOutput);
            
            // Send JSON response
            ResponseUtils.sendJsonResponse(exchange,200, jsonOutput);
            // sendResponse(exchange, jsonOutput, 200);
        } catch (Exception e) {
            String errorMessage = "{\"error\": \"" + e.getMessage().replace("\"", "\\\"") + "\"}";
            ResponseUtils.sendErrorResponse(exchange, errorMessage);
        }
    }
    
}
