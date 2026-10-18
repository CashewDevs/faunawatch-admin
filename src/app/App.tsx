import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AdminLayout } from "../core/components/AdminLayout";
import { LoadingScreen } from "../core/components/LoadingScreen";
import { AppRoutes } from "../core/constants/appRoutes";
import { AppStrings } from "../core/constants/appStrings";
import { useAssetPreloader } from "../core/hooks/useAssetPreloader";
import { LoginScreen } from "../features/auth/views/screens/LoginScreen";
import { UserManagementScreen } from "../features/users/views/screens/UserManagementScreen";
import { preloadFontDescriptors, preloadImageUrls } from "./preloadManifest";
import { queryClient } from "./queryClient";

/**
 * Root application component: preloads assets behind a loading screen,
 * then configures React Router and the app routes.
 */
function App() {
  const isReady = useAssetPreloader(preloadImageUrls, preloadFontDescriptors);

  if (!isReady) {
    return <LoadingScreen label={AppStrings.common.loading} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to={AppRoutes.login} replace />} />
          <Route path={AppRoutes.login} element={<LoginScreen />} />
          {/* TODO(auth): Wrap this layout in an admin route guard once Supabase auth exists. */}
          <Route element={<AdminLayout />}>
            <Route path={AppRoutes.users} element={<UserManagementScreen />} />
          </Route>
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
    </QueryClientProvider>
  );
}

export default App;
