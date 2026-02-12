import { Outlet } from 'react-router-dom';
import { Footer } from '../Footer';

/**
 * Root layout component that wraps all routes.
 *
 * Renders the page content via Outlet and appends the shared Footer,
 * ensuring the footer appears on every page without manual imports.
 */
export const AppLayout = () => {
  return (
    <>
      <Outlet />
      <Footer />
    </>
  );
};
