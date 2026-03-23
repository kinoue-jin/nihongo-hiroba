import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

export const fastapi = {
  get: async (path: string) =>
    fetch(`${API_URL}${path}`, { headers: await getAuthHeader() }),

  post: async (path: string, body: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { ...await getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),

  put: async (path: string, body: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "PUT",
      headers: { ...await getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),

  delete: async (path: string) =>
    fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: await getAuthHeader()
    }),
};

export { API_URL };
