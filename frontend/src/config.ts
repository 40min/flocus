const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error("Missing required environment variable: REACT_APP_API_URL");
}

export const config = {
  API_URL,
};
