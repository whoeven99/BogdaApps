import axios from 'axios';

/**
 * Perform an HTTP GET request based on the provided environment and URLs.
 * @param {string} env - The current environment (e.g., 'production', 'development').
 * @param {string} prodUrl - The URL to use in the production environment.
 * @param {string} devUrl - The URL to use in the development environment.
 * @param {string} url - The API endpoint to append to the base URL.
 * @returns {Promise<any>} The response data from the API.
 */
export const httpGet = async (env: string, url: string): Promise<any> => {
  const domain = env === 'production'
      ? 'https://springbackendprod.azurewebsites.net'
      : 'https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net';

  try {
    const response = await axios.get(`${domain}${url}`);
    return response.data;
  } catch (error) {
    console.error('Error performing HTTP GET request:', error);
    throw error;
  }
};
