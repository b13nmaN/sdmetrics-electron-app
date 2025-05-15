// FilteredGraphView.jsx
"use client"

import { useEffect, useRef, useMemo, useCallback } from "react"; // Added useCallback
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";

try {
  cytoscape.use(fcose);
} catch (error) {
  console.error("Failed to register fcose layout plugin:", error);
}

// --- START: Utility functions (Copied, ideally refactor) ---
const extractInheritanceEdges = (jsonData, entityToPackageMap, matrices) => {
    const edges = []; let edgeIdCounter = 1; const addedEdges = new Set();
    const addEdge = (source, target, type) => {
        const key = `${source}->${target}->${type}`;
        if (!addedEdges.has(key)) {
            const sourcePackage = entityToPackageMap.get(source); const targetPackage = entityToPackageMap.get(target);
            edges.push({ data: { id: `${type}-e${edgeIdCounter++}`, source, target, type, interPackage: !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage }, classes: type + (!!sourcePackage && !!targetPackage && sourcePackage !== targetPackage ? ' interPackage' : '') });
            addedEdges.add(key); return true;
        } return false;
    };
    jsonData?.parentClasses?.forEach(pI => pI.children?.forEach(cN => addEdge(cN, pI.name, 'inheritance')));
    if (matrices?.Class_Inheritance) {
        const { columns, rows } = matrices.Class_Inheritance;
        if (columns && rows) Object.keys(rows).forEach(cN => rows[cN]?.forEach((v, cI) => { if (v === 1) { const pN = columns[cI]; if (pN && cN !== pN) addEdge(cN, pN, 'inheritance'); } }));
    } return edges;
};
const extractImplementationEdges = (jsonData, entityToPackageMap, matrices) => {
    const edges = []; let edgeIdCounter = 1; const addedEdges = new Set();
    const addEdge = (source, target, type) => {
        const key = `${source}->${target}->${type}`;
        if (!addedEdges.has(key)) {
            const sourcePackage = entityToPackageMap.get(source); const targetPackage = entityToPackageMap.get(target);
            edges.push({ data: { id: `${type}-e${edgeIdCounter++}`, source, target, type, interPackage: !!sourcePackage && !!targetPackage && sourcePackage !== targetPackage }, classes: type + (!!sourcePackage && !!targetPackage && sourcePackage !== targetPackage ? ' interPackage' : '') });
            addedEdges.add(key); return true;
        } return false;
    };
    jsonData?.interfaces?.forEach(i => i.realizedBy?.forEach(cN => addEdge(cN, i.name, 'implementation')));
    jsonData?.packages?.forEach(pkg => pkg.classes?.forEach(cls => cls.implements?.forEach(iN => addEdge(cls.name, iN, 'implementation'))));
    if (matrices?.Interface_Realizations) {
        const { columns, rows } = matrices.Interface_Realizations;
        if (columns && rows) Object.keys(rows).forEach(iN => rows[iN]?.forEach((v, cI) => { if (v === 1) { const cN = columns[cI]; if (cN && iN) addEdge(cN, iN, 'implementation'); } }));
    } return edges;
};
const extractAssociationDependencyEdges = (entityToPackageMap, matrices) => {
    const edges = []; let edgeIdCounter = 1; const pAP = new Set(); const aDE = new Set();
    const addEdge = (source, target, type, value = 0) => {
        const key = `${source}->${target}->${type}`; const pK = [source, target].sort().join('--');
        if (type === 'association') { if (pAP.has(pK)) return false; pAP.add(pK); } else if (type === 'dependency') { if (aDE.has(key)) return false; aDE.add(key); } else return false;
        const sP = entityToPackageMap.get(source); const tP = entityToPackageMap.get(target); const iIP = !!sP && !!tP && sP !== tP;
        const eD = { id: `${type}-e${edgeIdCounter++}`, source, target, type, interPackage: iIP }; if (type === 'dependency') eD.weight = value;
        edges.push({ data: eD, classes: type + (iIP ? ' interPackage' : '') }); return true;
    };
    if (matrices?.Class_Dependencies) {
        const { columns, rows } = matrices.Class_Dependencies;
        if (columns && rows) Object.keys(rows).forEach(sC => rows[sC]?.forEach((v, cI) => { if (v > 0) { const tC = columns[cI]; if (tC && sC !== tC) { if (v === 1) addEdge(sC, tC, 'association'); else addEdge(sC, tC, 'dependency', v); } } }));
    } return edges;
};
const getNodeClasses = (nD) => { const c = []; if (nD.type === 'package') c.push('package'); else if (nD.category === 'Class') { c.push('class'); if (nD.isParent) c.push('parent'); if (nD.isAbstract) c.push('abstract'); } else if (nD.category === 'Interface') { c.push('interface'); c.push('abstract'); } else c.push('default'); return c.join(' '); };
// --- END: Utility functions ---

export default function FilteredGraphView({
  matrices,
  jsonData,
  onNodeSelect,
  searchTerm,
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
    if (!jsonData || !searchTerm) return { nodes: [], edges: [] };
    const allNodesMap = new Map(); const entityToPackageMap = new Map(); const parentClassNames = new Set(jsonData.parentClasses?.map(p => p.name) || []);
    jsonData.packages?.forEach(pkg => { if (pkg?.name) { allNodesMap.set(pkg.name, { id: pkg.name, label: pkg.name, type: "package" }); pkg.classes?.forEach(cls => { if (cls?.name) { entityToPackageMap.set(cls.name, pkg.name); allNodesMap.set(cls.name, { id: cls.name, label: cls.name, parent: pkg.name, category: "Class", isAbstract: cls.isAbstract || false, isParent: parentClassNames.has(cls.name) }); } }); pkg.interfaces?.forEach(intf => { if (intf?.name) { entityToPackageMap.set(intf.name, pkg.name); allNodesMap.set(intf.name, { id: intf.name, label: intf.name, parent: pkg.name, category: "Interface", isAbstract: true, isParent: false }); } }); } });
    jsonData.parentClasses?.forEach(pI => { if (pI?.name) { if (allNodesMap.has(pI.name)) { const nD = allNodesMap.get(pI.name); nD.isParent = true; if (pI.isAbstract) nD.isAbstract = true; if (pI.package && !nD.parent) { entityToPackageMap.set(pI.name, pI.package); if (!allNodesMap.has(pI.package)) allNodesMap.set(pI.package, { id: pI.package, label: pI.package, type: "package" }); nD.parent = pI.package; } } else { const pN = pI.package || null; entityToPackageMap.set(pI.name, pN); if (pN && !allNodesMap.has(pN)) allNodesMap.set(pN, { id: pN, label: pN, type: "package" }); allNodesMap.set(pI.name, { id: pI.name, label: pI.name, parent: pN, category: "Class", isAbstract: pI.isAbstract || false, isParent: true }); } } });
    const allGraphNodes = Array.from(allNodesMap.values()).map(nD => ({ data: nD, classes: getNodeClasses(nD) }));
    const allGraphEdges = [...extractInheritanceEdges(jsonData, entityToPackageMap, matrices), ...extractImplementationEdges(jsonData, entityToPackageMap, matrices), ...extractAssociationDependencyEdges(entityToPackageMap, matrices)].filter(e => allNodesMap.has(e.data.source) && allNodesMap.has(e.data.target));
    const targetNodeData = allNodesMap.get(searchTerm); if (!targetNodeData) return { nodes: [{ data: { id: 'node-not-found', label: `Node '${searchTerm}' not found.` }, classes: 'error' }], edges: [] };
    const nodeIdsToKeep = new Set([searchTerm]); if (targetNodeData.parent) nodeIdsToKeep.add(targetNodeData.parent);
    allGraphEdges.forEach(e => { if (e.data.source === searchTerm) { nodeIdsToKeep.add(e.data.target); const nD = allNodesMap.get(e.data.target); if (nD?.parent) nodeIdsToKeep.add(nD.parent); } else if (e.data.target === searchTerm) { nodeIdsToKeep.add(e.data.source); const nD = allNodesMap.get(e.data.source); if (nD?.parent) nodeIdsToKeep.add(nD.parent); } });
    if (targetNodeData.type === "package") allGraphNodes.forEach(n => { if (n.data.parent === searchTerm) nodeIdsToKeep.add(n.data.id); });
    const finalNodes = allGraphNodes.filter(n => nodeIdsToKeep.has(n.data.id)); const finalEdges = allGraphEdges.filter(e => nodeIdsToKeep.has(e.data.source) && nodeIdsToKeep.has(e.data.target));
    return { nodes: finalNodes, edges: finalEdges };
  }, [jsonData, matrices, searchTerm]);

  // Effect for Cytoscape instance creation and destruction
  useEffect(() => {
    if (!containerRef.current || filteredNodes.length === 0 || (filteredNodes.length === 1 && filteredNodes[0].data.id === 'node-not-found')) {
        // If no valid nodes, or if cy instance exists, destroy it before returning
        if (cyRef.current) {
            cyRef.current.destroy();
            cyRef.current = null;
        }
        return;
    }

    // If an instance already exists (e.g. from a previous searchTerm), destroy it first
    if (cyRef.current) {
        cyRef.current.destroy();
    }

    // Cytoscape initialization errors are rare if container is valid; fcose registration is already in try-catch
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [], // Elements added in a separate effect
      style: [
        { selector: "node", style: { "label": "data(label)", "text-valign": "center", "text-halign": "center", "text-wrap": "wrap", "color": "#333", "border-width": 2, "border-color": "#666", "background-color": "#f0f0f0", opacity: 1, "z-index": 10, "width": "50px", "height": "50px", "font-size": "12px", "text-max-width": "80px"}},
        { selector: "node.class", style: { "background-color": "#3b82f6", "border-color": "#2563eb", "color": "white", "shape": "ellipse", "width": "60px", "height": "60px", "font-size": "11px", "text-max-width": "50px"}},
        { selector: 'node.parent', style: { "shape": "triangle", "background-color": "#F59E0B", "border-color": "#D97706", "text-valign": "bottom", "text-margin-y": 5, "color": "#422006", "width": "65px", "height": "60px", "font-size": "11px"}},
        { selector: 'node.interface', style: { "shape": "round-rectangle", "background-color": "#8b5cf6", "border-color": "#7c3aed", "color": "white", "width": "80px", "height": "45px", "font-size": "12px"}},
        { selector: 'node.abstract', style: { "border-style": "dashed", "font-style": "italic" }},
        { selector: 'node.package', style: { "shape": "round-rectangle", "background-color": "#E0F2FE", "border-color": "#38BDF8", "padding": "20px", "text-valign": "top", "color": "#0EA5E9", "font-size": "16px", "font-weight": "bold", "text-margin-y": -10, "z-index": 1 }},
        { selector: "node.error", style: { "background-color": "#fee2e2", "border-color": "#ef4444", "color": "#b91c1c", "width": "auto", "height": "auto", "padding": "10px", "shape": "rectangle", "text-wrap":"wrap" }},
        { selector: "edge", style: { width: 1.5, "curve-style": "bezier", "target-arrow-shape": "none", "line-color": "#94a3b8", "target-arrow-color": "#94a3b8", opacity: 0.7, "z-index": 5 }},
        { selector: 'edge.inheritance', style: { "line-color": "#ef4444", "target-arrow-color": "#ef4444", "target-arrow-shape": "triangle", "target-arrow-fill": "hollow", width: 2 }},
        { selector: 'edge.implementation', style: { "line-color": "#8b5cf6", "target-arrow-color": "#8b5cf6", "target-arrow-shape": "triangle", "target-arrow-fill": "hollow", "line-style": "dashed", width: 2 }},
        { selector: 'edge.association', style: { "line-color": "#f97316", "target-arrow-color": "#f97316" }},
        { selector: 'edge.association.interPackage', style: { "line-style": "dashed" }},
        { selector: 'edge.dependency', style: { "line-color": "#22c55e", "target-arrow-color": "#22c55e", "line-style": "dashed", "target-arrow-shape": "vee" }},
        { selector: `node[id = "${searchTerm}"]`, style: { "background-color": "#FDE047", "border-color": "#EAB308", "border-width": 3, "z-index": 99, "color": "#713F12" }},
        { selector: "node:selected:not(.package)", style: {"background-color": "#DB2777", "border-color": "#4C1D95", "border-width": 4, "opacity": 1, "z-index": 999 }},
        { selector: 'node.package:selected', style: {"background-color": "#A5F3FC", "border-color": "#0891B2", "border-width": 4, "opacity": 1, "z-index": 998 }},
      ],
      layout: { name: 'fcose', quality: "default", animate: true, animationDuration: 500, fit: true, padding: 50, nodeRepulsion: () => 20000, idealEdgeLength: () => 70, nestingFactor: 1.0, gravity: 50, numIter: 1500 }
    });

    // Attach event handlers to the new instance
    cyRef.current.on('tap', 'node', (evt) => {
      const tappedNode = evt.target;
      if (onNodeSelect) onNodeSelect(tappedNode.id());
      // cyRef.current.elements().unselect(); // Not strictly needed if selection is handled by style
      tappedNode.select();
    });
    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) {
        if (onNodeSelect) onNodeSelect(null);
        // cyRef.current.elements().unselect();
      }
    });
    
    // Cleanup function for this effect
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
    // This effect should re-run if searchTerm changes, or if the fundamental data sources change.
    // onNodeSelect is not needed here as handlers are re-attached if instance is recreated.
  }, [searchTerm, filteredNodes, filteredEdges]); // Key change: depends on filtered data

  // Effect for updating elements and layout
  useEffect(() => {
    if (!cyRef.current || !filteredNodes || (filteredNodes.length === 1 && filteredNodes[0].data.id === 'node-not-found')) {
        return;
    }

    const elementsToAdd = [
        ...filteredNodes.map(node => ({ group: 'nodes', data: node.data, classes: node.classes })),
        ...filteredEdges.map(edge => ({ group: 'edges', data: edge.data, classes: edge.classes }))
    ];

    cyRef.current.batch(() => {
      cyRef.current.elements().remove();
      cyRef.current.add(elementsToAdd);
    });

    const layout = cyRef.current.layout({
        name: 'fcose',
        animate: filteredNodes.length < 50,
        fit: true,
        padding: 60 // Increased padding a bit
    });
    layout.run();

    // Auto-select the searched node
    const searchedNodeExists = filteredNodes.some(n => n.data.id === searchTerm);
    if (searchTerm && searchedNodeExists) {
        setTimeout(() => {
            if(cyRef.current) {
                const nodeToSelect = cyRef.current.getElementById(searchTerm);
                if (nodeToSelect.length > 0) { // Check if node exists in cy instance
                    nodeToSelect.select();
                }
            }
        }, filteredNodes.length < 50 ? 550 : 50);
    }
  }, [filteredNodes, filteredEdges, searchTerm]); // This updates when data changes


  if (!searchTerm) {
    return <div className="w-full h-full flex items-center justify-center bg-slate-50 text-gray-500">Enter a node ID to search.</div>;
  }
  if (filteredNodes.length === 1 && filteredNodes[0].data.id === 'node-not-found') {
     return <div className="w-full h-full flex items-center justify-center bg-slate-50 text-red-600 p-4 text-center">{filteredNodes[0].data.label}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-100"
      style={{ backgroundImage: "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)", backgroundSize: "20px 20px", minHeight: "400px", border: "1px solid #cbd5e1", borderRadius: "8px", position: "relative", overflow: "hidden" }}
    />
  );
}