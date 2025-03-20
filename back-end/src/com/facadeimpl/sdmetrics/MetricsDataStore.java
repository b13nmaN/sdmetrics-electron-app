package com.facadeimpl.sdmetrics;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MetricsDataStore {
    private static final Map<String, Map<String, Object>> metricsData = new ConcurrentHashMap<>();
    private static final Map<String, Object> matrixData = new ConcurrentHashMap<>();

    public static void setMetricsData(Map<String, Map<String, Object>> metrics) {
        metricsData.clear();
        metricsData.putAll(metrics);
    }

    public static void setMatrixData(String matrixName, Object matrix) {
        matrixData.put(matrixName, matrix);
    }

    public static Map<String, Map<String, Object>> getMetricsData() {
        return metricsData;
    }

    public static Map<String, Object> getMatrixData() {
        return matrixData;
    }
}