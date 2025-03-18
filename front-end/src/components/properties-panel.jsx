import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function PropertiesPanel({ selectedNode, nodes, edges }) {
  if (!selectedNode) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground text-center">Select a node to view its properties</p>
      </div>
    )
  }

  // Find relationships for the selected node
  const relationships = {
    inheritance: edges.filter(
      (edge) => (edge.source === selectedNode.id || edge.target === selectedNode.id) && edge.type === "inheritance",
    ),
    associations: edges.filter(
      (edge) => (edge.source === selectedNode.id || edge.target === selectedNode.id) && edge.type === "association",
    ),
    dependencies: edges.filter(
      (edge) => (edge.source === selectedNode.id || edge.target === selectedNode.id) && edge.type === "dependency",
    ),
  }

  // Get related node labels
  const getNodeLabel = (id) => {
    const node = nodes.find((n) => n.id === id)
    return node ? node.label : id
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{selectedNode.label}</CardTitle>
          <Badge variant="outline">{selectedNode.category}</Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {relationships.inheritance.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-1">Inheritance</h4>
                <ul className="space-y-1">
                  {relationships.inheritance.map((rel, idx) => (
                    <li key={`inh-${idx}`} className="text-sm">
                      {rel.source === selectedNode.id ? (
                        <span>
                          Inherits from: <span className="font-medium">{getNodeLabel(rel.target)}</span>
                        </span>
                      ) : (
                        <span>
                          Parent of: <span className="font-medium">{getNodeLabel(rel.source)}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relationships.associations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-1">Associations</h4>
                <ul className="space-y-1">
                  {relationships.associations.map((rel, idx) => (
                    <li key={`assoc-${idx}`} className="text-sm">
                      {rel.source === selectedNode.id ? (
                        <span>
                          Associated with: <span className="font-medium">{getNodeLabel(rel.target)}</span>
                        </span>
                      ) : (
                        <span>
                          Associated with: <span className="font-medium">{getNodeLabel(rel.source)}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relationships.dependencies.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-1">Dependencies</h4>
                <ul className="space-y-1">
                  {relationships.dependencies.map((rel, idx) => (
                    <li key={`dep-${idx}`} className="text-sm">
                      {rel.source === selectedNode.id ? (
                        <span>
                          Depends on: <span className="font-medium">{getNodeLabel(rel.target)}</span>
                        </span>
                      ) : (
                        <span>
                          Depended on by: <span className="font-medium">{getNodeLabel(rel.source)}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-1">Metrics</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Coupling:</div>
                <div className="font-medium">
                  {relationships.associations.length + relationships.dependencies.length}
                </div>
                <div>Cohesion:</div>
                <div className="font-medium">0.75</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

