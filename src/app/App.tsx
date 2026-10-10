/**
 * Root application component.
 *
 * This file lives in src/app/ per AGENTS.md: "src/app/ holds the router,
 * providers, and route guards." For now it renders a placeholder; the
 * router and providers will be added when features are implemented.
 */
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-navy">FaunaWatch Admin</h1>
    </div>
  );
}

export default App;
