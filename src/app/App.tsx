import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AdminLayout } from "../core/components/AdminLayout";
import { LoadingScreen } from "../core/components/LoadingScreen";
import { ScreenErrorBoundary } from "../core/components/ScreenErrorBoundary";
import { AppRoutes } from "../core/constants/appRoutes";
import { AppStrings } from "../core/constants/appStrings";
import { useAssetPreloader } from "../core/hooks/useAssetPreloader";
import { AuthSessionProvider } from "../features/auth/viewmodels/AuthSessionProvider";
import { ForgotPasswordScreen } from "../features/auth/views/screens/ForgotPasswordScreen";
import { LoginScreen } from "../features/auth/views/screens/LoginScreen";
import { ResetPasswordScreen } from "../features/auth/views/screens/ResetPasswordScreen";
import { PostApprovalsScreen } from "../features/post-review/views/screens/PostApprovalsScreen";
import { PostDetailScreen } from "../features/post-review/views/screens/PostDetailScreen";
import { UserManagementScreen } from "../features/users/views/screens/UserManagementScreen";
import { preloadFontDescriptors, preloadImageUrls } from "./preloadManifest";
import { queryClient } from "./queryClient";
import { RedirectIfSignedIn, RequireAdmin } from "./routeGuards";

// Analytics is the only screen that uses Recharts, so it loads on first
// visit instead of with the rest of the app.
const AnalyticsScreen = lazy(() =>
  import("../features/analytics/views/screens/AnalyticsScreen").then(
    (module) => ({ default: module.AnalyticsScreen }),
  ),
);

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
              <Route
                path={AppRoutes.forgotPassword}
                element={<ForgotPasswordScreen />}
              />
            </Route>
            {/* Outside the guards: using the link signs the visitor in, and
                the form must stay up until the new password is saved. */}
            <Route
              path={AppRoutes.resetPassword}
              element={<ResetPasswordScreen />}
            />
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
                  element={
                    <ScreenErrorBoundary>
                      <Suspense fallback={<ScreenLoading />}>
                        <AnalyticsScreen />
                      </Suspense>
                    </ScreenErrorBoundary>
                  }
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

/** Shown inside the admin layout while a lazily loaded screen downloads. */
function ScreenLoading() {
  return (
    <div className="px-8 pt-5 pb-8">
      <p
        aria-busy="true"
        className="rounded-xl bg-white py-16 text-center text-sm text-muted"
      >
        {AppStrings.analytics.loadingScreen}
      </p>
    </div>
  );
}

export default App;
