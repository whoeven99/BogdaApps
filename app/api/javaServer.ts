import axios from "axios";
import { json } from "stream/consumers";

export const getAdTemplates = async () => {
  try {
    // const response = await axios.get("http://localhost:8080/api/data");
    // return response.data;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      adTemplates: [
        {
          id: 1,
          url: "https://static-photo-studio.promer.ai/ads-assets/Whitelist-limit/Books/Feature%20&%20Benefit/1_1/medium/1748.png",
          title: "Stop the negative thought loops.",
        },
        {
          id: 2,
          url: "https://static-photo-studio.promer.ai/ads-assets/AdsFlow1/Books/Offer%20&%20Sale/1_1/medium/288.png",
          title: "How to scope with a loss of a loved one",
        },
        {
          id: 3,
          url: "https://static-photo-studio.promer.ai/ads-assets/crawler/Books/Problem%20&%20Solution/1_1/medium/834.png",
          title: "STOP BEING LAZY",
        },
        {
          id: 4,
          url: "https://static-photo-studio.promer.ai/ads-assets/crawler/Books/Us%20and%20Them/1_1/medium/2896.png",
          title: "Unlock your full potential",
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching Java server data:", error);
    return [];
  }
};

export const getRecentProjects = async () => {
  try {
    // const response = await axios.get("http://localhost:8080/api/data");
    // return response.data;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      recentProjects: [
        {
          id: 1,
          url: "https://static-photo-studio.promer.ai/ads-assets/crawler/Books/Us%20and%20Them/1_1/medium/2896.png",
          title: "Elevate your western style.",
        },
        {
          id: 2,
          url: "https://static-photo-studio.promer.ai/ads-assets/crawler/Books/Problem%20&%20Solution/1_1/medium/834.png",
          title: "Empty Project",
        },
      ],
    };
  } catch (error) {
    console.error("Error fetching Java server data:", error);
    return [];
  }
};
