# UML Insight: Visualizing and Optimizing UML Class Diagrams

## Overview

UML Insight is a desktop application designed to assist software engineers and students in analyzing UML class diagrams. It calculates key design metrics like coupling and cohesion using the SDMetrics library, provides interactive visualizations, and leverages Large Language Models (LLMs) via the TogetherAI API to offer actionable design improvement suggestions. This tool aims to make UML analysis more dynamic and insightful, moving beyond static metric reports.

The application consists of two main parts:
*   **Backend:** A Java application built with Maven, utilizing an embedded Jetty server. It handles XMI parsing, metric calculation with SDMetrics, and communication with the LLM.
*   **Frontend:** An Electron application built with React and Vite, providing the user interface for diagram visualization and interaction.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
*   **Git:** For cloning the repository.
*   **Java Development Kit (JDK):** Version 11 or higher.
*   **Apache Maven:** Version 3.6.x or higher (for building and running the backend).
*   **Node.js:** Version 18.x or higher (this includes npm, the Node Package Manager, for the frontend).
*   **TogetherAI API Key:** You will need an API key from [Together.ai](https://www.together.ai/) to use the LLM-powered recommendation feature.

## Getting Started & Running the Application

Follow these steps to clone, set up, and run UML Insight:

### 1. Clone the Repository

First, clone the project repository from GitHub to your local machine:

```bash
git clone https://github.com/b13nmaN/sdmetrics-electron-app.git
cd SDMETRICS-ELECTRON-APP
