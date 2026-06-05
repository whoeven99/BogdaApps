import React from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { useNavigate } from 'react-router-dom';

/**
 * A custom Link component that uses App Bridge for navigation in embedded Shopify apps.
 * It falls back to react-router-dom's navigate for non-embedded contexts.
 */
export function CustomLink({ to, children, ...props }) {
  const app = useAppBridge();
  const navigate = useNavigate();

  const handleClick = (e) => {
    e.preventDefault();

    if (app) {
      // Use App Bridge Redirect for embedded apps
      const redirect = Redirect.create(app);
      redirect.dispatch(Redirect.Action.APP, to);
    } else {
      // Fallback to React Router for non-embedded context
      navigate(to);
    }
  };

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
