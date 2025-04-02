const API_BASE_URL = 'http://localhost:8080/api';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
};

const apiService = {
  getInitialData: async () => {
    const response = await fetch(`${API_BASE_URL}/xmi`, {
    });
    return handleResponse(response);
  },
  getMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/metrics`);
    return handleResponse(response);
  },
  calculateMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(response);
  },
  processXMI: async (filepath) => {
    const response = await fetch(`${API_BASE_URL}/xmi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filepath }),
    });
    return handleResponse(response);
  },
  getAllElements: async () => {
    const response = await fetch(`${API_BASE_URL}/diagram`);
    return handleResponse(response);
  },
  getParsedXMI: async () => {
    const response = await fetch(`${API_BASE_URL}/json`);
    return handleResponse(response);
  },
  updateElementAttribute: async () => {
    throw new Error('Element updates are not supported in this version');
  },
};

const fileOps = {
  readXMIFile: async (filepath) => {
    try {
      // Check if we have access to the Electron API
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }
      
      if (!filepath) {
        filepath = await window.electronAPI.openFile();
        if (!filepath) return null; // User canceled the dialog
      }
      
      const content = await window.electronAPI.readFile(filepath);
      return { filepath, content };
    } catch (err) {
      console.error("Error reading XMI file:", err);
      throw err;
    }
  },
  
  writeXMIFile: async (filepath, content) => {
    try {
      // Check if we have access to the Electron API
      if (!window.electronAPI) {
        throw new Error("Electron API not available");
      }
      
      if (!filepath) {
        filepath = await window.electronAPI.getFilePath();
        if (!filepath) return null; // User canceled the dialog
      }
      
      await window.electronAPI.writeFile(filepath, content);
      return filepath;
    } catch (err) {
      console.error("Error writing XMI file:", err);
      throw err;
    }
  }
};

export default apiService;
export { fileOps };