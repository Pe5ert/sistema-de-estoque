import { RouteFailure } from './RouteFailure';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/auth';
import { App } from './App';
import { FeedbackProvider } from './feedback';
import './styles.css';
import { ThemeProvider } from './Theme';
import './appearance.css';
import './product-form.css';
import './customers.css';

const queryClient = new QueryClient();
const router = createBrowserRouter([{ path: '*', errorElement: <RouteFailure />, element: <FeedbackProvider><AuthProvider><App /></AuthProvider></FeedbackProvider> }]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider><QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider></ThemeProvider>
  </React.StrictMode>,
);
