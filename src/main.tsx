import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";

// Non-null assertion: the #root element is guaranteed to exist in index.html.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
