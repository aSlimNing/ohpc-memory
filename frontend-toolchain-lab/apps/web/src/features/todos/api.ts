import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  config.headers.set("x-lab-client", "toolchain-lab");
  return config;
});

export interface ServerTask {
  id: number;
  title: string;
  completed: boolean;
}

export async function fetchServerTasks(limit = 5): Promise<ServerTask[]> {
  const { data } = await api.get<ServerTask[]>(`/tasks?_limit=${limit}`);
  return data;
}
