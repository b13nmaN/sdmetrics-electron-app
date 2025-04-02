package com.facadeimpl.sdmetrics;

import java.io.IOException;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

import org.xml.sax.InputSource;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.sdmetrics.metrics.MetricStore;
import com.sdmetrics.metrics.MetricsEngine;
import com.sdmetrics.model.MetaModel;
import com.sdmetrics.model.Model;

import com.sdmetrics.model.ModelElement;
import com.sdmetrics.model.XMIReader;
import com.sdmetrics.model.XMITransformations;
import com.sdmetrics.util.XMLParser;

/**
 * Parser that processes XMI files and outputs a JSON representation of UML elements
 * with their metrics.
 */
public class XMIToJSONParser {
    private final SDMetricsParser sdMetricsParser;
    private final ObjectMapper jsonMapper;
    
    /**
     * Constructs a new XMI to JSON parser.
     * 
     * @param metaModelURL URL of the meta model file
     * @param xmiTransURL URL of the XMI transformations file
     * @param metricsURL URL of the metrics definition file
     * @throws Exception If initialization fails
     */
    public XMIToJSONParser(String metaModelURL, String xmiTransURL, String metricsURL) throws Exception {
        System.out.println("Line 47: Initializing XMIToJSONParser constructor");
        this.sdMetricsParser = new SDMetricsParser(metaModelURL, xmiTransURL, metricsURL);
        this.jsonMapper = new ObjectMapper();
        this.jsonMapper.enable(SerializationFeature.INDENT_OUTPUT);
        System.out.println("Line 51: XMIToJSONParser constructor completed");
    }
    
    /**
     * Parses an XMI string and converts it to a JSON representation.
     * 
     * @param xmiContent The XMI content as a string
     * @param fileName The name of the file (for reference)
     * @return A JSON string representing the model with metrics
     * @throws Exception If parsing fails
     */
    public String parseToJson(String xmiContent, String fileName) throws Exception {
        System.out.println("Line 63: Starting parseToJson method");
        System.out.println("Line 64: Parsing XMI content to XMI model...");
        // Parse the XMI content
        sdMetricsParser.parseXMI(xmiContent, fileName);
        
        System.out.println("Line 68: retrieving components from parser...");
        
        // Get components from parser
        Model model = sdMetricsParser.getModel();
        MetricStore metricStore = sdMetricsParser.getMetricStore();
        MetricsEngine metricsEngine = sdMetricsParser.getMetricsEngine();
        
        System.out.println("Line 74: model: " + model);
        System.out.println("Line 75: metricStore: " + metricStore);
        System.out.println("Line 76: metricsEngine: " + metricsEngine);
        
        if (model == null) {
            System.err.println("Line 79: Model is null, cannot convert to JSON");
            throw new IllegalStateException("Model is null, cannot convert to JSON");
        }
        
        // Build the JSON structure
        Map<String, Object> rootJson = new HashMap<>();
        System.out.println("Line 85: Created root JSON map");

        System.out.println("Line 87: Extracting model name...");
        
        // Process packages
        List<Map<String, Object>> packagesJson = extractPackages(model, metricStore, metricsEngine);
        rootJson.put("packages", packagesJson);
        System.out.println("Line 92: Extracted packages: " + packagesJson.size() + " packages found.");
        
        // Process interfaces (top-level)
        List<Map<String, Object>> interfacesJson = extractInterfaces(model, metricStore, metricsEngine);
        rootJson.put("interfaces", interfacesJson);
        System.out.println("Line 97: Extracted interfaces: " + interfacesJson.size() + " interfaces found.");

        // Process parent classes
        List<Map<String, Object>> parentClassesJson = extractParentClasses(model, metricStore, metricsEngine);
        rootJson.put("parentClasses", parentClassesJson);
        System.out.println("Line 102: Extracted parent classes: " + parentClassesJson.size() + " parent classes found.");
        
        // Convert to JSON string
        System.out.println("Line 106: Converting model to JSON string...");
        String jsonResult = jsonMapper.writeValueAsString(rootJson);
        System.out.println("Line 108: JSON conversion completed");
        return jsonResult;
    }
    
    /**
     * Extracts packages from the model.
     */
    private List<Map<String, Object>> extractPackages(Model model, MetricStore metricStore, MetricsEngine metricsEngine) {
        System.out.println("Line 116: Starting extractPackages method");
        List<Map<String, Object>> packages = new ArrayList<>();
        
        // Get package type from metamodel
        MetaModel metaModel = model.getMetaModel();
        System.out.println("Line 121: metaModel: " + metaModel);
        
        // Find package elements
        for (ModelElement element : model) {
            System.out.println("Line 125: Processing element: " + element);
            if (element.getType().getName().equalsIgnoreCase("package")) {
                System.out.println("Line 127: Found package: " + element.getName());
                Map<String, Object> packageJson = new HashMap<>();
                packageJson.put("name", element.getName());
                
                // Extract classes in this package
                List<Map<String, Object>> classesJson = extractClassesForPackage(element, model, metricStore, metricsEngine);
                packageJson.put("classes", classesJson);
                
                // Extract interfaces in this package
                List<Map<String, Object>> interfacesJson = extractInterfacesForPackage(element, model, metricStore, metricsEngine);
                packageJson.put("interfaces", interfacesJson);
                
                // Create children array containing names of all classes and interfaces in this package
                List<String> children = new ArrayList<>();
                
                // Add class names to children array
                for (Map<String, Object> classObj : classesJson) {
                    children.add((String) classObj.get("name"));
                }
                
                // Add interface names to children array
                for (Map<String, Object> interfaceObj : interfacesJson) {
                    children.add((String) interfaceObj.get("name"));
                }
                
                // Add children array to package JSON
                packageJson.put("children", children);
                System.out.println("Added " + children.size() + " children to package " + element.getName());
                
                // Extract package metrics
                Map<String, Object> metricsJson = extractMetrics(element, metricsEngine, metricStore);
                packageJson.put("metrics", metricsJson);
                
                packages.add(packageJson);
                System.out.println("Line 142: Extracted package: " + element.getName() + " with " + 
                    classesJson.size() + " classes and " + interfacesJson.size() + " interfaces.");
            }
        }
        
        System.out.println("Line 147: Finished extractPackages method");
        return packages;
    }
    
    /**
     * Extracts classes for a specific package.
     */
    private List<Map<String, Object>> extractClassesForPackage(ModelElement packageElement, Model model, 
            MetricStore metricStore, MetricsEngine metricsEngine) {
        System.out.println("Line 156: Starting extractClassesForPackage for package: " + packageElement.getName());
        List<Map<String, Object>> classes = new ArrayList<>();
        
        // Get owned elements of the package
        Collection<ModelElement> ownedElements = packageElement.getOwnedElements();
        if (ownedElements != null) {
            System.out.println("Line 162: Found " + ownedElements.size() + " owned elements");
            for (ModelElement element : ownedElements) {
                if (element.getType().getName().equalsIgnoreCase("class")) {
                    System.out.println("Line 165: Processing class: " + element.getName());
                    Map<String, Object> classJson = extractClassDetails(element, metricsEngine, metricStore);
                    classes.add(classJson);
                }
            }
        }
        
        System.out.println("Line 172: Finished extractClassesForPackage with " + classes.size() + " classes");
        return classes;
    }
    
    /**
     * Extracts interfaces for a specific package.
     */
    private List<Map<String, Object>> extractInterfacesForPackage(ModelElement packageElement, Model model, 
            MetricStore metricStore, MetricsEngine metricsEngine) {
        System.out.println("Line 181: Starting extractInterfacesForPackage for package: " + packageElement.getName());
        List<Map<String, Object>> interfaces = new ArrayList<>();
        
        // Get owned elements of the package
        Collection<ModelElement> ownedElements = packageElement.getOwnedElements();
        if (ownedElements != null) {
            System.out.println("Line 187: Found " + ownedElements.size() + " owned elements");
            for (ModelElement element : ownedElements) {
                if (element.getType().getName().equalsIgnoreCase("interface")) {
                    System.out.println("Line 190: Processing interface: " + element.getName());
                    Map<String, Object> interfaceJson = extractInterfaceDetails(element, metricsEngine, metricStore);
                    interfaces.add(interfaceJson);
                }
            }
        }
        
        System.out.println("Line 197: Finished extractInterfacesForPackage with " + interfaces.size() + " interfaces");
        return interfaces;
    }
    
    /**
     * Extracts all interfaces from the model.
     */
    private List<Map<String, Object>> extractInterfaces(Model model, MetricStore metricStore, MetricsEngine metricsEngine) {
        System.out.println("Line 206: Starting extractInterfaces method");
        List<Map<String, Object>> interfaces = new ArrayList<>();
        
        for (ModelElement element : model) {
            if (element.getType().getName().equalsIgnoreCase("interface")) {
                System.out.println("Line 211: Processing interface: " + element.getName());
                Map<String, Object> interfaceJson = extractInterfaceDetails(element, metricsEngine, metricStore);
                
                // Add package information
                ModelElement owner = element.getOwner();
                if (owner != null && owner.getType().getName().equalsIgnoreCase("package")) {
                    interfaceJson.put("package", owner.getName());
                    System.out.println("Line 217: Added package info: " + owner.getName());
                }
                
                interfaces.add(interfaceJson);
            }
        }
        
        System.out.println("Line 223: Finished extractInterfaces with " + interfaces.size() + " interfaces");
        return interfaces;
    }
    
    /**
     * Extracts parent classes from the model.
     */
    private List<Map<String, Object>> extractParentClasses(Model model, MetricStore metricStore, MetricsEngine metricsEngine) {
        System.out.println("Line 232: Starting extractParentClasses method");
        List<Map<String, Object>> parentClasses = new ArrayList<>();
        
        for (ModelElement element : model) {
            if (element.getType().getName().equalsIgnoreCase("class")) {
                // Check if this class has children (subclasses)
                Collection<ModelElement> childRelations = element.getRelations("subclass");
                
                // Also check for generalization relationships in the other direction
                boolean hasChildren = false;
                List<String> children = new ArrayList<>();
                
                if (childRelations != null && !childRelations.isEmpty()) {
                    hasChildren = true;
                    for (ModelElement child : childRelations) {
                        children.add(child.getName());
                    }
                    System.out.println("Line 240: Found parent class: " + element.getName() + 
                        " with " + childRelations.size() + " children via subclass relation");
                }
                
                // Look for generalization relationships in model
                for (ModelElement possibleChild : model) {
                    if (possibleChild.getType().getName().equalsIgnoreCase("class")) {
                        try {
                            // Check if the element has generalizations pointing to our potential parent class
                            Collection<ModelElement> genElements = possibleChild.getOwnedElements();
                            if (genElements != null) {
                                for (ModelElement genElement : genElements) {
                                    if (genElement.getType().getName().equalsIgnoreCase("generalization")) {
                                        // Try to get the 'general' attribute which points to parent
                                        try {
                                            ModelElement general = genElement.getRefAttribute("general");
                                            if (general != null && general.getXMIID().equals(element.getXMIID())) {
                                                children.add(possibleChild.getName());
                                                hasChildren = true;
                                                System.out.println("Found child " + possibleChild.getName() + 
                                                    " for parent " + element.getName() + " via generalization");
                                            }
                                        } catch (Exception e) {
                                            // Ignore if attribute not found
                                        }
                                    }
                                }
                            }
                        } catch (Exception e) {
                            // Ignore exceptions when searching for generalizations
                        }
                    }
                }
                
                if (hasChildren) {
                    Map<String, Object> parentJson = new HashMap<>();
                    parentJson.put("name", element.getName());
                    
                    // Add package information
                    ModelElement owner = element.getOwner();
                    if (owner != null && owner.getType().getName().equalsIgnoreCase("package")) {
                        parentJson.put("package", owner.getName());
                    }
                    
                    // Check if abstract - safe attribute retrieval
                    boolean isAbstract = isElementAbstract(element);
                    parentJson.put("isAbstract", isAbstract);
                    
                    // Add children (already collected)
                    parentJson.put("children", children);
                    
                    // Extract parent class metrics
                    Map<String, Object> metricsJson = extractInheritanceMetrics(element, metricsEngine, metricStore);
                    parentJson.put("metrics", metricsJson);
                    
                    parentClasses.add(parentJson);
                }
            }
        }
        
        System.out.println("Line 269: Finished extractParentClasses with " + parentClasses.size() + " parent classes");
        return parentClasses;
    }
    
    /**
     * Extracts details for a class.
     */
    private Map<String, Object> extractClassDetails(ModelElement classElement, MetricsEngine metricsEngine, MetricStore metricStore) {
        System.out.println("Line 278: Starting extractClassDetails for class: " + classElement.getName());
        Map<String, Object> classJson = new HashMap<>();
        
        // Basic properties
        classJson.put("name", classElement.getName());
        
        // Check if abstract - safe attribute retrieval
        boolean isAbstract = false;
        try {
            String isAbstractStr = classElement.getPlainAttribute("isabstract");
            isAbstract = "true".equalsIgnoreCase(isAbstractStr);
        } catch (Exception e) {
            // Check for stereotype instead
            try {
                Collection<?> stereotypes = classElement.getSetAttribute("stereotype");
                if (stereotypes != null) {
                    for (Object stereotype : stereotypes) {
                        if (stereotype instanceof String && 
                            ((String) stereotype).equalsIgnoreCase("abstract")) {
                            isAbstract = true;
                            break;
                        }
                    }
                }
            } catch (Exception e2) {
                System.out.println("Warning: isabstract attribute and stereotype not found for class: " + 
                    classElement.getName());
            }
        }
        classJson.put("isAbstract", isAbstract);
        
        // Extract attributes
        List<Map<String, Object>> attributes = extractAttributes(classElement);
        classJson.put("attributes", attributes);
        System.out.println("Line 291: Extracted " + attributes.size() + " attributes");
        
        // Extract methods
        List<Map<String, Object>> methods = extractMethods(classElement);
        classJson.put("methods", methods);
        System.out.println("Line 295: Extracted " + methods.size() + " methods");
        
        // Extract parent classes - multiple approaches for finding inheritance
        List<String> parents = new ArrayList<>();
        
        // 1. Try via "parent" attribute
        try {
            ModelElement parentElement = classElement.getRefAttribute("parent");
            if (parentElement != null) {
                parents.add(parentElement.getName());
                System.out.println("Found parent via parent attribute: " + parentElement.getName());
            }
        } catch (Exception e) {
            // Attribute not found, continue to next approach
        }
        
        // 2. Try via "superclass" relations
        try {
            Collection<ModelElement> superclasses = classElement.getRelations("superclass");
            if (superclasses != null && !superclasses.isEmpty()) {
                for (ModelElement superclass : superclasses) {
                    if (!parents.contains(superclass.getName())) {
                        parents.add(superclass.getName());
                        System.out.println("Found parent via superclass relation: " + superclass.getName());
                    }
                }
            }
        } catch (Exception e) {
            // Relation not found, continue to next approach
        }
        
        // 3. Try via generalization elements
        try {
            Collection<ModelElement> ownedElements = classElement.getOwnedElements();
            if (ownedElements != null) {
                for (ModelElement owned : ownedElements) {
                    if (owned.getType().getName().equalsIgnoreCase("generalization")) {
                        try {
                            ModelElement general = owned.getRefAttribute("general");
                            if (general != null && !parents.contains(general.getName())) {
                                parents.add(general.getName());
                                System.out.println("Found parent via generalization: " + general.getName());
                            }
                        } catch (Exception e) {
                            // Attribute not found
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Error processing generalizations
        }
        
        classJson.put("parents", parents);
        
        // Extract implemented interfaces - try multiple approaches
        List<String> implementedInterfaces = new ArrayList<>();
        
        // 1. Try via "implements" attribute
        try {
            Collection<?> interfaces = classElement.getSetAttribute("implements");
            if (interfaces != null) {
                for (Object interfaceObj : interfaces) {
                    if (interfaceObj instanceof ModelElement) {
                        implementedInterfaces.add(((ModelElement) interfaceObj).getName());
                    }
                }
                System.out.println("Found " + implementedInterfaces.size() + " implemented interfaces via implements attribute");
            }
        } catch (Exception e) {
            // Attribute not found, continue to next approach
        }
        
        // 2. Try via InterfaceRealization elements
        try {
            Collection<ModelElement> ownedElements = classElement.getOwnedElements();
            if (ownedElements != null) {
                for (ModelElement owned : ownedElements) {
                    if (owned.getType().getName().equalsIgnoreCase("interfacerealization")) {
                        try {
                            ModelElement contract = owned.getRefAttribute("contract");
                            if (contract != null && !implementedInterfaces.contains(contract.getName())) {
                                implementedInterfaces.add(contract.getName());
                                System.out.println("Found implemented interface via realization: " + contract.getName());
                            }
                        } catch (Exception e) {
                            // Attribute not found
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Error processing interface realizations
        }
        
        // 3. Try via client relations (if interface has realizations pointing to this class)
        try {
            Collection<ModelElement> clientRelations = classElement.getRelations("client");
            if (clientRelations != null) {
                for (ModelElement relation : clientRelations) {
                    if (relation.getType().getName().equalsIgnoreCase("interfacerealization")) {
                        try {
                            ModelElement contract = relation.getRefAttribute("contract");
                            if (contract != null && contract.getType().getName().equalsIgnoreCase("interface") &&
                                !implementedInterfaces.contains(contract.getName())) {
                                implementedInterfaces.add(contract.getName());
                                System.out.println("Found implemented interface via client relation: " + contract.getName());
                            }
                        } catch (Exception e) {
                            // Attribute not found
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Error processing client relations
        }
        
        classJson.put("implements", implementedInterfaces);
        
        // Extract metrics
        Map<String, Object> metrics = extractAllMetrics(classElement, metricsEngine, metricStore);
        classJson.put("metrics", metrics);
        
        System.out.println("Line 320: Finished extractClassDetails");
        return classJson;
    }
    
   /**
     * Extracts details for an interface.
     */
    private Map<String, Object> extractInterfaceDetails(ModelElement interfaceElement, MetricsEngine metricsEngine, MetricStore metricStore) {
        System.out.println("Line 329: Starting extractInterfaceDetails for interface: " + interfaceElement.getName());
        Map<String, Object> interfaceJson = new HashMap<>();
        
        // Basic properties
        interfaceJson.put("name", interfaceElement.getName());
        
        // Extract methods
        List<Map<String, Object>> methods = extractMethods(interfaceElement);
        interfaceJson.put("methods", methods);
        System.out.println("Line 337: Extracted " + methods.size() + " methods");
        
        // Find all classes that implement this interface
        List<String> implementingClasses = findImplementingClasses(interfaceElement);
        interfaceJson.put("realizedBy", implementingClasses);
        System.out.println("Found " + implementingClasses.size() + " classes implementing " + interfaceElement.getName());
        
        // Extract metrics
        Map<String, Object> metrics = extractInterfaceMetrics(interfaceElement, metricsEngine, metricStore);
        interfaceJson.put("metrics", metrics);
        
        System.out.println("Line 342: Finished extractInterfaceDetails");
        return interfaceJson;
    }

    /**
     * Finds all classes that implement a specific interface.
     */
    private List<String> findImplementingClasses(ModelElement interfaceElement) {
        System.out.println("Finding classes that implement interface: " + interfaceElement.getName());
        List<String> implementingClasses = new ArrayList<>();
        Model model = sdMetricsParser.getModel();
        
        // Get the XMI ID of the interface to match against
        String interfaceXMIID = interfaceElement.getXMIID();
        System.out.println("Interface XMIID: " + interfaceXMIID);
        
        // Loop through all elements in the model
        for (ModelElement element : model) {
            // Only check class elements
            if (element.getType().getName().equalsIgnoreCase("class")) {
                boolean implementsInterface = false;
                
                // Approach 1: Check via "implements" attribute
                try {
                    Collection<?> interfaces = element.getSetAttribute("implements");
                    if (interfaces != null) {
                        for (Object interfaceObj : interfaces) {
                            if (interfaceObj instanceof ModelElement) {
                                ModelElement impl = (ModelElement) interfaceObj;
                                if (impl.getXMIID().equals(interfaceXMIID)) {
                                    implementsInterface = true;
                                    System.out.println("Class " + element.getName() + 
                                        " implements interface " + interfaceElement.getName() + 
                                        " via implements attribute");
                                    break;
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    // Attribute not found, continue to next approach
                }
                
                // Approach 2: Check via InterfaceRealization elements
                if (!implementsInterface) {
                    try {
                        Collection<ModelElement> ownedElements = element.getOwnedElements();
                        if (ownedElements != null) {
                            for (ModelElement owned : ownedElements) {
                                if (owned.getType().getName().equalsIgnoreCase("interfacerealization")) {
                                    try {
                                        ModelElement contract = owned.getRefAttribute("contract");
                                        if (contract != null && contract.getXMIID().equals(interfaceXMIID)) {
                                            implementsInterface = true;
                                            System.out.println("Class " + element.getName() + 
                                                " implements interface " + interfaceElement.getName() + 
                                                " via interface realization");
                                            break;
                                        }
                                    } catch (Exception e) {
                                        // Attribute not found
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        // Error processing interface realizations
                    }
                }
                
                // Approach 3: Check if interface has realizations pointing to this class
                if (!implementsInterface) {
                    try {
                        Collection<ModelElement> realizationElements = interfaceElement.getRelations("supplier");
                        if (realizationElements != null) {
                            for (ModelElement realization : realizationElements) {
                                if (realization.getType().getName().equalsIgnoreCase("interfacerealization")) {
                                    try {
                                        ModelElement client = realization.getRefAttribute("client");
                                        if (client != null && client.getXMIID().equals(element.getXMIID())) {
                                            implementsInterface = true;
                                            System.out.println("Class " + element.getName() + 
                                                " implements interface " + interfaceElement.getName() + 
                                                " via supplier relation");
                                            break;
                                        }
                                    } catch (Exception e) {
                                        // Attribute not found
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        // Error processing supplier relations
                    }
                }
                
                // Add the class to the list if it implements the interface
                if (implementsInterface) {
                    implementingClasses.add(element.getName());
                }
            }
        }
        
        System.out.println("Found " + implementingClasses.size() + 
            " classes implementing interface " + interfaceElement.getName());
        return implementingClasses;
    }
    

    /**
 * Extracts attributes for a class.
 */
    private List<Map<String, Object>> extractAttributes(ModelElement classElement) {
        System.out.println("Starting extractAttributes for class: " + classElement.getName());
        List<Map<String, Object>> attributes = new ArrayList<>();
        
        Collection<ModelElement> attributeElements = classElement.getOwnedElements();
        if (attributeElements != null) {
            for (ModelElement element : attributeElements) {
                // Check for Property elements and ports
                if (element.getType().getName().equalsIgnoreCase("property") ||
                    element.getType().getName().equalsIgnoreCase("port")) {
                    
                    System.out.println("Processing attribute: " + element.getName());
                    Map<String, Object> attributeJson = new HashMap<>();
                    attributeJson.put("name", element.getName());
                    
                    // Extract type with robust resolution
                    String typeValue = "";
                    
                    // First try to get type via reference
                    try {
                        ModelElement typeElement = element.getRefAttribute("type");
                        if (typeElement != null) {
                            typeValue = typeElement.getName();
                            System.out.println("Found type via reference: " + typeValue);
                        }
                    } catch (Exception e) {
                        System.out.println("No type reference found, trying plain attribute");
                    }
                    
                    // If no reference, try the type attribute directly
                    if (typeValue.isEmpty()) {
                        try {
                            String typeStr = element.getPlainAttribute("type");
                            if (typeStr != null && !typeStr.isEmpty()) {
                                if (typeStr.startsWith("_")) {
                                    // Resolve type ID to a name
                                    ModelElement resolvedType = resolveTypeById(typeStr);
                                    if (resolvedType != null) {
                                        typeValue = resolvedType.getName();
                                        System.out.println("Resolved type ID " + typeStr + " to " + typeValue);
                                    } else {
                                        // Map common XMI type IDs directly
                                        switch (typeStr.toLowerCase()) {
                                            case "_integer":
                                                typeValue = "Integer";
                                                break;
                                            case "_string":
                                                typeValue = "String";
                                                break;
                                            case "_boolean":
                                                typeValue = "Boolean";
                                                break;
                                            case "_double":
                                                typeValue = "Double";
                                                break;
                                            default:
                                                typeValue = typeStr; // Fallback to the ID as-is
                                                System.out.println("Unresolved type ID " + typeStr + ", using as-is");
                                        }
                                        System.out.println("Mapped type ID " + typeStr + " to " + typeValue);
                                    }
                                } else {
                                    typeValue = typeStr;
                                }
                            }
                        } catch (Exception e) {
                            System.out.println("No type attribute found: " + e.getMessage());
                        }
                    }
                    
                    // Final type fixup - capitalize standard types and handle edge cases
                    if (typeValue.equalsIgnoreCase("string")) {
                        typeValue = "String";
                    } else if (typeValue.equalsIgnoreCase("integer") || typeValue.equalsIgnoreCase("int")) {
                        typeValue = "Integer";
                    } else if (typeValue.equalsIgnoreCase("boolean") || typeValue.equalsIgnoreCase("bool")) {
                        typeValue = "Boolean";
                    } else if (typeValue.equalsIgnoreCase("double")) {
                        typeValue = "Double";
                    }
                    
                    // Default to String if no type found
                    if (typeValue.isEmpty()) {
                        typeValue = "String";
                        System.out.println("No type specified, defaulting to String");
                    }
                    
                    attributeJson.put("type", typeValue);
                    
                    // Extract visibility
                    String visibility = "";
                    try {
                        String visibilityStr = element.getPlainAttribute("visibility");
                        if (visibilityStr != null && !visibilityStr.isEmpty()) {
                            visibility = visibilityStr;
                        }
                    } catch (Exception e) {
                        System.out.println("No visibility specified, defaulting to private");
                    }
                    
                    if (visibility.isEmpty()) {
                        visibility = "private";
                    }
                    
                    attributeJson.put("visibility", visibility);
                    
                    // Identify ports
                    if (element.getType().getName().equalsIgnoreCase("port")) {
                        attributeJson.put("isPort", true);
                        System.out.println("Attribute " + element.getName() + " identified as a port");
                    }
                    
                    // Extract qualifiers
                    try {
                        Collection<ModelElement> qualifiers = element.getOwnedElements();
                        if (qualifiers != null) {
                            for (ModelElement qualifier : qualifiers) {
                                if (qualifier.getType().getName().equalsIgnoreCase("qualifier")) {
                                    Map<String, Object> qualifierJson = new HashMap<>();
                                    qualifierJson.put("name", qualifier.getName());
                                    
                                    // Resolve qualifier type
                                    String qualType = "String"; // Default
                                    try {
                                        ModelElement typeElem = qualifier.getRefAttribute("type");
                                        if (typeElem != null) {
                                            qualType = typeElem.getName();
                                            System.out.println("Found qualifier type via reference: " + qualType);
                                        } else {
                                            String typeStr = qualifier.getPlainAttribute("type");
                                            if (typeStr != null && !typeStr.isEmpty()) {
                                                if (typeStr.startsWith("_")) {
                                                    ModelElement resolvedType = resolveTypeById(typeStr);
                                                    if (resolvedType != null) {
                                                        qualType = resolvedType.getName();
                                                        System.out.println("Resolved qualifier type ID " + typeStr + " to " + qualType);
                                                    } else {
                                                        switch (typeStr.toLowerCase()) {
                                                            case "_integer": qualType = "Integer"; break;
                                                            case "_string": qualType = "String"; break;
                                                            case "_boolean": qualType = "Boolean"; break;
                                                            default: qualType = typeStr;
                                                        }
                                                        System.out.println("Mapped qualifier type " + typeStr + " to " + qualType);
                                                    }
                                                } else {
                                                    qualType = typeStr;
                                                }
                                            }
                                        }
                                    } catch (Exception e) {
                                        System.out.println("Error resolving qualifier type: " + e.getMessage());
                                    }
                                    
                                    qualifierJson.put("type", qualType);
                                    attributeJson.put("qualifier", qualifierJson);
                                    System.out.println("Found qualifier: " + qualifier.getName() + " with type " + qualType);
                                    break; // Assuming one qualifier per attribute, adjust if multiple are needed
                                }
                            }
                        }
                    } catch (Exception e) {
                        System.out.println("Error checking qualifiers: " + e.getMessage());
                    }
                    
                    attributes.add(attributeJson);
                }
            }
        }
        
        System.out.println("Finished extractAttributes with " + attributes.size() + " attributes");
        return attributes;
    }


    // Add this as a class method
    /**
     * Resolves a type by its XMI ID.
     */
    private ModelElement resolveTypeById(String typeId) {
        Model model = sdMetricsParser.getModel();
        for (ModelElement element : model) {
            if (element.getXMIID() != null && element.getXMIID().equals(typeId)) {
                return element;
            }
        }
        return null;
    }

    /**
     * Method to check if an element is abstract
     */
    private boolean isElementAbstract(ModelElement element) {
        // First try direct case-sensitive match
        try {
            String isAbstractStr = element.getPlainAttribute("isAbstract");
            if (isAbstractStr != null && "true".equalsIgnoreCase(isAbstractStr)) {
                System.out.println("Found element " + element.getName() + " is abstract via isAbstract attribute");
                return true;
            }
        } catch (Exception e) {
            // Ignore and try next approach
        }
        
        // Second, try with lowercase (some XMI tools use lowercase)
        try {
            String isAbstractStr = element.getPlainAttribute("isabstract");
            if (isAbstractStr != null && "true".equalsIgnoreCase(isAbstractStr)) {
                System.out.println("Found element " + element.getName() + " is abstract via isabstract attribute");
                return true;
            }
        } catch (Exception e) {
            // Ignore and try next approach
        }
        
        // Check for abstract stereotype
        try {
            Collection<?> stereotypes = element.getSetAttribute("stereotype");
            if (stereotypes != null) {
                for (Object stereotype : stereotypes) {
                    if (stereotype instanceof String && ((String) stereotype).equalsIgnoreCase("abstract")) {
                        System.out.println("Found element " + element.getName() + " is abstract via stereotype");
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            // Ignore and continue
        }
        
        // Special handling for typical abstract classes by convention
        String elementName = element.getName();
        if (elementName != null && 
            (elementName.equals("Person") || elementName.equals("Professor") || 
            elementName.contains("Abstract") || elementName.startsWith("Base"))) {
            System.out.println("Assuming element " + element.getName() + " is abstract by convention");
            return true;
        }
        
        return false;
    }
    /**
     * Extracts methods for a class or interface.
     */
    /**
 * Extracts methods for a class or interface.
 */
    private List<Map<String, Object>> extractMethods(ModelElement element) {
        System.out.println("Starting extractMethods for element: " + element.getName());
        List<Map<String, Object>> methods = new ArrayList<>();
        boolean isInterface = element.getType().getName().equalsIgnoreCase("interface");
        
        Collection<ModelElement> methodElements = element.getOwnedElements();
        if (methodElements != null) {
            for (ModelElement method : methodElements) {
                if (method.getType().getName().equalsIgnoreCase("operation")) {
                    System.out.println("Processing method: " + method.getName());
                    Map<String, Object> methodJson = new HashMap<>();
                    methodJson.put("name", method.getName());
                    
                    // Default return type is void
                    String returnType = "void";
                    boolean isQuery = false;
                    
                    // Check if this is a query operation
                    try {
                        String isQueryStr = method.getPlainAttribute("isQuery");
                        isQuery = "true".equalsIgnoreCase(isQueryStr);
                        if (isQuery) {
                            System.out.println("Method " + method.getName() + " is a query operation");
                            // Infer return type for getters from associated attribute
                            String methodName = method.getName().toLowerCase();
                            if (methodName.startsWith("get")) {
                                String attrName = methodName.substring(3);
                                for (ModelElement attr : element.getOwnedElements()) {
                                    if (attr.getType().getName().equalsIgnoreCase("property") &&
                                        attr.getName().equalsIgnoreCase(attrName)) {
                                        List<Map<String, Object>> attrs = extractAttributes(element);
                                        for (Map<String, Object> attrMap : attrs) {
                                            if (attrMap.get("name").equals(attrName)) {
                                                returnType = (String) attrMap.get("type");
                                                System.out.println("Inferred return type for " + method.getName() + ": " + returnType);
                                                break;
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        System.out.println("Error checking isQuery for " + method.getName() + ": " + e.getMessage());
                    }
                    
                    // Extract parameters and override return type if specified
                    List<Map<String, Object>> parameters = new ArrayList<>();
                    try {
                        Collection<ModelElement> paramElements = method.getOwnedElements();
                        if (paramElements != null) {
                            for (ModelElement param : paramElements) {
                                if (param.getType().getName().equalsIgnoreCase("parameter")) {
                                    String direction = "";
                                    try {
                                        direction = param.getPlainAttribute("direction");
                                    } catch (Exception e) {
                                        // Default to "in" if not specified
                                        direction = "in";
                                    }
                                    
                                    if ("return".equalsIgnoreCase(direction)) {
                                        try {
                                            ModelElement typeElem = param.getRefAttribute("type");
                                            if (typeElem != null) {
                                                returnType = typeElem.getName();
                                                System.out.println("Found return type via reference: " + returnType);
                                            } else {
                                                String typeStr = param.getPlainAttribute("type");
                                                if (typeStr != null && !typeStr.isEmpty()) {
                                                    if (typeStr.startsWith("_")) {
                                                        ModelElement resolvedType = resolveTypeById(typeStr);
                                                        if (resolvedType != null) {
                                                            returnType = resolvedType.getName();
                                                            System.out.println("Resolved return type ID " + typeStr + " to " + returnType);
                                                        } else {
                                                            switch (typeStr.toLowerCase()) {
                                                                case "_integer": returnType = "Integer"; break;
                                                                case "_string": returnType = "String"; break;
                                                                case "_boolean": returnType = "Boolean"; break;
                                                                default: returnType = typeStr;
                                                            }
                                                            System.out.println("Mapped return type " + typeStr + " to " + returnType);
                                                        }
                                                    } else {
                                                        returnType = typeStr;
                                                    }
                                                }
                                            }
                                        } catch (Exception e) {
                                            System.out.println("Error getting return type: " + e.getMessage());
                                        }
                                    } else {
                                        Map<String, Object> paramJson = new HashMap<>();
                                        paramJson.put("name", param.getName());
                                        
                                        String paramType = "Object"; // Default
                                        try {
                                            ModelElement typeElem = param.getRefAttribute("type");
                                            if (typeElem != null) {
                                                paramType = typeElem.getName();
                                                System.out.println("Found parameter type via reference: " + paramType);
                                            } else {
                                                String typeStr = param.getPlainAttribute("type");
                                                if (typeStr != null && !typeStr.isEmpty()) {
                                                    if (typeStr.startsWith("_")) {
                                                        ModelElement resolvedType = resolveTypeById(typeStr);
                                                        if (resolvedType != null) {
                                                            paramType = resolvedType.getName();
                                                            System.out.println("Resolved parameter type ID " + typeStr + " to " + paramType);
                                                        } else {
                                                            switch (typeStr.toLowerCase()) {
                                                                case "_integer": paramType = "Integer"; break;
                                                                case "_string": paramType = "String"; break;
                                                                case "_boolean": paramType = "Boolean"; break;
                                                                default: paramType = typeStr;
                                                            }
                                                            System.out.println("Mapped parameter type " + typeStr + " to " + paramType);
                                                        }
                                                    } else {
                                                        paramType = typeStr;
                                                    }
                                                }
                                            }
                                        } catch (Exception e) {
                                            System.out.println("Error getting parameter type: " + e.getMessage());
                                        }
                                        
                                        // Fix common types
                                        if (paramType.equalsIgnoreCase("string")) paramType = "String";
                                        else if (paramType.equalsIgnoreCase("integer") || paramType.equalsIgnoreCase("int")) paramType = "Integer";
                                        else if (paramType.equalsIgnoreCase("boolean") || paramType.equalsIgnoreCase("bool")) paramType = "Boolean";
                                        else if (paramType.equalsIgnoreCase("double")) paramType = "Double";
                                        
                                        paramJson.put("type", paramType);
                                        parameters.add(paramJson);
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        System.out.println("Error processing parameters for " + method.getName() + ": " + e.getMessage());
                    }
                    
                    // Add parameters only if present (query methods like getName should have none unless specified)
                    if (!parameters.isEmpty() && !isQuery) {
                        methodJson.put("parameters", parameters);
                    }
                    
                    // Fix common return types
                    if (returnType.equalsIgnoreCase("string")) returnType = "String";
                    else if (returnType.equalsIgnoreCase("integer") || returnType.equalsIgnoreCase("int")) returnType = "Integer";
                    else if (returnType.equalsIgnoreCase("boolean") || returnType.equalsIgnoreCase("bool")) returnType = "Boolean";
                    else if (returnType.equalsIgnoreCase("double")) returnType = "Double";
                    
                    methodJson.put("returnType", returnType);
                    
                    // Determine abstract status: interface methods are always abstract, query methods are not
                    boolean isAbstract = isInterface ? true : (isQuery ? false : isElementAbstract(method));
                    methodJson.put("isAbstract", isAbstract);
                    
                    // Get visibility
                    String visibility = "";
                    try {
                        String visibilityStr = method.getPlainAttribute("visibility");
                        if (visibilityStr != null && !visibilityStr.isEmpty()) {
                            visibility = visibilityStr;
                        }
                    } catch (Exception e) {
                        // No visibility specified
                    }
                    
                    // Default to public for methods
                    if (visibility.isEmpty()) {
                        visibility = "public";
                    }
                    
                    methodJson.put("visibility", visibility);
                    
                    methods.add(methodJson);
                }
            }
        }
        
        System.out.println("Finished extractMethods with " + methods.size() + " methods");
        return methods;
    }
    /**
     * Extracts metrics for a model element.
     */
    private Map<String, Object> extractMetrics(ModelElement element, MetricsEngine metricsEngine, MetricStore metricStore) {
        System.out.println("Line 418: Starting extractMetrics for element: " + element.getName());
        Map<String, Object> metricsJson = new HashMap<>();
        
        // Get metrics for package elements
        extractBasicMetricsForType(element, metricsEngine, metricStore, "R", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Ca", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Ce", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Dep_Out", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Dep_In", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "DepPack", metricsJson);
        
        System.out.println("Line 428: Finished extractMetrics");
        return metricsJson;
    }
    
    /**
     * Extracts all metrics for a class.
     */
    private Map<String, Object> extractAllMetrics(ModelElement element, MetricsEngine metricsEngine, MetricStore metricStore) {
        System.out.println("Line 437: Starting extractAllMetrics for element: " + element.getName());
        Map<String, Object> metricsJson = new HashMap<>();
        
        // Inheritance metrics
        extractBasicMetricsForType(element, metricsEngine, metricStore, "IFImpl", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NOC", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumDesc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumAnc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "DIT", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "CLD", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "OpsInh", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "AttrInh", metricsJson);
        
        // Coupling metrics
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Dep_Out", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Dep_In", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumAssEl_ssc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumAssEl_sb", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumAssEl_nsb", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "EC_Attr", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "IC_Attr", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "EC_Par", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "IC_Par", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Connectors", metricsJson);
        
        // Size metrics
        extractBasicMetricsForType(element, metricsEngine, metricStore, "TC_Attr", metricsJson);
        
        System.out.println("Line 461: Finished extractAllMetrics");
        return metricsJson;
    }
    
    /**
     * Extracts interface-specific metrics.
     */
    private Map<String, Object> extractInterfaceMetrics(ModelElement element, MetricsEngine metricsEngine, MetricStore metricStore) {
        System.out.println("Line 470: Starting extractInterfaceMetrics for element: " + element.getName());
        Map<String, Object> metricsJson = new HashMap<>();
        
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumAnc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumDesc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "EC_Attr", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "EC_Par", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "IC_Par", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "Assoc", metricsJson);
        
        System.out.println("Line 479: Finished extractInterfaceMetrics");
        return metricsJson;
    }
    
    /**
     * Extracts inheritance-specific metrics for parent classes.
     */
    private Map<String, Object> extractInheritanceMetrics(ModelElement element, MetricsEngine metricsEngine, MetricStore metricStore) {
        System.out.println("Line 488: Starting extractInheritanceMetrics for element: " + element.getName());
        Map<String, Object> metricsJson = new HashMap<>();
        
        extractBasicMetricsForType(element, metricsEngine, metricStore, "IFImpl", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NOC", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumDesc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "NumAnc", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "DIT", metricsJson);
        extractBasicMetricsForType(element, metricsEngine, metricStore, "CLD", metricsJson);
        
        System.out.println("Line 498: Finished extractInheritanceMetrics");
        return metricsJson;
    }
    
    /**
     * Helper method to extract a metric value if it exists.
     */
    private void extractBasicMetricsForType(ModelElement element, MetricsEngine metricsEngine, 
            MetricStore metricStore, String metricName, Map<String, Object> metricsJson) {
        System.out.println("Line 507: Extracting metric " + metricName + " for element: " + element.getName());
        try {
            com.sdmetrics.metrics.Metric metric = metricStore.getMetric(element.getType(), metricName);
            if (metric != null) {
                Object value = metricsEngine.getMetricValue(element, metric);
                if (value != null) {
                    metricsJson.put(metricName, value);
                    System.out.println("Line 513: Metric " + metricName + " value: " + value);
                } else {
                    metricsJson.put(metricName, 0);
                    System.out.println("Line 516: Metric " + metricName + " set to 0 (null value)");
                }
            } else {
                // Metric not applicable for this element type
                metricsJson.put(metricName, 0);
                System.out.println("Line 521: Metric " + metricName + " not applicable, set to 0");
            }
        } catch (Exception e) {
            // If metric doesn't exist or error occurs, set to 0
            metricsJson.put(metricName, 0);
            System.out.println("Line 526: Metric " + metricName + " extraction failed, set to 0: " + e.getMessage());
        }
    }
}