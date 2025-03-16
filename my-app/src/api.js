import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

export const uploadFile = async (formData) => {
  return axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const analyzeFile = async (formData) => {
  return axios.post(`${API_BASE_URL}/analyze`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const convertFile = async (formData) => {
  return axios.post(`${API_BASE_URL}/convert`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
