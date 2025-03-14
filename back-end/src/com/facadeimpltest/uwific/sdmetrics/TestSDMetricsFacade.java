package com.facadeimpltest.uwific.sdmetrics;
import com.facadeimpl.sdmetrics.SDMetricFacade;
public class TestSDMetricsFacade {
    public static void main(String[] args) {
        try {
            // Paths to required files
            String metaModelURL = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\metamodel2.xml";
            String xmiTransURL = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\xmiTrans2_0.xml";
            String xmiFile = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\university_uml.xmi";
            String metricsURL = "C:\\Users\\shond\\OneDrive\\Desktop\\UWI\\Year 3 - Semester 2\\Major Research Project\\sdmetrics-electron-app\\back-end\\src\\com\\sdmetrics\\resources\\metrics2_1.xml";

            SDMetricFacade facade = new SDMetricFacade(metaModelURL, xmiTransURL, xmiFile, metricsURL);
            // facade.calculateAndExportMetricsToCSV();
            facade.calculateAndExportMatricesToCSV();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}