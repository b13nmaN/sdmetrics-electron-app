package com.facadeimpl.sdmetrics;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class XmiFileProcessor {
    private String lastFilePath;
    private File tempFile;
    
    /**
     * Creates a temporary file from the provided file path and returns it
     * 
     * @param filepathString The path to the XMI file
     * @return File The temporary file created
     * @throws IOException If there's an error creating the temp file
     */
    public File handleXMIFile(String filepathString) throws IOException {
        try {
            // Get the path and store it
            Path path = Paths.get(filepathString);
            this.lastFilePath = path.toString(); // Store the absolute path as a string
            
            // Create a temporary file
            tempFile = File.createTempFile("xmi_", ".tmp");
            tempFile.deleteOnExit(); // Ensure cleanup on JVM exit
            
            // Copy the original file content to the temp file
            Files.copy(path, new FileOutputStream(tempFile));
            
            System.out.println("Successfully created temporary XMI file: " + tempFile.getAbsolutePath());
            System.out.println("Original file: " + lastFilePath);
            
            return tempFile;
            
        } catch (IOException e) {
            System.err.println("Error handling XMI file: " + e.getMessage());
            throw e;
        }
    }
    
    /**
     * Cleans up the temporary file if it exists
     */
    public void cleanup() {
        if (tempFile != null && tempFile.exists()) {
            boolean deleted = tempFile.delete();
            if (!deleted) {
                System.err.println("Warning: Could not delete temporary file: " + tempFile.getAbsolutePath());
            }
        }
    }
    
    /**
     * Gets the last file path that was processed
     * 
     * @return The absolute path of the last processed file
     */
    public String getLastFilePath() {
        return lastFilePath;
    }
}