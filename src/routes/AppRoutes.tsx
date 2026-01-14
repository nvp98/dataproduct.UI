import { BrowserRouter, useRoutes } from "react-router-dom";

// Import layout và pages
import { routes } from "./routes";

// Component AppRoutes
const AppRoutes = () => {
  // dùng useRoutes với config
  const element = useRoutes(routes);
  return element;
};

// Bọc trong BrowserRouter
const RouterWrapper = () => {
  return (
    <BrowserRouter basename="/sanxuat">
      <AppRoutes />
    </BrowserRouter>
  );
};

export default RouterWrapper;
