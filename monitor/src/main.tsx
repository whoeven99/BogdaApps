import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import DebugPrompt from "./DebugPrompt/DebugPrompt";
import Config from "./Config/config";

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/debug-prompt',
    element: <DebugPrompt />,
  },
  {
    path: '/Config',
    element: <Config />,
  }
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
