import axios from "axios";
import sitesData from "../data/sites.json";

export interface ResultItem {
  id: string;
  site: string;
  status: 'found' | 'not_found' | 'uncertain';
  url?: string;
  details?: string;
  category?: string;
}

export const searchSingleUsernameSite = async (username: string, site: any): Promise<ResultItem> => {
  try {
    const response = await axios.post("/api/search/username", {
      username,
      sites: [site]
    });

    const r = response.data.results[0];
    return {
      id: Math.random().toString(36).substr(2, 9),
      site: r.name,
      status: r.status,
      url: r.url,
      details: r.details,
      category: r.category
    };
  } catch (error) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      site: site.name,
      status: 'uncertain',
      details: "Network Error",
      category: site.category
    };
  }
};

export const searchUsername = async (username: string): Promise<ResultItem[]> => {
  // This is now a legacy wrapper or can be used for bulk if needed
  try {
    const response = await axios.post("/api/search/username", {
      username,
      sites: sitesData
    });

    return response.data.results.map((r: any, index: number) => ({
      id: `u-${index}`,
      site: r.name,
      status: r.status,
      url: r.url,
      details: r.details,
      category: r.category
    }));
  } catch (error) {
    console.error("Error searching username:", error);
    return [];
  }
};

export const searchEmail = async (email: string): Promise<ResultItem[]> => {
  try {
    const response = await axios.post("/api/search/email", { email });

    const results = response.data.results.map((r: any, index: number) => ({
      id: `e-${index}`,
      site: r.name,
      status: r.status,
      url: r.url,
      details: r.details
    }));

    return results;
  } catch (error) {
    console.error("Error searching email:", error);
    return [];
  }
};
