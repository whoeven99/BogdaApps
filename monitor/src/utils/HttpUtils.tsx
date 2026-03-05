import axios from 'axios';

/** prod / test 后端域名 */
export const BACKEND_DOMAINS = {
  prod: 'https://springbackendprod.azurewebsites.net',
  test: 'https://springbackendservice-e3hgbjgqafb9cpdh.canadacentral-01.azurewebsites.net',
} as const;

export type BackendEnv = 'prod' | 'test';

function getDomain(env: any): string {
  const normalized = env === 'productions' || env === 'production' ? 'prod' : env;
  return normalized === 'prod' ? BACKEND_DOMAINS.prod : BACKEND_DOMAINS.test;
}

export const httpGet = async (env: any, url: string): Promise<any> => {
  const domain = getDomain(env);

  try {
    const response = await axios.get(`${domain}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error performing HTTP GET request:', error);
    throw error;
  }
};

export const httpPost = async (env: any, url: string, data: any): Promise<any> => {
  const domain = getDomain(env);

  try {
    const response = await axios.post(`${domain}${url}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error performing HTTP POST request:', error);
    throw error;
  }
};

export const httpDelete = async (env: any, url: string, data?: any): Promise<any> => {
  const domain = getDomain(env);

  try {
    const response = await axios.delete(`${domain}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data,
    });
    return response.data;
  } catch (error) {
    console.error('Error performing HTTP DELETE request:', error);
    throw error;
  }
};

export const httpPut = async (env: any, url: string, data: any): Promise<any> => {
  const domain = getDomain(env);

  try {
    const response = await axios.put(`${domain}${url}`, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error performing HTTP PUT request:', error);
    throw error;
  }
};
