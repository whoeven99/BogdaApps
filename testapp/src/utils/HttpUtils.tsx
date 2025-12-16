import axios from 'axios';

export const httpGet = async (env: any, url: string): Promise<any> => {
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
