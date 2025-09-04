import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/**
 * OverviewBlog (Academic)
 * Audience: academic/technical readers.
 * Style: concise scholarly tone, clear headings, no gray backgrounds; black text.
 * Purpose: rigorous overview of the project, UI, and the rationale/usage of key metrics (Dep_Out, CAMC),
 *          including the LLM recommendation pipeline.
 */
export default function OverviewBlog() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 text-black">
      {/* TITLE */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl tracking-tight">
            UML Insights — Academic Overview
          </CardTitle>
          <CardDescription>
            A design-time analysis environment that parses UML class diagrams (XMI), computes
            established coupling/cohesion metrics, visualizes model structure as a graph, and provides
            LLM-assisted design recommendations.
          </CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="secondary">XMI</Badge>
            <Badge variant="secondary">Cytoscape Graph</Badge>
            <Badge variant="secondary">SDMetrics</Badge>
            <Badge variant="secondary">LLM Guidance</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* ABSTRACT */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Abstract</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <p>
            <strong>UML Insights</strong> supports early-stage evaluation of object-oriented designs by
            computing and contextualizing coupling and cohesion indicators directly on UML class
            diagrams. The system emphasizes two metrics widely recognized in design analysis:
            <code>Dep_Out</code> (import coupling) and <code>CAMC</code> (cohesion among methods in a
            class). Interactive visualizations reveal structural hotspots, while a lightweight rule engine
            turns metric signals into focused prompts for a Large Language Model (LLM) that proposes
            actionable refactorings. The result is rigorous yet usable feedback at the point in the
            lifecycle where change is least costly.
          </p>
        </CardContent>
      </Card>

      {/* WHY COUPLING & COHESION */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Motivation: Coupling and Cohesion</CardTitle>
          <CardDescription>
            These dimensions dominate maintainability risk: coupling governs ripple effects across
            modules; cohesion captures focus of responsibility within a class.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <ul>
            <li>
              <strong>Design-time focus:</strong> surfaces structural problems before code exists, improving
              adherence to principles such as Single Responsibility and Open/Closed.
            </li>
            <li>
              <strong>Methodology-neutral:</strong> metrics are computed on the model, enabling analysis in
              iterative or plan-driven processes alike.
            </li>
            <li>
              <strong>Standards-based:</strong> computations rely on SDMetrics’ formal metric definitions,
              ensuring reproducibility across UML 1.x/2.x meta-models.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Separator />

      {/* DEP_OUT */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Import Coupling via <code>Dep_Out</code></CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <h4 className="mt-0">Definition</h4>
          <p>
            <code>Dep_Out</code> measures how many distinct model elements a class depends on. It counts
            outgoing UML <em>dependency</em> and <em>usage</em> relationships (the dashed arrows in class
            diagrams, including «use»), aggregating them per class.
          </p>
          <h4>Computation</h4>
          <p>
            In SDMetrics terms, <code>Dep_Out = size(DepSuppSet)</code>, where <code>DepSuppSet</code> is the
            set of supplier elements that the class references via dependency or usage links. In the system,
            this value is shown in the Metrics panel for each node and is also compiled into the class–class
            dependency matrix to support package-level analyses.
          </p>
          <h4>Interpretation & Use in the UI</h4>
          <ul>
            <li>
              <strong>Hotspot detection:</strong> classes with high <code>Dep_Out</code> are highlighted as
              change-prone and candidates for decoupling (introduce interfaces, apply Dependency
              Inversion, split responsibilities, or use adapters/facades).
            </li>
            <li>
              <strong>Navigation:</strong> the graph emphasizes outgoing edges from selected nodes to make
              coupling sources salient; the search allows filtering for “high Dep_Out”.
            </li>
            <li>
              <strong>Recommendations integration:</strong> the rule engine flags when <code>Dep_Out</code>
              exceeds a configurable threshold; the LLM then proposes dependency-reducing strategies
              (e.g., extract gateway interfaces, invert relation direction, or move methods).
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* CAMC */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Cohesion via <code>CAMC</code> (Cohesion Among Methods of a Class)</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <h4 className="mt-0">Definition</h4>
          <p>
            <code>CAMC</code> quantifies the degree to which methods of a class operate on similar kinds of
            data, approximated through <em>parameter type</em> similarity. Intuitively, a class whose methods
            accept very different parameter types is likely mixing responsibilities.
          </p>
          <h4>Computation (SDMetrics formulation)</h4>
          <p>
            Two helper sets are derived per class:
          </p>
          <ul>
            <li>
              <code>OpParameterTypes</code> (domain: operation): for each operation, the set of its parameter
              types (each type counted once per operation).
            </li>
            <li>
              <code>ClsParameterTypesMS</code> (domain: class, multiset): the multiset union of
              <code>OpParameterTypes</code> over all operations of the class (if a type appears in 15 operations,
              its multiplicity is 15).
            </li>
          </ul>
          <p>
            With <code>NumOps = m</code> operations and <code>n = flatsize(ClsParameterTypesMS)</code> distinct
            parameter types, CAMC is computed as:
          </p>
          <pre className="whitespace-pre-wrap text-sm">CAMC = size(ClsParameterTypesMS) / (NumOps * flatsize(ClsParameterTypesMS))</pre>
          <p>
            Values approach 1 when many operations share parameter types (high cohesion), and decrease
            toward 0 as operations diverge in the kinds of data they process.
          </p>
          <h4>Interpretation & Use in the UI</h4>
          <ul>
            <li>
              <strong>Low CAMC:</strong> indicates scattered concerns; the UI labels the class as a cohesion
              outlier and the LLM suggests <em>Extract Class</em>, <em>Move Method</em>, or API redesign of
              parameter types (e.g., introduce value objects or role interfaces).
            </li>
            <li>
              <strong>High CAMC:</strong> methods concentrate on related data, supporting SRP; no action is
              proposed unless other risk signals are present.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Separator />

      {/* LLM RECOMMENDATIONS */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>LLM-Assisted Recommendations: Purpose and Workflow</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <ol>
            <li>
              <strong>Selection & Context Build:</strong> when a node is selected, the frontend assembles a
              focused context (element name, type, local neighborhood, and metric values).
            </li>
            <li>
              <strong>Rule-based Signals:</strong> simple checks (e.g., <code>CAMC</code> below a cohesion threshold,
              <code>Dep_Out</code> above a coupling threshold) annotate the context with explicit concerns.
            </li>
            <li>
              <strong>Prompting the LLM:</strong> the context is submitted to an LLM endpoint; the prompt asks
              for 3–5 concrete, justified refactorings aligned to the flagged metrics.
            </li>
            <li>
              <strong>Presentation:</strong> responses are rendered as structured recommendations in the
              Properties panel; each item is phrased as an action (e.g., “Introduce interface for external
              service; depend on abstraction; decouple X from Y”).
            </li>
          </ol>
          <p className="text-sm opacity-80">
            Notes: thresholds are configurable; the LLM guidance is advisory and should be validated via the
            Metrics table and graph relations before adoption.
          </p>
        </CardContent>
      </Card>

      {/* SEARCH */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Search and Prioritization</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <ul>
            <li>Search by name (class/interface/package) to locate elements quickly.</li>
            <li>Filter by “high <code>Dep_Out</code>” or “low <code>CAMC</code>” to triage hotspots.</li>
            <li>Drill down via the graph to inspect concrete dependency/usage edges driving the signal.</li>
          </ul>
        </CardContent>
      </Card>

      {/* METRICS TABLE */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Metrics Table and Relation Matrices</CardTitle>
          <CardDescription>
            Transparent numeric values that substantiate recommendations and enable verification.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <ul>
            <li>
              <strong>Per-class metrics:</strong> <code>Dep_Out</code>, <code>Dep_In</code>, <code>CAMC</code>,
              <code>LCOM</code>, and counts such as <code>NumOps</code>.
            </li>
            <li>
              <strong>Relation matrices:</strong> class dependencies, inheritance, interface realizations, and
              package dependencies for higher-level architectural assessments.
            </li>
          </ul>
        </CardContent>
      </Card>

      <Separator />

      {/* HOW IT FITS */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>System Flow</CardTitle>
        </CardHeader>
        <CardContent className="prose max-w-none leading-relaxed">
          <ol>
            <li>Import XMI → backend parses the model and computes SDMetrics-based values.</li>
            <li>Explore the graph → select nodes to reveal local metrics and relations.</li>
            <li>Search & filter → surface risk hotspots via CAMC/Dep_Out thresholds.</li>
            <li>Get recommendations → rules → LLM prompt → actionable refactorings.</li>
            <li>Verify → consult Metrics table and relation matrices; iterate on the design.</li>
          </ol>
          <p className="text-sm opacity-80">Outcome: a disciplined feedback loop for modular, maintainable designs.</p>
        </CardContent>
      </Card>
    </div>
  );
}