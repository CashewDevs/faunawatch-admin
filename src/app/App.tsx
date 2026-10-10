import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppRoutes } from "../core/constants/appRoutes";

/**
 * Root application component configuring React Router and placeholder routes.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={AppRoutes.login} replace />} />
        <Route
          path={AppRoutes.login}
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <h1 className="text-2xl font-semibold text-navy">
                Login (Placeholder)
              </h1>
            </div>
          }
        />
        <Route
          path={AppRoutes.users}
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <h1 className="text-2xl font-semibold text-navy">
                User Management (Placeholder)
              </h1>
            </div>
          }
        />
        <Route
          path={AppRoutes.posts}
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <h1 className="text-2xl font-semibold text-navy">
                Post Review (Placeholder)
              </h1>
            </div>
          }
        />
        <Route
          path={AppRoutes.analytics}
          element={
            <div className="flex min-h-screen items-center justify-center bg-background">
              <h1 className="text-2xl font-semibold text-navy">
                Analytics (Placeholder)
              </h1>
            </div>
          }
        />
        <Route path="*" element={<Navigate to={AppRoutes.login} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
