import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AdminLayout } from "../core/components/AdminLayout";
import { LoadingScreen } from "../core/components/LoadingScreen";
import { AppRoutes } from "../core/constants/appRoutes";
import { AppStrings } from "../core/constants/appStrings";
import { useAssetPreloader } from "../core/hooks/useAssetPreloader";
import { AnalyticsScreen } from "../features/analytics/views/screens/AnalyticsScreen";
import { AuthSessionProvider } from "../features/auth/viewmodels/AuthSessionProvider";
import { LoginScreen } from "../features/auth/views/screens/LoginScreen";
import { PostApprovalsScreen } from "../features/post-review/views/screens/PostApprovalsScreen";
import { PostDetailScreen } from "../features/post-review/views/screens/PostDetailScreen";
import { UserManagementScreen } from "../features/users/views/screens/UserManagementScreen";
import { preloadFontDescriptors, preloadImageUrls } from "./preloadManifest";
import { queryClient } from "./queryClient";
import { RedirectIfSignedIn, RequireAdmin } from "./routeGuards";

/**
 * Root application component: preloads assets behind a loading screen,
 * then provides the admin session and configures the app routes.
 */
function App() {
  const isReady = useAssetPreloader(preloadImageUrls, preloadFontDescriptors);

  if (!isReady) {
    return <LoadingScreen label={AppStrings.common.loading} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<RedirectIfSignedIn />}>
              <Route path={AppRoutes.login} element={<LoginScreen />} />
            </Route>
            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route
                  path={AppRoutes.users}
                  element={<UserManagementScreen />}
                />
                <Route
                  path={AppRoutes.posts}
                  element={<PostApprovalsScreen />}
                />
                <Route
                  path={AppRoutes.postDetail}
                  element={<PostDetailScreen />}
                />
                <Route
                  path={AppRoutes.analytics}
                  element={<AnalyticsScreen />}
                />
              </Route>
            </Route>
            {/* Signed-out visitors are sent on to the login screen by RequireAdmin. */}
            <Route
              path="*"
              element={<Navigate to={AppRoutes.users} replace />}
            />
          </Routes>
        </BrowserRouter>
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}

export default App;
