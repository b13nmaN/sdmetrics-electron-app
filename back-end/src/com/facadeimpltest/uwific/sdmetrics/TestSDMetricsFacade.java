package com.facadeimpltest.uwific.sdmetrics;

import java.nio.file.Files;
import java.nio.file.Paths;

import com.facadeimpl.sdmetrics.SDMetricFacade;

public class TestSDMetricsFacade {
    public static void main(String[] args) {
        SDMetricFacade facade = null;
        try {
            // Paths to required files
            String metaModelURL = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\metamodel2.xml";
            String xmiTransURL = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\xmiTrans2_0.xml";
            String metricsURL = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\metrics2_1.xml";

            // Initialize facade with the three core files and HTTP port
            facade = new SDMetricFacade(metaModelURL, xmiTransURL, metricsURL, 8080);
            System.out.println("Facade initialized: starting server...");

            // Keep the application running to handle HTTP requests
            Thread.currentThread().join();

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (facade != null) {
                try {
                    facade.stopServer();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }
}