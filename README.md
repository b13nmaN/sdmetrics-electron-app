# UML Insight: A Tool for Visualizing and Optimizing UML Class Diagrams

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

UML Insight is a desktop application designed to help software engineers and students analyze UML class diagrams. It focuses on calculating and visualizing key design metrics like coupling and cohesion, and uniquely leverages Large Language Models (LLMs) to provide actionable design recommendations. This tool aims to bridge the gap between static metric analysis and practical, real-time design improvement.

## Table of Contents

1.  [Introduction](#introduction)
2.  [Features](#features)
3.  [Architecture Overview](#architecture-overview)
4.  [Technologies Used](#technologies-used)
5.  [Prerequisites](#prerequisites)
6.  [Getting Started](#getting-started)
    *   [Cloning the Repository](#cloning-the-repository)
    *   [Backend Setup (Java/Maven)](#backend-setup-java-maven)
    *   [Frontend Setup (Electron/React/Vite)](#frontend-setup-electron-react-vite)
7.  [Running the Application](#running-the-application)
8.  [How It Works (Usage)](#how-it-works-usage)
9.  [Project Structure Highlight (Backend)](#project-structure-highlight-backend)
10. [Test Data](#test-data)
11. [Limitations](#limitations)
12. [Future Work](#future-work)
13. [License](#license)
14. [Acknowledgements](#acknowledgements)

## Introduction

Designing robust and maintainable software systems is crucial. UML class diagrams are a cornerstone of object-oriented design, and metrics like coupling and cohesion provide quantitative insights into design quality. However, traditional tools often provide only static numerical data, leaving the interpretation and actionable steps to the designer.

UML Insight aims to enhance this process by:
*   Providing **interactive visualizations** of UML class diagrams and their metrics.
*   Integrating established metric calculation using the **SDMetrics library**.
*   Leveraging the power of **Large Language Models (LLMs)** to offer context-aware design improvement suggestions.
*   Offering a **user-friendly interface** suitable for both educational purposes and professional software engineering practice.

This project follows a Design Research Methodology (DRM) to ensure a systematic approach to creating and evaluating this innovative artifact.

## Features

*   **XMI Parsing:** Loads and parses UML class diagrams from XMI (XML Metadata Interchange) files.
*   **Metric Calculation:** Calculates key software design metrics, focusing on coupling (e.g., Dependency Out - Dep_Out) and cohesion (e.g., Conceptual Approach to Modularity - CAMC) using the SDMetrics library.
*   **Interactive Visualization:** Displays UML class diagrams as interactive graphs (nodes for classes/interfaces/packages, edges for relationships) using Cytoscape.js. Allows for zooming, panning, and element selection.
*   **Detailed Element Properties:** Shows attributes, methods, relationships, and calculated metrics for selected UML elements.
*   **LLM-Powered Design Recommendations:**
    *   Generates actionable refactoring suggestions based on the selected element's context and metric violations.
    *   Utilizes the TogetherAI API (Meta Llama 3.3 70B Instruct Turbo model) for intelligent advice.
*   **Rule-Based Recommendations:** Provides simple, immediate recommendations based on predefined metric thresholds.
*   **Cross-Platform Desktop Application:** Built with Electron for wider accessibility.

## Architecture Overview

UML Insight employs a client-server architecture:

*   **Backend (Java, Jetty):**
    *   Located in the `back-end` directory of the project.
    *   Handles XMI file parsing and processing using the SDMetrics library.
    *   Calculates coupling, cohesion, and other design metrics.
    *   Structures data (UML model elements, metrics, relationships) into JSON format.
    *   Constructs prompts and interacts with the TogetherAI LLM API for design recommendations.
    *   Exposes RESTful APIs for the frontend via an embedded Jetty server.
    *   Manages relationship matrices (e.g., Class Dependencies, Interface Realizations).

*   **Frontend (Electron, React, Vite):**
    *   Located in a separate frontend directory (e.g., `frontend-src` - *you'll need to specify its actual name if different from the root or `SDMETRICS-ELECTRON-APP/frontend`*).
    *   Provides the graphical user interface (GUI).
    *   Manages file uploads and displays diagram visualizations (using Cytoscape.js).
    *   Presents element properties, metrics, rule-based tips, and LLM-generated recommendations.
    *   Communicates with the backend via HTTP requests.

## Technologies Used

*   **Backend:**
    *   Java 11 (as per `pom.xml`)
    *   Apache Maven (for build and dependency management)
    *   SDMetrics Library (for UML parsing and metric calculation)
    *   Jetty (Embedded HTTP Server)
    *   Jackson (for JSON processing)
    *   TogetherAI API (Meta Llama 3.3 70B Instruct Turbo model)
*   **Frontend:**
    *   Electron.js (for cross-platform desktop application)
    *   React.js (for building the user interface)
    *   Vite (as the build tool and development server for React)
    *   Node.js & npm (for package management and running scripts)
    *   Cytoscape.js (for graph visualization)
    *   Tailwind CSS (for UI styling)
*   **Data Formats:**
    *   XMI (Input for UML diagrams)
    *   JSON (Internal data exchange, LLM context)

## Prerequisites

Before you begin, ensure you have the following installed:
*   Java Development Kit (JDK) - Version 11 or higher (as specified in `pom.xml`)
*   Apache Maven - Version 3.6.x or higher
*   Node.js - Version 18.x or higher (includes npm)
*   Git
*   (Optional) An XMI-compatible UML modeling tool to create/edit test files.

## Getting Started

### Cloning the Repository

```bash
git clone [URL_OF_YOUR_GITHUB_REPOSITORY]
cd SDMETRICS-ELECTRON-APP
