"use client"

import { useEffect, useRef, useMemo } from "react"
import cytoscape from "cytoscape"
import fcose from "cytoscape-fcose"

// Register the fcose layout plugin with cytoscape
try {
  cytoscape.use(fcose)
} catch (error) {
  console.error("Failed to register fcose layout plugin:", error)
}

export default function GraphVisualization({
  matrices, // Contains relationship matrices
  jsonData, // Contains detailed structure
  onNodeSelect,
  zoomLevel = 1,
}) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  // --- Helper Functions ---
  // REMOVED calculateNodeSize as sizing is now handled by CSS classes

  // --- Edge Extraction Functions (Assumed Correct from Previous Version) ---
    // Extracts Inheritance (Generalization) edges: Parent -> Child
  const extractInheritanceEdges = (jsonData, entityToPackageMap) => {
    const edges = [];
    let edgeIdCounter = 1;
     const addedEdges = new Set(); // Track added edges to avoid duplicates

     const addEdge = (source, target, type) => {
         const key = `${source}->${target}->${type}`;
         if (!addedEdges.has(key)) {
             const sourcePackage = entityToPackageMap.get(source);
             const targetPackage = entityToPackageMap.get(target);
             edges.push({
                 data: {
                     id: `${type}-e${edgeIdCounter++}`,
                     source: source, // The subclass (origin of arrow visually)
                     target: target, // The superclass (where arrowhead points)
                     type: type,
                     interPackage: !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage,
                 },
                 classes: type + (!!sourcePackage && !!targetPackage && sourcePackage !== targetPackage ? ' interPackage' : '') // Add edge type class + interPackage class if applicable
             });
             addedEdges.add(key);
             return true;
         }
         return false;
     };

    // 1. Primary Source: jsonData.parentClasses (Child inherits FROM Parent)
    if (jsonData?.parentClasses && Array.isArray(jsonData.parentClasses)) {
      jsonData.parentClasses.forEach(parentInfo => {
        if (parentInfo?.name && parentInfo?.children && Array.isArray(parentInfo.children)) {
          const parentName = parentInfo.name;
          parentInfo.children.forEach(childName => {
             addEdge(childName, parentName, 'inheritance'); // Source: Child, Target: Parent
          });
        }
      });
    }

    // 2. Secondary Source (Matrix): matrices.Class_Inheritance
    // Matrix: Row (Child) inherits FROM Column (Parent). Edge: Child -> Parent
    if (matrices?.Class_Inheritance) {
        const { columns, rows } = matrices.Class_Inheritance;
        if (columns && rows) {
            Object.keys(rows).forEach(childName => {
                const dependencyArray = rows[childName];
                if (Array.isArray(dependencyArray)) {
                    dependencyArray.forEach((value, colIndex) => {
                        if (value === 1) {
                            const parentName = columns[colIndex];
                            if (parentName && childName !== parentName) {
                                addEdge(childName, parentName, 'inheritance');
                            }
                        }
                    });
                }
            });
        }
    }
    return edges;
  };

  // Extracts Implementation (Realization) edges: Class -> Interface
  const extractImplementationEdges = (jsonData, matrices, entityToPackageMap) => {
    const edges = [];
    let edgeIdCounter = 1;
     const addedEdges = new Set(); // Track added edges

      const addEdge = (source, target, type) => {
          const key = `${source}->${target}->${type}`;
          if (!addedEdges.has(key)) {
              const sourcePackage = entityToPackageMap.get(source);
              const targetPackage = entityToPackageMap.get(target);
              edges.push({
                  data: {
                      id: `${type}-e${edgeIdCounter++}`,
                      source: source, // Implementing Class
                      target: target, // Implemented Interface
                      type: type, // Keep type in data for potential logic
                      interPackage: !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage,
                  },
                 classes: type + (!!sourcePackage && !!targetPackage && sourcePackage !== targetPackage ? ' interPackage' : '') // Add edge type class + interPackage class if applicable
              });
              addedEdges.add(key);
              return true;
          }
          return false;
      };

    // 1. Primary Source: jsonData interfaces and classes
    // Check realizedBy on interfaces
    if (jsonData?.interfaces && Array.isArray(jsonData.interfaces)) {
        jsonData.interfaces.forEach(iface => {
            if (iface?.name && iface?.realizedBy && Array.isArray(iface.realizedBy)) {
                const interfaceName = iface.name;
                iface.realizedBy.forEach(className => {
                     addEdge(className, interfaceName, 'implementation'); // Source: Class, Target: Interface
                });
            }
        });
    }
     // Check implements on classes
    if (jsonData?.packages && Array.isArray(jsonData.packages)) {
        jsonData.packages.forEach(pkg => {
            if (pkg?.classes && Array.isArray(pkg.classes)) {
                pkg.classes.forEach(cls => {
                    if (cls?.name && cls?.implements && Array.isArray(cls.implements)) {
                        const className = cls.name;
                        cls.implements.forEach(ifaceName => {
                            addEdge(className, ifaceName, 'implementation');
                        });
                    }
                });
            }
        });
    }

    // 2. Secondary Source (Matrix): Interface_Realizations
    // Matrix: Row (Interface) is realized BY Column (Class). Edge: Class -> Interface
     if (matrices?.Interface_Realizations) {
        const { columns, rows } = matrices.Interface_Realizations;
        if (columns && rows) {
            Object.keys(rows).forEach(interfaceName => {
                const realizationArray = rows[interfaceName];
                 if (Array.isArray(realizationArray)) {
                     realizationArray.forEach((value, colIndex) => {
                         if (value === 1) {
                             const className = columns[colIndex];
                             if (className && interfaceName) {
                                 addEdge(className, interfaceName, 'implementation');
                             }
                         }
                     });
                 }
            });
        }
     }
    return edges;
  };

  // Extracts Association (value=1) and Dependency (value>1) edges
  const extractAssociationDependencyEdges = (matrices, entityToPackageMap) => {
    const edges = [];
    let edgeIdCounter = 1;
    const processedAssociationPairs = new Set(); // For handling potential bi-directional associations
    const addedDependencyEdges = new Set(); // Avoid duplicate dependencies

      const addEdge = (source, target, type, value = 0) => {
           const key = `${source}->${target}->${type}`;
           const pairKey = [source, target].sort().join('--');

           if (type === 'association') {
               if (!processedAssociationPairs.has(pairKey)) {
                    processedAssociationPairs.add(pairKey);
               } else {
                   return false; // Already added this association pair
               }
           } else if (type === 'dependency') {
                if (!addedDependencyEdges.has(key)) {
                    addedDependencyEdges.add(key);
                } else {
                    return false; // Already added this dependency
                }
           } else {
               return false; // Should not happen
           }

            const sourcePackage = entityToPackageMap.get(source);
            const targetPackage = entityToPackageMap.get(target);
            const isInterPackage = !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage;

             const edgeData = {
                 id: `${type}-e${edgeIdCounter++}`,
                 source: source,
                 target: target,
                 type: type, // Keep type in data
                 interPackage: isInterPackage,
             };
             if (type === 'dependency') edgeData.weight = value; // Keep weight in data if needed

             edges.push({
                 data: edgeData,
                 classes: type + (isInterPackage ? ' interPackage' : '') // Add edge type class + interPackage class if applicable
             });
             return true;
      };


    if (matrices?.Class_Dependencies) {
        const { columns, rows } = matrices.Class_Dependencies;
        if (columns && rows) {
            Object.keys(rows).forEach(sourceClass => {
                const dependencyArray = rows[sourceClass];
                if (Array.isArray(dependencyArray)) {
                    dependencyArray.forEach((value, colIndex) => {
                        if (value > 0) {
                            const targetClass = columns[colIndex];
                            if (targetClass && sourceClass !== targetClass) {
                                if (value === 1) { // Association
                                    addEdge(sourceClass, targetClass, 'association');
                                } else { // Dependency (value > 1)
                                    addEdge(sourceClass, targetClass, 'dependency', value);
                                }
                            }
                        }
                    });
                }
            });
        }
    }
    return edges;
  };


  // --- useMemo for Processing Data ---
  const { nodes, edges } = useMemo(() => {
    const result = { nodes: [], edges: [] };
    const jsonData_ = JSON.parse(jsonData);
    
    if (!jsonData) {
        console.warn("jsonData is missing, cannot build graph.");
         return { nodes: [{ data: { id: 'error', label: 'No Data Provided' }, classes: 'error' }], edges: [] };
    }

    const entityToPackageMap = new Map();
    const allNodeData = new Map(); // Use a Map to easily add/update node info
    const parentClassNames = new Set(jsonData_.parentClasses?.map(p => p.name) || []);

    // log the variables inuseMemo
    // console.log("entityToPackageMap:", entityToPackageMap);
    // console.log("allNodeData:", allNodeData);
    // console.log("parentClassNames:", parentClassNames);
    

    // Function to determine classes for a node
    const getNodeClasses = (nodeData) => {
        const classes = [];
        // log the nodeData
        // console.log("nodeData:", nodeData);
        //log classes
        // console.log("classes:", classes);
        if (nodeData.type === 'package') {
            classes.push('package');
        } else if (nodeData.category === 'Class') {
            classes.push('class');
            if (nodeData.isParent) classes.push('parent');
            if (nodeData.isAbstract) classes.push('abstract');
        } else if (nodeData.category === 'Interface') {
            classes.push('interface');
            // Interfaces are implicitly abstract in UML sense, apply abstract styling
            classes.push('abstract');
        } else {
            classes.push('default'); // Fallback class
        }
        return classes.join(' '); // Return space-separated string
    }

    // 1. Process Packages from JSON - Create Parent Nodes
    if (jsonData_.packages && Array.isArray(jsonData_.packages)) {

      //log the packages
      // console.log("jsonData.packages:", jsonData_.packages);

      jsonData_.packages.forEach(pkg => {
        if (pkg?.name) {
          // Add package node
          const pkgData = {
            id: pkg.name,
            label: pkg.name,
            type: "package" // Keep type in data for potential logic, but use classes for styling
          };
          // add a log to check if the package already exists
          if (allNodeData.has(pkg.name)) {
            console.warn(`Package ${pkg.name} already exists, skipping.`);
          } else {
            // console.log(`Adding package node: ${pkg.name}`);
          }
          allNodeData.set(pkg.name, pkgData);
          //log the package data
          // console.log("pkgData:", pkgData);
          // log allNodeData
          // console.log("allNodeData after adding package:", allNodeData);

          // Process classes within package - Create Child Nodes
          if (pkg.classes && Array.isArray(pkg.classes)) {
            pkg.classes.forEach(cls => {
              if (cls?.name) {
                entityToPackageMap.set(cls.name, pkg.name);
                const isParent = parentClassNames.has(cls.name);
                const classData = {
                    id: cls.name,
                    label: cls.name,
                    parent: pkg.name, // Assign parent package
                    category: "Class",
                    isAbstract: cls.isAbstract || false, // Use flag from JSON
                    isParent: isParent, // Check if it's listed as a parent
                };
                allNodeData.set(cls.name, classData);
              }
              // log the class data
              // console.log("classData:", cls.name);
              // log allNodeData after adding class
              // console.log("allNodeData after adding class:", allNodeData);
            });
          }

          // Process interfaces within package - Create Child Nodes
          if (pkg.interfaces && Array.isArray(pkg.interfaces)) {
            pkg.interfaces.forEach(intf => {
              if (intf?.name) {
                entityToPackageMap.set(intf.name, pkg.name);
                 const intfData = {
                    id: intf.name,
                    label: intf.name,
                    parent: pkg.name, // Assign parent package
                    category: "Interface",
                    isAbstract: true, // Interfaces are always abstract conceptually
                    isParent: false, // Interfaces aren't parent classes in the same way
                 };
                 allNodeData.set(intf.name, intfData);
              }
              // log the interface data
              // console.log("intfData:", intf.name);
              // log allNodeData after adding interface
              // console.log("allNodeData after adding interface:", allNodeData);
            });
          }
        }
      });
    } else {
        console.warn("jsonData.packages is missing or not an array.");
    }

    // 2. Process Parent Classes from JSON again to ensure flags are set correctly
    // and potentially add parents if they weren't inside a package structure (edge case)
    if (jsonData_.parentClasses && Array.isArray(jsonData_.parentClasses)) {
      jsonData_.parentClasses.forEach(parentInfo => {
            if (parentInfo?.name) {
                if (allNodeData.has(parentInfo.name)) {
                    // Update existing node
                    const nodeData = allNodeData.get(parentInfo.name);
                    nodeData.isParent = true; // Explicitly mark as parent
                    if (parentInfo.isAbstract) {
                        nodeData.isAbstract = true;
                    }
                     // Ensure package info is consistent
                     if (parentInfo.package && !nodeData.parent) {
                         entityToPackageMap.set(parentInfo.name, parentInfo.package);
                          if (!allNodeData.has(parentInfo.package)) {
                             const pkgData = { id: parentInfo.package, label: parentInfo.package, type: "package" };
                             allNodeData.set(parentInfo.package, pkgData);
                          }
                          nodeData.parent = parentInfo.package;
                     } else if (!nodeData.parent) {
                          console.warn(`Parent class ${parentInfo.name} has no package info.`);
                          entityToPackageMap.set(parentInfo.name, null); // Mark as no known package
                     }
                } else {
                    // Add parent if missing (should ideally be in a package)
                     console.warn(`Parent class ${parentInfo.name} found in parentClasses but not defined within a package. Adding.`);
                     const pkgName = parentInfo.package || null; // Assign package or null
                     entityToPackageMap.set(parentInfo.name, pkgName);
                     if (pkgName && !allNodeData.has(pkgName)) {
                         const pkgData = { id: pkgName, label: pkgName, type: "package" };
                         allNodeData.set(pkgName, pkgData);
                     }
                     const parentData = {
                         id: parentInfo.name,
                         label: parentInfo.name,
                         parent: pkgName,
                         category: "Class",
                         isAbstract: parentInfo.isAbstract || false,
                         isParent: true,
                     };
                    allNodeData.set(parentInfo.name, parentData);
                     // log the parent data
                    // console.log("parentData:", parentInfo.name);
                    // log allNodeData after adding parent
                    // console.log("allNodeData after adding parent:", allNodeData);
                }
                
            }
        });
    }
          
          // 4. Convert node data Map to the final nodes array, adding classes
          result.nodes = Array.from(allNodeData.values()).map(nodeData => {
            // console.log("nodeData:", nodeData);
            return {
              data: nodeData, // Keep all collected data
              classes: getNodeClasses(nodeData) // Assign classes for styling
            };
          });
          
          
          // 5. Extract Edges (functions now add 'classes' property)
          const inheritanceEdges = extractInheritanceEdges(jsonData, entityToPackageMap);
          const implementationEdges = extractImplementationEdges(jsonData, matrices, entityToPackageMap);
          const assocDepEdges = extractAssociationDependencyEdges(matrices, entityToPackageMap);
          
          result.edges = [
            ...inheritanceEdges,
            ...implementationEdges,
            ...assocDepEdges,
          ];
          // log allNodeData
          // console.log("allNodeData:", allNodeData);

    // 6. Filter out edges pointing to/from non-existent nodes
    const existingNodeIds = new Set(result.nodes.map(n => n.data.id));
    result.edges = result.edges.filter(edge =>
        existingNodeIds.has(edge.data.source) && existingNodeIds.has(edge.data.target)
    );

    // console.log("Processed Nodes:", result.nodes);
    // console.log("Processed Edges:", result.edges);

    return result;
  }, [matrices, jsonData]);

  // --- useEffect for Cytoscape Initialization (Runs Once) ---
  useEffect(() => {
    if (!containerRef.current || cyRef.current) {
      return;
    }

    try {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: [], // Elements will be added in the update effect
        style: [
          // --- Node Styles using Classes ---
          { // Base style for all nodes (can be overridden)
            selector: "node",
            style: {
                "label": "data(label)",
                "text-valign": "center",
                "text-halign": "center",
                "text-wrap": "wrap",
                "color": "#333", // Default text color
                "border-width": 2,
                "border-color": "#666",
                "background-color": "#f0f0f0",
                opacity: 1,
                "z-index": 10,
                // Set base sizes here - can be overridden by more specific classes
                "width": "50px",
                "height": "50px",
                "font-size": "12px",
                "text-max-width": "80px",
            }
          },
          { // Style for Regular Classes (ellipse)
            selector: "node.class", // Targets nodes with 'class' but not 'parent' or 'interface'
            style: {
              "background-color": "#3b82f6", // Blue
              "border-color": "#2563eb",
              "color": "white",
              "shape": "ellipse",
              // Specific size for regular classes
              "width": "60px",
              "height": "60px",
              "font-size": "11px",
              "text-wrap": "wrap",          // Explicitly enable text wrapping
              "text-max-width": "50px",     // Max width before wrapping
              "text-overflow-wrap": "anywhere", // Allow breaking long words
              "display": "flex",            // Helps with text alignment
              "align-items": "center",      // Vertically center text
              "justify-content": "center",  // Horizontally center text
              "padding": "5px",             // Add some padding
              "text-valign": "center",      // Vertical alignment
              "text-halign": "center"       // Horizontal alignment
            },
          },
           { // Style for Parent Classes (Triangle Shape) - Overrides .class styles
             selector: 'node.parent', // Targets nodes with 'parent' class (should also have 'class')
             style: {
               "shape": "triangle",
               "background-color": "#F59E0B", // Orange
               "border-color": "#D97706",
               "text-valign": "bottom", // Adjust label position for triangle
               "text-margin-y": 5,      // Move label down slightly
               "color": "#422006", // Dark brown text
               // Specific size for parent triangles
               "width": "65px",
               "height": "60px",
               "font-size": "11px",
               "text-max-width": "60px",
             },
           },
          { // Interface Style - Overrides base node style
             selector: 'node.interface', // Targets nodes with 'interface' class
             style: {
               "shape": "round-rectangle", // Correct shape for interface
               "background-color": "#8b5cf6", // Purple
               "border-color": "#7c3aed",
               "color": "white",
               // Specific size for interfaces
               "width": "80px",
               "height": "45px",
               "font-size": "12px",
               "text-max-width": "70px",
             },
          },
          { // Abstract Style Modifier (dashed border, italic font) - Applied additively
             selector: 'node.abstract', // Targets ANY node with 'abstract' class (.class.abstract, .interface.abstract)
             style: {
               "border-style": "dashed",
               "border-width": 2, // Make dashed border clear
               "font-style": "italic", // Italicize label
             },
           },
          { // Package Style (Compound Node / Parent)
            selector: 'node.package', // Targets nodes with 'package' class
            style: {
              "shape": "round-rectangle",
              "background-color": "#E0F2FE", // Light blue
              "border-color": "#38BDF8", // Blue
              "border-width": 2,
              "padding": "40px", // Increased padding
              "text-valign": "top",
              "text-halign": "center",
              "color": "#0EA5E9", // Darker blue label
              "font-size": "18px", // Larger font for package name
              "font-weight": "bold",
              "text-margin-y": -15, // Adjust label position
              "background-opacity": 0.9,
              "z-index": 1 // Behind regular nodes
            },
          },

          // --- Edge Styles using Classes (and maybe data for fallback/detail) ---
          {
            selector: "edge", // Default edge style
            style: {
              width: 1.5,
              "curve-style": "bezier",
              "target-arrow-shape": "none",
              "line-color": "#94a3b8", // Slate-400
              "target-arrow-color": "#94a3b8",
              opacity: 0.7,
              "z-index": 5
            },
          },
          { // Inheritance Edge Style
            selector: 'edge.inheritance', // Use class selector
            style: {
              "line-color": "#ef4444", // Red-500
              "target-arrow-color": "#ef4444",
              "target-arrow-shape": "triangle",
              "target-arrow-fill": "hollow",
              "arrow-scale": 1.2,
              "line-style": "solid",
              width: 2,
              "z-index": 6
            },
          },
          { // Implementation Edge Style
            selector: 'edge.implementation', // Use class selector
            style: {
              "line-color": "#8b5cf6", // Purple-500
              "target-arrow-color": "#8b5cf6",
              "target-arrow-shape": "triangle",
              "target-arrow-fill": "hollow",
              "arrow-scale": 1.2,
              "line-style": "dashed",
              "line-dash-pattern": [6, 3],
              width: 2,
              "z-index": 6
            },
          },
          { // Association Edge Style
            selector: 'edge.association', // Use class selector
            style: {
              "line-color": "#f97316", // Orange-500
              "target-arrow-color": "#f97316",
              "line-style": "solid",
              "target-arrow-shape": "none",
              width: 1.5,
              "z-index": 5
            },
          },
           { // Inter-Package Association Edge Style Modifier
             selector: 'edge.association.interPackage', // Target associations that are also interPackage
             style: {
                "line-style": "dashed",
                "line-dash-pattern": [5, 5],
                "opacity": 0.8
             },
           },
          { // Dependency Edge Style
            selector: 'edge.dependency', // Use class selector
            style: {
              "line-color": "#22c55e", // Green-500
              "target-arrow-color": "#22c55e",
              "line-style": "dashed",
              "line-dash-pattern": [4, 2],
              "target-arrow-shape": "vee",
              "arrow-scale": 1,
              width: 1.5,
               "z-index": 5
            },
          },
          { // Inter-Package Dependency Edge Style Modifier (maybe just slightly dimmer)
            selector: 'edge.dependency.interPackage',
            style: {
              "opacity": 0.8
              // Could use a different dash pattern if desired: "line-dash-pattern": [2, 2],
            },
          },

          // --- Interaction Styles ---
          { // Style for selected non-package node
            selector: "node:selected:not(.package)", // More specific selector
            style: {
              "background-color": "#DB2777", // Pink-600 for selection
              "border-color": "#4C1D95", // Deep purple border
              "border-width": 4,
              "opacity": 1,
              "z-index": 999
            },
          },
           { // Style for selected package node
             selector: 'node.package:selected',
             style: {
               "background-color": "#A5F3FC", // Lighter Cyan
               "border-color": "#0891B2", // Darker Cyan
               "border-width": 4,
               "opacity": 1,
               "z-index": 998
             },
           },
          { // Dim non-selected/non-neighbor elements
            selector: '.unselected', // Keep using utility classes for dynamic state
            style: { 'opacity': 0.25 }
          },
          { // Style for highlighted neighbours/related elements
            selector: '.highlighted', // Keep using utility classes for dynamic state
            style: {
              // Highlight styles might need adjustment depending on base node color
              // Using overlay or strong border might be better than changing background
              'border-color': '#FACC15', // Yellow-400 border
              'border-width': 4,
              // For edges:
              'line-color': '#F59E0B', // Amber-600
              'target-arrow-color': '#F59E0B',
              'opacity': 1,
              'width': 3, // Thicker edge
              'z-index': 500
            }
          },
           // Ensure highlighted nodes themselves are fully visible and stand out
           {
             selector: 'node.highlighted',
             style: {
               'background-color': '#FDE047', // Lighter yellow background
               'border-color': '#EAB308', // Darker yellow border
               'color': '#713F12', // Dark text on yellow
               'opacity': 1,
               'z-index': 501,
                'width': '60px', // Reset to default size
                'height': '60px', // Reset to default size
                'font-size': '12px', // Reset to default font size
             }
           },
          { // Ensure selected node/package remains fully visible even if dimmed
            selector: ':selected.unselected',
            style: { 'opacity': 1 }
          }
        ],

        // Layout: Use fcose as it supports compound nodes well
        layout: {
          name: 'fcose',
          quality: "default",
          randomize: true,
          animate: true,
          animationDuration: 600,
          fit: true,
          padding: 60, // Increase padding slightly for packages
          nodeRepulsion: node => 45000,
          // Adjust edge length based on edge data (interPackage flag)
          idealEdgeLength: edge => edge.data('interPackage') ? 180 : 90,
          edgeElasticity: edge => 0.45,
          nestingFactor: 1.2, // How tightly children fit
          gravity: 80,
          numIter: 2500,
           gravityRangeCompound: 1.5, // Pulls nodes inside compound
           gravityCompound: 1.0,
           gravityRange: 3.8,
          initialEnergyOnIncremental: 0.3,
          // Layout uses rendered dimensions which now come from fixed styles
          nodeDimensionsIncludeLabels: false,
          packComponents: true, // Pack disconnected components
          tile: true, // Tile disconnected nodes
           tilingPaddingVertical: 20, // Space between tiled nodes
           tilingPaddingHorizontal: 20,
        }
      });

      // --- Event Handlers (No change needed here) ---
      const handleTap = (evt) => {
          const target = evt.target;
          const cy = cyRef.current;

          if (target === cy) {
              // Tap on background: Deselect all
              cy.elements().removeClass('highlighted').removeClass('unselected');
              if (onNodeSelect) onNodeSelect(null);
          } else if (target.isNode()) {
              // Tap on a node
              const tappedNode = target;
              const tappedNodeId = tappedNode.data('id'); // Access ID from data

              cy.elements().addClass('unselected'); // Dim everything

              // Highlight tapped node and its direct neighborhood
              tappedNode.removeClass('unselected').addClass('highlighted');
              tappedNode.neighborhood().removeClass('unselected').addClass('highlighted');

              // If a package is tapped, highlight its children too
              if (tappedNode.hasClass('package')) { // Check class instead of data type
                  tappedNode.children().removeClass('unselected').addClass('highlighted');
              }
              // If a node inside a package is tapped, ensure parent package is visible but not necessarily highlighted
              else if (tappedNode.parent().length > 0 && tappedNode.parent().hasClass('package')) {
                   tappedNode.parent().removeClass('unselected'); // Just make visible
              }

              if (onNodeSelect) onNodeSelect(tappedNodeId);
          } else if (target.isEdge()) {
              // Optional: Handle edge taps - highlight edge and connected nodes
              const tappedEdge = target;
              cy.elements().addClass('unselected');
              tappedEdge.removeClass('unselected').addClass('highlighted');
              tappedEdge.connectedNodes().removeClass('unselected').addClass('highlighted');
              // Maybe select the source node?
              // if (onNodeSelect) onNodeSelect(tappedEdge.source().id());
          }
      };
      cyRef.current.on('tap', handleTap);

    } catch (error) {
      console.error("Error initializing Cytoscape:", error);
      cyRef.current = null;
    }

    // Cleanup function
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []); // Empty dependency array: Run only once on mount

  // --- useEffect for Updating Elements and Running Layout ---
useEffect(() => {
  if (!cyRef.current || !nodes || !edges) {
    return;
  }
  if (nodes.length === 0 && edges.length === 0 && cyRef.current.elements().length > 0) {
    cyRef.current.elements().remove();
    // Clear legend if graph is cleared
    const existingLegend = document.getElementById('uml-legend');
    if (existingLegend) existingLegend.remove();
    return;
  }

  try {
    // Map nodes and edges to the format Cytoscape expects, including classes
    const elementsToAdd = [
      ...nodes.map(node => ({ group: 'nodes', data: node.data, classes: node.classes })),
      ...edges.map(edge => ({ group: 'edges', data: edge.data, classes: edge.classes }))
    ];


    cyRef.current.batch(() => {
      cyRef.current.elements().remove(); // Clear existing elements
      cyRef.current.add(elementsToAdd);  // Add new/updated elements
      cyRef.current.elements().removeClass('highlighted').removeClass('unselected'); // Reset states
    });

    // --- Run Layout with proper error handling ---
    try {
      const layout = cyRef.current.layout({
        name: 'fcose',
        animate: true,
        animationDuration: 500, // Shorter duration for updates
        fit: true, // Re-fit the view after layout
        padding: 60 // Ensure padding is applied
      });
      
      // Run the layout
      const layoutRun = layout.run();
      
      // Check if the layout returns a promise (not all layouts do)
      if (layoutRun && typeof layoutRun.promise === 'function') {
        // If there's a promise, use it
        layoutRun.promise().then(() => {
          // Add legend after layout is complete
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove();
          addLegend();
        }).catch(err => {
          console.warn("Layout promise error:", err);
          // Add legend anyway
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove();
          addLegend();
        });
      } else if (layoutRun && layoutRun.promise) {
        // Handle case where promise is a property not a function
        layoutRun.promise.then(() => {
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove();
          addLegend();
        }).catch(err => {
          console.warn("Layout promise error:", err);
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove();
          addLegend();
        });
      } else {
        // If no promise, just add the legend after a timeout
        setTimeout(() => {
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove();
          addLegend();
        }, 600); // Wait slightly longer than animation duration
      }
    } catch (layoutError) {
      console.error("Layout error:", layoutError);
      // Fallback to a simpler layout
      try {
        cyRef.current.layout({ name: 'grid', fit: true }).run();
        setTimeout(() => {
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove();
          addLegend();
        }, 300);
      } catch (fallbackError) {
        console.error("Fallback layout error:", fallbackError);
        // Add legend anyway
        const existingLegend = document.getElementById('uml-legend');
        if (existingLegend) existingLegend.remove();
        addLegend();
      }
    }
  } catch (error) {
    console.error("Error updating Cytoscape elements or running layout:", error);
  }
}, [nodes, edges]); // Re-run when node or edge data changes

  // --- useEffect for Zoom Level ---
  useEffect(() => {
    if (!cyRef.current) return;
    try {
      // Check if zoom level is significantly different to avoid tiny animations
      if (Math.abs(cyRef.current.zoom() - zoomLevel) > 0.01) {
          cyRef.current.animate({ zoom: zoomLevel, duration: 250 });
      }
    } catch (error) {
      console.error("Error applying zoom:", error);
    }
  }, [zoomLevel]);

  // Function to add a legend - Updated for new styles/types
  // This function creates HTML elements based on the *intended* styles.
  // Ensure the colors, shapes, and line styles here *match* the Cytoscape CSS above.
  const addLegend = () => {
    if (!containerRef.current || document.getElementById('uml-legend')) return;

    const legendContainer = document.createElement('div');
    legendContainer.id = 'uml-legend';
    legendContainer.style.cssText = `
        position: absolute; bottom: 15px; left: 15px;
        background-color: rgba(255, 255, 255, 0.95); padding: 12px;
        border: 1px solid #d1d5db;
        display: grid; grid-template-columns: repeat(2, auto); /* 2 columns */
        gap: 8px 18px; /* row-gap column-gap */
        font-size: 12px; z-index: 1000; max-width: 380px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-family: sans-serif;
    `;

    // Match these styles exactly to the Cytoscape style definitions
    const legendItems = [
      { style: { type: 'node', shape: 'round-rectangle', bgColor: '#E0F2FE', borderColor: '#38BDF8', borderW: 2 }, label: 'Package' }, // node.package
      { style: { type: 'node', shape: 'ellipse', bgColor: '#3b82f6', borderColor: '#2563eb', borderW: 2 }, label: 'Class' }, // node.class
      { style: { type: 'node', shape: 'triangle', bgColor: '#F59E0B', borderColor: '#D97706', borderW: 2 }, label: 'Parent Class' }, // node.parent
      { style: { type: 'node', shape: 'round-rectangle', bgColor: '#8b5cf6', borderColor: '#7c3aed', borderW: 2 }, label: 'Interface' }, // node.interface
      { style: { type: 'node', shape: 'ellipse', bgColor: '#3b82f6', borderColor: '#2563eb', borderW: 2, borderStyle: 'dashed', fontStyle: 'italic' }, label: 'Abstract Class' }, // node.class.abstract (show example)
      // Note: Interface already implies abstract styling via node.abstract, but we could show it explicitly if needed.
      { style: { type: 'edge', lineStyle: 'solid', color: '#ef4444', arrow: 'hollow-triangle' }, label: 'Inheritance' }, // edge.inheritance
      { style: { type: 'edge', lineStyle: 'dashed', color: '#8b5cf6', arrow: 'hollow-triangle', dashPattern: '6,3' }, label: 'Implementation' }, // edge.implementation
      { style: { type: 'edge', lineStyle: 'solid', color: '#f97316', arrow: 'none' }, label: 'Association' }, // edge.association
      { style: { type: 'edge', lineStyle: 'dashed', color: '#f97316', arrow: 'none', dashPattern: '5,5' }, label: 'Inter-Package Assoc.' }, // edge.association.interPackage
      { style: { type: 'edge', lineStyle: 'dashed', color: '#22c55e', arrow: 'vee', dashPattern: '4,2' }, label: 'Dependency' }, // edge.dependency
    ];

    legendItems.forEach(item => {
      const itemContainer = document.createElement('div');
      itemContainer.style.display = 'flex';
      itemContainer.style.alignItems = 'center';
      itemContainer.style.gap = '8px';

      const icon = document.createElement('div');
      icon.style.flexShrink = '0';
      icon.style.display = 'flex';
      icon.style.alignItems = 'center';
      icon.style.justifyContent = 'center'; // Center content like arrows

      if (item.style.type === 'node') {
          icon.style.width = '20px';
          icon.style.height = '20px';
          icon.style.backgroundColor = item.style.bgColor;
          icon.style.border = `${item.style.borderW || 1}px ${item.style.borderStyle || 'solid'} ${item.style.borderColor}`;
          if (item.style.borderStyle === 'dashed') {
              // Approximate dashed border visually if needed, simple border is often enough
          }

          if (item.style.shape === 'ellipse') {
              icon.style.borderRadius = '50%';
          } else if (item.style.shape === 'round-rectangle') {
              icon.style.borderRadius = '4px';
          } else if (item.style.shape === 'triangle') {
              // CSS triangle trick
              icon.style.width = '0';
              icon.style.height = '0';
              icon.style.backgroundColor = 'transparent'; // No background needed
              icon.style.borderLeft = '10px solid transparent';
              icon.style.borderRight = '10px solid transparent';
              icon.style.borderBottom = `18px solid ${item.style.bgColor}`;
              icon.style.borderTop = 'none'; // Override default border
              icon.style.position = 'relative'; // Needed for pseudo-elements if adding border look
               // Add border effect for triangle (approximate)
              icon.style.filter = `drop-shadow(0px 1px 0 ${item.style.borderColor}) drop-shadow(1px -0.5px 0 ${item.style.borderColor}) drop-shadow(-1px -0.5px 0 ${item.style.borderColor})`;
          }
          // Italic style is indicated by label
      } else { // Edge
          icon.style.width = '35px';
          icon.style.height = '15px'; // Give some height
          icon.style.position = 'relative';

          const line = document.createElement('div');
          line.style.width = '100%';
          line.style.height = '2px';
          const isSolid = !item.style.lineStyle || item.style.lineStyle === 'solid';
          line.style.backgroundColor = isSolid ? item.style.color : 'transparent';

          if (!isSolid) { // Dashed line
              const pattern = item.style.dashPattern || '4,2'; // Default pattern if not specified
              const [dash, gap] = pattern.split(',').map(Number);
              line.style.backgroundImage = `linear-gradient(to right, ${item.style.color} ${dash}px, transparent ${dash}px)`;
              line.style.backgroundSize = `${dash + gap}px 2px`;
              line.style.backgroundRepeat = 'repeat-x';
          }

          line.style.position = 'absolute';
          line.style.top = '50%';
          line.style.transform = 'translateY(-50%)';
          icon.appendChild(line);

          if (item.style.arrow && item.style.arrow !== 'none') {
              const arrow = document.createElement('div');
              arrow.style.position = 'absolute';
              arrow.style.right = '-2px'; // Position arrow at the end
              arrow.style.top = '50%';
              arrow.style.transform = 'translateY(-50%)';
              arrow.style.width = '0';
              arrow.style.height = '0';
              arrow.style.borderTop = '5px solid transparent';
              arrow.style.borderBottom = '5px solid transparent';

               if (item.style.arrow === 'hollow-triangle') {
                    arrow.style.borderLeft = `7px solid ${item.style.color}`; // Outer triangle shape
                    // Add inner white triangle using pseudo-element or another div
                    const innerArrow = document.createElement('div');
                    innerArrow.style.position = 'absolute';
                    innerArrow.style.top = '-3px';
                    innerArrow.style.left = '-6px'; // Adjust based on outer border width
                    innerArrow.style.width = '0';
                    innerArrow.style.height = '0';
                    innerArrow.style.borderTop = '3px solid transparent';
                    innerArrow.style.borderBottom = '3px solid transparent';
                    innerArrow.style.borderLeft = `4px solid ${legendContainer.style.backgroundColor || 'white'}`; // Use background color to "hollow out"
                    arrow.appendChild(innerArrow);

               } else if (item.style.arrow === 'vee') {
                    arrow.style.borderLeft = `7px solid ${item.style.color}`; // Standard solid 'vee'
               }
              icon.appendChild(arrow);
          }
      }

      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.whiteSpace = 'nowrap';
      if(item.style.fontStyle === 'italic') label.style.fontStyle = 'italic';


      itemContainer.appendChild(icon);
      itemContainer.appendChild(label);
      legendContainer.appendChild(itemContainer);
    });

    containerRef.current.appendChild(legendContainer);
  };


  // --- Render Component ---
  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-50"
      style={{
        backgroundImage: "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
        backgroundSize: "25px 25px",
        minHeight: "600px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        position: "relative",
        overflow: "hidden" // Important for Cytoscape container
      }}
    />
  );
}