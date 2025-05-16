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
  activeHighlight = null, // 'coupling', 'cohesion', or null
  highlightThresholds = { coupling: 5, lcom: 2 }, // Default thresholds
}) {
  const containerRef = useRef(null)
  const cyRef = useRef(null)

  // --- Edge Extraction Functions (Assumed Correct from Previous Version) ---
  const extractInheritanceEdges = (jsonData, entityToPackageMap) => {
    const edges = [];
    let edgeIdCounter = 1;
     const addedEdges = new Set(); 

     const addEdge = (source, target, type) => {
         const key = `${source}->${target}->${type}`;
         if (!addedEdges.has(key)) {
             const sourcePackage = entityToPackageMap.get(source);
             const targetPackage = entityToPackageMap.get(target);
             edges.push({
                 data: {
                     id: `${type}-e${edgeIdCounter++}`,
                     source: source, 
                     target: target, 
                     type: type,
                     interPackage: !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage,
                 },
                 classes: type + (!!sourcePackage && !!targetPackage && sourcePackage !== targetPackage ? ' interPackage' : '') 
             });
             addedEdges.add(key);
             return true;
         }
         return false;
     };

    if (jsonData?.parentClasses && Array.isArray(jsonData.parentClasses)) {
      jsonData.parentClasses.forEach(parentInfo => {
        if (parentInfo?.name && parentInfo?.children && Array.isArray(parentInfo.children)) {
          const parentName = parentInfo.name;
          parentInfo.children.forEach(childName => {
             addEdge(childName, parentName, 'inheritance'); 
          });
        }
      });
    }

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

  const extractImplementationEdges = (jsonData, matrices, entityToPackageMap) => {
    const edges = [];
    let edgeIdCounter = 1;
     const addedEdges = new Set(); 

      const addEdge = (source, target, type) => {
          const key = `${source}->${target}->${type}`;
          if (!addedEdges.has(key)) {
              const sourcePackage = entityToPackageMap.get(source);
              const targetPackage = entityToPackageMap.get(target);
              edges.push({
                  data: {
                      id: `${type}-e${edgeIdCounter++}`,
                      source: source, 
                      target: target, 
                      type: type, 
                      interPackage: !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage,
                  },
                 classes: type + (!!sourcePackage && !!targetPackage && sourcePackage !== targetPackage ? ' interPackage' : '')
              });
              addedEdges.add(key);
              return true;
          }
          return false;
      };

    if (jsonData?.interfaces && Array.isArray(jsonData.interfaces)) {
        jsonData.interfaces.forEach(iface => {
            if (iface?.name && iface?.realizedBy && Array.isArray(iface.realizedBy)) {
                const interfaceName = iface.name;
                iface.realizedBy.forEach(className => {
                     addEdge(className, interfaceName, 'implementation');
                });
            }
        });
    }
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

  const extractAssociationDependencyEdges = (matrices, entityToPackageMap) => {
    const edges = [];
    let edgeIdCounter = 1;
    const processedAssociationPairs = new Set(); 
    const addedDependencyEdges = new Set();

      const addEdge = (source, target, type, value = 0) => {
           const key = `${source}->${target}->${type}`;
           const pairKey = [source, target].sort().join('--');

           if (type === 'association') {
               if (!processedAssociationPairs.has(pairKey)) {
                    processedAssociationPairs.add(pairKey);
               } else {
                   return false; 
               }
           } else if (type === 'dependency') {
                if (!addedDependencyEdges.has(key)) {
                    addedDependencyEdges.add(key);
                } else {
                    return false; 
                }
           } else {
               return false; 
           }

            const sourcePackage = entityToPackageMap.get(source);
            const targetPackage = entityToPackageMap.get(target);
            const isInterPackage = !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage;

             const edgeData = {
                 id: `${type}-e${edgeIdCounter++}`,
                 source: source,
                 target: target,
                 type: type, 
                 interPackage: isInterPackage,
             };
             if (type === 'dependency') edgeData.weight = value; 

             edges.push({
                 data: edgeData,
                 classes: type + (isInterPackage ? ' interPackage' : '') 
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
                                if (value === 1) { 
                                    addEdge(sourceClass, targetClass, 'association');
                                } else { 
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

  // --- Metrics Calculation Functions ---
  const calculateCouplingMetrics = (classNodes, assocDepEdges) => {
    const couplingData = new Map(); 

    classNodes.forEach(node => {
      couplingData.set(node.data.id, { afferent: 0, efferent: 0, total: 0 });
    });

    assocDepEdges.forEach(edge => {
      const sourceId = edge.data.source;
      const targetId = edge.data.target;

      if (couplingData.has(sourceId)) {
        couplingData.get(sourceId).efferent += 1;
      }
      if (couplingData.has(targetId)) {
        couplingData.get(targetId).afferent += 1;
      }
    });

    classNodes.forEach(node => {
      const metrics = couplingData.get(node.data.id);
      if (metrics) {
        node.data.couplingScore = metrics.afferent + metrics.efferent;
        node.data.afferentCoupling = metrics.afferent;
        node.data.efferentCoupling = metrics.efferent;
      } else {
        node.data.couplingScore = 0;
        node.data.afferentCoupling = 0;
        node.data.efferentCoupling = 0;
      }
    });
  };

  const findLCOMConnectedComponents = (methodKeys, adj) => {
    const visited = new Set();
    let components = 0;
    for (const methodKey of methodKeys) {
      if (!visited.has(methodKey)) {
        components++;
        const stack = [methodKey];
        visited.add(methodKey);
        while (stack.length > 0) {
          const u = stack.pop();
          if (adj.has(u)) {
            for (const v of adj.get(u)) {
              if (!visited.has(v)) {
                visited.add(v);
                stack.push(v);
              }
            }
          }
        }
      }
    }
    return components;
  };

  const calculateCohesionMetricsLCOM4 = (classNode, classJsonData) => {
    // LCOM4: Number of connected components in the graph where methods are nodes
    // and an edge exists if two methods access at least one common attribute.
    // Assumes classJsonData has: { name: "...", attributes: [{name: "attr"}...], methods: [{name: "m", accessesAttributes: ["attr", ...]}...] }

    if (!classJsonData || !Array.isArray(classJsonData.methods) || !Array.isArray(classJsonData.attributes)) {
      classNode.data.lcomScore = 0; // Cannot calculate
      return;
    }
    
    const methods = classJsonData.methods;
    if (methods.length <= 1) {
      classNode.data.lcomScore = methods.length; // LCOM4 is 1 for 1 method, 0 for 0 methods (or 1, depending on definition)
      return;
    }

    const methodNames = methods.map(m => m.name);
    const methodAttributeAccess = new Map(
        methods.map(m => [m.name, new Set(m.accessesAttributes || [])])
    );
    
    const adj = new Map(); // Adjacency list for methods based on shared attributes

    for (let i = 0; i < methodNames.length; i++) {
      for (let j = i + 1; j < methodNames.length; j++) {
        const methodA = methodNames[i];
        const methodB = methodNames[j];
        const attrsA = methodAttributeAccess.get(methodA);
        const attrsB = methodAttributeAccess.get(methodB);

        // Check for common attributes
        if (attrsA && attrsB && [...attrsA].some(attr => attrsB.has(attr))) {
          if (!adj.has(methodA)) adj.set(methodA, []);
          if (!adj.has(methodB)) adj.set(methodB, []);
          adj.get(methodA).push(methodB);
          adj.get(methodB).push(methodA);
        }
      }
    }
    classNode.data.lcomScore = findLCOMConnectedComponents(methodNames, adj);
  };


  // --- useMemo for Processing Data ---
  const { nodes, edges } = useMemo(() => {
    const result = { nodes: [], edges: [] };
    
    if (!jsonData) {
        console.warn("jsonData is missing, cannot build graph.");
         return { nodes: [{ data: { id: 'error', label: 'No Data Provided' }, classes: 'error' }], edges: [] };
    }

    const entityToPackageMap = new Map();
    const allNodeData = new Map(); 
    const parentClassNames = new Set(jsonData.parentClasses?.map(p => p.name) || []);
    const classJsonMap = new Map(); // To store raw class data from jsonData for LCOM

    const getNodeClasses = (nodeData) => {
        const classes = [];
        if (nodeData.type === 'package') {
            classes.push('package');
        } else if (nodeData.category === 'Class') {
            classes.push('class');
            if (nodeData.isParent) classes.push('parent');
            if (nodeData.isAbstract) classes.push('abstract');
        } else if (nodeData.category === 'Interface') {
            classes.push('interface');
            classes.push('abstract'); // Interfaces are implicitly abstract
        } else {
            classes.push('default'); 
        }
        return classes.join(' '); 
    }

    if (jsonData.packages && Array.isArray(jsonData.packages)) {
      jsonData.packages.forEach(pkg => {
        if (pkg?.name) {
          const pkgData = { id: pkg.name, label: pkg.name, type: "package" };
          allNodeData.set(pkg.name, pkgData);

          if (pkg.classes && Array.isArray(pkg.classes)) {
            pkg.classes.forEach(cls => {
              if (cls?.name) {
                entityToPackageMap.set(cls.name, pkg.name);
                const isParent = parentClassNames.has(cls.name);
                const classData = {
                    id: cls.name, label: cls.name, parent: pkg.name,
                    category: "Class", isAbstract: cls.isAbstract || false,
                    isParent: isParent,
                };
                allNodeData.set(cls.name, classData);
                classJsonMap.set(cls.name, cls); // Store raw class JSON for LCOM
              }
            });
          }

          if (pkg.interfaces && Array.isArray(pkg.interfaces)) {
            pkg.interfaces.forEach(intf => {
              if (intf?.name) {
                entityToPackageMap.set(intf.name, pkg.name);
                 const intfData = {
                    id: intf.name, label: intf.name, parent: pkg.name,
                    category: "Interface", isAbstract: true, isParent: false,
                 };
                 allNodeData.set(intf.name, intfData);
                 // Note: LCOM not typically calculated for interfaces in the same way as classes
              }
            });
          }
        }
      });
    } else {
        console.warn("jsonData.packages is missing or not an array.");
    }

    if (jsonData.parentClasses && Array.isArray(jsonData.parentClasses)) {
      jsonData.parentClasses.forEach(parentInfo => {
            if (parentInfo?.name) {
                if (allNodeData.has(parentInfo.name)) {
                    const nodeData = allNodeData.get(parentInfo.name);
                    nodeData.isParent = true; 
                    if (parentInfo.isAbstract) nodeData.isAbstract = true;
                     if (parentInfo.package && !nodeData.parent) {
                         entityToPackageMap.set(parentInfo.name, parentInfo.package);
                          if (!allNodeData.has(parentInfo.package)) {
                             allNodeData.set(parentInfo.package, { id: parentInfo.package, label: parentInfo.package, type: "package" });
                          }
                          nodeData.parent = parentInfo.package;
                     } else if (!nodeData.parent) {
                          console.warn(`Parent class ${parentInfo.name} has no package info.`);
                          entityToPackageMap.set(parentInfo.name, null); 
                     }
                     // Ensure classJsonMap has the most complete info for parent classes
                     classJsonMap.set(parentInfo.name, { ...classJsonMap.get(parentInfo.name), ...parentInfo });
                } else {
                     console.warn(`Parent class ${parentInfo.name} found in parentClasses but not defined. Adding.`);
                     const pkgName = parentInfo.package || null; 
                     entityToPackageMap.set(parentInfo.name, pkgName);
                     if (pkgName && !allNodeData.has(pkgName)) {
                         allNodeData.set(pkgName, { id: pkgName, label: pkgName, type: "package" });
                     }
                     const parentData = {
                         id: parentInfo.name, label: parentInfo.name, parent: pkgName,
                         category: "Class", isAbstract: parentInfo.isAbstract || false,
                         isParent: true,
                     };
                    allNodeData.set(parentInfo.name, parentData);
                    classJsonMap.set(parentInfo.name, parentInfo); 
                }
            }
        });
    }
    
    const tempNodesForMetrics = Array.from(allNodeData.values()).map(nodeData => ({ data: nodeData }));
    
    const extractedInheritanceEdges = extractInheritanceEdges(jsonData, entityToPackageMap);
    const extractedImplementationEdges = extractImplementationEdges(jsonData, matrices, entityToPackageMap);
    const extractedAssocDepEdges = extractAssociationDependencyEdges(matrices, entityToPackageMap);
    
    const classNodesForMetrics = tempNodesForMetrics.filter(n => n.data.category === 'Class');
    calculateCouplingMetrics(classNodesForMetrics, extractedAssocDepEdges);
    classNodesForMetrics.forEach(node => {
        const rawClassData = classJsonMap.get(node.data.id);
        calculateCohesionMetricsLCOM4(node, rawClassData);
    });
          
    result.nodes = Array.from(allNodeData.values()).map(nodeData => {
        // Find the corresponding node from tempNodesForMetrics to get metrics
        const nodeWithMetrics = tempNodesForMetrics.find(tn => tn.data.id === nodeData.id);
        return {
            data: { ...nodeData, ...nodeWithMetrics?.data }, // Merge original data with metrics
            classes: getNodeClasses(nodeData) 
        };
    });
          
    result.edges = [
        ...extractedInheritanceEdges,
        ...extractedImplementationEdges,
        ...extractedAssocDepEdges,
    ];

    const existingNodeIds = new Set(result.nodes.map(n => n.data.id));
    result.edges = result.edges.filter(edge =>
        existingNodeIds.has(edge.data.source) && existingNodeIds.has(edge.data.target)
    );

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
        elements: [], 
        style: [
          // --- Node Styles using Classes ---
          { 
            selector: "node",
            style: {
                "label": "data(label)", "text-valign": "center", "text-halign": "center",
                "text-wrap": "wrap", "color": "#333", "border-width": 2,
                "border-color": "#666", "background-color": "#f0f0f0",
                opacity: 1, "z-index": 10, "width": "50px", "height": "50px",
                "font-size": "12px", "text-max-width": "80px",
            }
          },
          { 
            selector: "node.class", 
            style: {
              "background-color": "#3b82f6", "border-color": "#2563eb", "color": "white",
              "shape": "ellipse", "width": "60px", "height": "60px", "font-size": "11px",
              "text-wrap": "wrap", "text-max-width": "50px", "text-overflow-wrap": "anywhere",
              "display": "flex", "align-items": "center", "justify-content": "center",
              "padding": "5px", "text-valign": "center", "text-halign": "center"
            },
          },
           { 
             selector: 'node.parent', 
             style: {
               "shape": "triangle", "background-color": "#F59E0B", "border-color": "#D97706",
               "text-valign": "bottom", "text-margin-y": 5, "color": "#422006", 
               "width": "65px", "height": "60px", "font-size": "11px", "text-max-width": "60px",
             },
           },
          { 
             selector: 'node.interface', 
             style: {
               "shape": "round-rectangle", "background-color": "#8b5cf6", "border-color": "#7c3aed",
               "color": "white", "width": "80px", "height": "45px", "font-size": "12px",
               "text-max-width": "70px",
             },
          },
          { 
             selector: 'node.abstract', 
             style: {
               "border-style": "dashed", "border-width": 2, "font-style": "italic", 
             },
           },
          { 
            selector: 'node.package', 
            style: {
              "shape": "round-rectangle", "background-color": "#E0F2FE", "border-color": "#38BDF8",
              "border-width": 2, "padding": "40px", "text-valign": "top",
              "text-halign": "center", "color": "#0EA5E9", "font-size": "18px", 
              "font-weight": "bold", "text-margin-y": -15, "background-opacity": 0.9,
              "z-index": 1 
            },
          },

          // --- Edge Styles using Classes ---
          {
            selector: "edge", 
            style: {
              width: 1.5, "curve-style": "bezier", "target-arrow-shape": "none",
              "line-color": "#94a3b8", "target-arrow-color": "#94a3b8",
              opacity: 0.7, "z-index": 5
            },
          },
          { 
            selector: 'edge.inheritance', 
            style: {
              "line-color": "#ef4444", "target-arrow-color": "#ef4444",
              "target-arrow-shape": "triangle", "target-arrow-fill": "hollow",
              "arrow-scale": 1.2, "line-style": "solid", width: 2, "z-index": 6
            },
          },
          { 
            selector: 'edge.implementation', 
            style: {
              "line-color": "#8b5cf6", "target-arrow-color": "#8b5cf6",
              "target-arrow-shape": "triangle", "target-arrow-fill": "hollow",
              "arrow-scale": 1.2, "line-style": "dashed", "line-dash-pattern": [6, 3],
              width: 2, "z-index": 6
            },
          },
          { 
            selector: 'edge.association', 
            style: {
              "line-color": "#f97316", "target-arrow-color": "#f97316",
              "line-style": "solid", "target-arrow-shape": "none", width: 1.5, "z-index": 5
            },
          },
           { 
             selector: 'edge.association.interPackage', 
             style: {
                "line-style": "dashed", "line-dash-pattern": [5, 5], "opacity": 0.8
             },
           },
          { 
            selector: 'edge.dependency', 
            style: {
              "line-color": "#22c55e", "target-arrow-color": "#22c55e",
              "line-style": "dashed", "line-dash-pattern": [4, 2],
              "target-arrow-shape": "vee", "arrow-scale": 1, width: 1.5, "z-index": 5
            },
          },
          { 
            selector: 'edge.dependency.interPackage',
            style: { "opacity": 0.8 },
          },

          // --- Interaction Styles ---
          { 
            selector: "node:selected:not(.package)", 
            style: {
              "background-color": "#DB2777", "border-color": "#4C1D95", 
              "border-width": 4, "opacity": 1, "z-index": 999
            },
          },
           { 
             selector: 'node.package:selected',
             style: {
               "background-color": "#A5F3FC", "border-color": "#0891B2",
               "border-width": 4, "opacity": 1, "z-index": 998
             },
           },
          { 
            selector: '.unselected', 
            style: { 'opacity': 0.25 }
          },
          { 
            selector: '.highlighted', 
            style: {
              'border-color': '#FACC15', 'border-width': 4,
              'line-color': '#F59E0B', 'target-arrow-color': '#F59E0B',
              'opacity': 1, 'width': 3, 'z-index': 500
            }
          },
           {
             selector: 'node.highlighted',
             style: {
               'background-color': '#FDE047', 'border-color': '#EAB308',
               'color': '#713F12', 'opacity': 1, 'z-index': 501,
                'width': '60px', 'height': '60px', 'font-size': '12px', 
             }
           },
          { 
            selector: ':selected.unselected',
            style: { 'opacity': 1 }
          },

          // --- Special Highlight Styles (for Coupling/Cohesion) ---
          {
            selector: 'node.highly-coupled-highlight',
            style: {
              'background-color': '#E53E3E', // Red-600 (Tailwind)
              'border-color': '#C53030',   // Red-700
              'border-width': 3,
              'color': 'white',
              'z-index': 1000, 
              'width': '70px', // Slightly larger to stand out
              'height': '70px',
              'font-size': '12px',
              'text-max-width': '60px',
            }
          },
          {
            selector: 'node.low-cohesion-highlight',
            style: {
              'background-color': '#DD6B20', // Orange-600 (Tailwind)
              'border-color': '#C05621',   // Orange-700
              'border-width': 3,
              'color': 'white',
              'z-index': 1000,
              'width': '70px', // Slightly larger
              'height': '70px',
              'font-size': '12px',
              'text-max-width': '60px',
            }
          },
          {
            selector: '.dimmed-for-highlight', 
            style: { 'opacity': 0.15, 'z-index': 0 } 
          },
          {
            selector: ':selected.dimmed-for-highlight',
            style: { 'opacity': 0.6 } 
          },
          { 
            selector: 'edge.dimmed-for-highlight.connected-to-highlighted',
            style: { 'opacity': 0.5, 'z-index': 4, 'width': 2 }
          }
        ],

        layout: {
          name: 'fcose', quality: "default", randomize: true, animate: true,
          animationDuration: 600, fit: true, padding: 60, 
          nodeRepulsion: node => 45000,
          idealEdgeLength: edge => edge.data('interPackage') ? 180 : 90,
          edgeElasticity: edge => 0.45, nestingFactor: 1.2, 
          gravity: 80, numIter: 2500, gravityRangeCompound: 1.5, 
          gravityCompound: 1.0, gravityRange: 3.8,
          initialEnergyOnIncremental: 0.3,
          nodeDimensionsIncludeLabels: false, packComponents: true, 
          tile: true, tilingPaddingVertical: 20, tilingPaddingHorizontal: 20,
        }
      });

      const handleTap = (evt) => {
          const target = evt.target;
          const cy = cyRef.current;

          if (target === cy) {
              cy.elements().removeClass('highlighted').removeClass('unselected');
              // Do not clear special highlights on background tap
              // cy.elements().removeClass('highly-coupled-highlight low-cohesion-highlight dimmed-for-highlight special-highlight-active connected-to-highlighted');
              if (onNodeSelect) onNodeSelect(null);
          } else if (target.isNode()) {
              const tappedNode = target;
              const tappedNodeId = tappedNode.data('id'); 
              
              // If a special highlight mode is active, tapping a node should still work for selection
              // but we don't want to override the special highlight dimming logic entirely
              if (!cy.elements('.special-highlight-active').length) {
                 cy.elements().addClass('unselected'); 
                 tappedNode.removeClass('unselected').addClass('highlighted');
                 tappedNode.neighborhood().removeClass('unselected').addClass('highlighted');

                 if (tappedNode.hasClass('package')) { 
                     tappedNode.children().removeClass('unselected').addClass('highlighted');
                 } else if (tappedNode.parent().length > 0 && tappedNode.parent().hasClass('package')) {
                      tappedNode.parent().removeClass('unselected'); 
                 }
              } else {
                // If special highlight is active, just ensure tapped node is fully visible
                // and perhaps its direct neighborhood, but respect the overall dimming.
                cy.elements('.highlighted').removeClass('highlighted'); // Clear previous tap highlights
                tappedNode.addClass('highlighted');
                // For special highlight mode, don't un-dim everything, just highlight the selected one.
                // The :selected.dimmed-for-highlight style will handle its visibility.
              }
              if (onNodeSelect) onNodeSelect(tappedNodeId, tappedNode.data());
          } else if (target.isEdge()) {
              const tappedEdge = target;
              if (!cy.elements('.special-highlight-active').length) {
                cy.elements().addClass('unselected');
                tappedEdge.removeClass('unselected').addClass('highlighted');
                tappedEdge.connectedNodes().removeClass('unselected').addClass('highlighted');
              } else {
                 cy.elements('.highlighted').removeClass('highlighted');
                 tappedEdge.addClass('highlighted');
              }
          }
      };
      cyRef.current.on('tap', handleTap);

    } catch (error) {
      console.error("Error initializing Cytoscape:", error);
      cyRef.current = null;
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []); 

  // --- useEffect for Updating Elements and Running Layout ---
useEffect(() => {
  if (!cyRef.current || !nodes || !edges) {
    return;
  }
  if (nodes.length === 0 && edges.length === 0 && cyRef.current.elements().length > 0) {
    cyRef.current.elements().remove();
    const existingLegend = document.getElementById('uml-legend');
    if (existingLegend) existingLegend.remove();
    return;
  }

  try {
    const elementsToAdd = [
      ...nodes.map(node => ({ group: 'nodes', data: node.data, classes: node.classes })),
      ...edges.map(edge => ({ group: 'edges', data: edge.data, classes: edge.classes }))
    ];

    cyRef.current.batch(() => {
      cyRef.current.elements().remove(); 
      cyRef.current.add(elementsToAdd);  
      // Clear tap-based highlights, but special highlights will be reapplied by their own effect
      cyRef.current.elements().removeClass('highlighted').removeClass('unselected'); 
    });

    try {
      const layout = cyRef.current.layout({
        name: 'fcose', animate: true, animationDuration: 500, 
        fit: true, padding: 60 
      });
      
      const layoutRun = layout.run();
      
      const handleLayoutDone = () => {
        const existingLegend = document.getElementById('uml-legend');
        if (existingLegend) existingLegend.remove(); // Keep removal for old ID, just in case
        // addLegend(); // REMOVED
      };

      if (layoutRun && typeof layoutRun.promise === 'function') {
        layoutRun.promise().then(handleLayoutDone).catch(err => { // Ensure handleLayoutDone is called
          console.warn("Layout promise error:", err);
          handleLayoutDone();
        });
      } else if (layoutRun && layoutRun.promise) { // Some older versions might have it as a property
        layoutRun.promise.then(handleLayoutDone).catch(err => {
          console.warn("Layout promise error (property):", err);
          handleLayoutDone();
        });
      } else { // No promise, use events or timeout
        layout.one('layoutstop', handleLayoutDone);
        // Fallback timeout if event doesn't fire (shouldn't be necessary with fcose)
        // setTimeout(handleLayoutDone, 600); 
      }
    } catch (layoutError) {
      console.error("Layout error:", layoutError);
      try {
        const fallbackLayout = cyRef.current.layout({ name: 'grid', fit: true });
        fallbackLayout.run(); // Run it
        setTimeout(() => {
          const existingLegend = document.getElementById('uml-legend');
          if (existingLegend) existingLegend.remove(); // Keep removal
          // addLegend(); // REMOVED
        }, 300); // Assuming grid layout is fast
      } catch (fallbackError) {
        console.error("Fallback layout error:", fallbackError);
        const existingLegend = document.getElementById('uml-legend');
        if (existingLegend) existingLegend.remove(); // Keep removal
        // addLegend(); // REMOVED
      }
    }
  } catch (error) {
    console.error("Error updating Cytoscape elements or running layout:", error);
  }
}, [nodes, edges]); // Re-run when node or edge data changes


  // --- useEffect for Applying Special Highlights (Coupling/Cohesion) ---
  useEffect(() => {
    if (!cyRef.current || !nodes || !edges || nodes.length === 0) return; 

    const cy = cyRef.current;
    const { coupling: couplingThreshold, lcom: lcomThreshold } = highlightThresholds;

    cy.batch(() => {
      cy.elements()
        .removeClass('highly-coupled-highlight low-cohesion-highlight dimmed-for-highlight special-highlight-active connected-to-highlighted');
      
      // Also clear tap-based selection when special highlight changes
      // cy.elements().removeClass('highlighted unselected');
      // cy.$(':selected').unselect(); // More specific unselection

      if (!activeHighlight) {
        // If tap highlights were cleared, this ensures they are not reapplied without a tap
        cy.elements().removeClass('unselected'); 
        // Remove special-highlight-active if it was added
        cy.elements().removeClass('special-highlight-active');
        return;
      }

      cy.elements().addClass('special-highlight-active'); 

      let highlightedNodesSelector = '';
      let foundHighlights = false;

      if (activeHighlight === 'coupling') {
        cy.nodes().forEach(node => {
          if (node.data('category') === 'Class' && node.data('couplingScore') != null && node.data('couplingScore') > couplingThreshold) {
            node.addClass('highly-coupled-highlight');
            foundHighlights = true;
          } else {
            node.addClass('dimmed-for-highlight');
          }
        });
        highlightedNodesSelector = 'node.highly-coupled-highlight';
      } else if (activeHighlight === 'cohesion') {
        cy.nodes().forEach(node => {
          if (node.data('category') === 'Class' && node.data('lcomScore') != null && node.data('lcomScore') > lcomThreshold) {
            node.addClass('low-cohesion-highlight');
            foundHighlights = true;
          } else {
            node.addClass('dimmed-for-highlight');
          }
        });
        highlightedNodesSelector = 'node.low-cohesion-highlight';
      }

      if (foundHighlights) {
        cy.edges().addClass('dimmed-for-highlight');
        if (highlightedNodesSelector) {
          cy.nodes(highlightedNodesSelector)
            .connectedEdges()
            .removeClass('dimmed-for-highlight')
            .addClass('connected-to-highlighted'); 
        }
      } else {
        // If no nodes met the criteria, remove dimming from all elements
        cy.elements().removeClass('dimmed-for-highlight special-highlight-active');
      }
    });
  }, [activeHighlight, nodes, edges, highlightThresholds]); // Re-run when mode or data/thresholds change

  // --- useEffect for Zoom Level ---
  useEffect(() => {
    if (!cyRef.current) return;
    try {
      if (Math.abs(cyRef.current.zoom() - zoomLevel) > 0.01) {
          cyRef.current.animate({ zoom: zoomLevel, duration: 250 });
      }
    } catch (error) {
      console.error("Error applying zoom:", error);
    }
  }, [zoomLevel]);

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
        overflow: "hidden" 
      }}
    />
  );
}