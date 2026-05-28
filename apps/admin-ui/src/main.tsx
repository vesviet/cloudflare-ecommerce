import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SWRConfig } from 'swr'
import './index.css'
import App from './App.tsx'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8788';

// Global fetcher that automatically includes X-Local-Admin-Email in dev mode
const fetcher = async (url: string) => {
  const headers: Record<string, string> = {};
  if (import.meta.env.DEV) {
    const localEmail = localStorage.getItem('admin_email');
    if (localEmail) {
      headers['X-Local-Admin-Email'] = localEmail;
    }
  }

  // Handle absolute vs relative URLs
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const res = await fetch(fullUrl, { headers });
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    (error as any).info = await res.json().catch(() => ({}));
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
        <App />
      </SWRConfig>
    </BrowserRouter>
  </StrictMode>,
)
