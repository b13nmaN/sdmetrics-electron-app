// utils/apiService.js

const API_BASE_URL = 'http://localhost:8080/api';

// Helper function to handle fetch responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  
  // Check if response has content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};

// API service object with methods for each endpoint
const apiService = {
  // Metrics endpoints
  getMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/metrics`);
    return handleResponse(response);
  },
  
  calculateMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log("this is the responses",response);
    return handleResponse(response);
  },
  
  // XMI endpoints
  getLatestXMI: async () => {
    const response = await fetch(`${API_BASE_URL}/xmi`);
    return handleResponse(response);
  },
  
  uploadXMI: async (xmiContent, fileName) => {
    const response = await fetch(`${API_BASE_URL}/xmi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: xmiContent,
        fileName: fileName
      })
    });
    return handleResponse(response);
  },
  
  updateXMI: async (xmiContent) => {
    const response = await fetch(`${API_BASE_URL}/xmi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'update_xmi',
        content: xmiContent
      })
    });
    return handleResponse(response);
  },
  
  // Diagram elements endpoints
  getAllElements: async () => {
    const response = await fetch(`${API_BASE_URL}/diagram`);
    return handleResponse(response);
  },
  
  updateElementAttribute: async (elementId, attribute, newValue) => {
    const response = await fetch(`${API_BASE_URL}/diagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        elementId: elementId,
        attribute: attribute,
        newValue: newValue
      })
    });
    return handleResponse(response);
  }
};

export default apiService;