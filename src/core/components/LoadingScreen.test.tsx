import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("announces the loading label to assistive technology", () => {
    render(<LoadingScreen label="Loading FaunaWatch Admin" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading FaunaWatch Admin",
    );
  });
});
