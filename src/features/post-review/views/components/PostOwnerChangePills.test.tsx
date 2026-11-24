import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppStrings } from "../../../../core/constants/appStrings";
import { PostOwnerChangePills } from "./PostOwnerChangePills";

const strings = AppStrings.posts.ownerChange;

describe("PostOwnerChangePills", () => {
  it("shows nothing for an unchanged post", () => {
    const { container } = render(
      <PostOwnerChangePills
        post={{ isHiddenByOwner: false, isEditedAfterApproval: false }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("labels a hidden and an edited post, with an explanation", () => {
    render(
      <PostOwnerChangePills
        post={{ isHiddenByOwner: true, isEditedAfterApproval: true }}
      />,
    );
    expect(screen.getByText(strings.hidden)).toHaveAttribute(
      "title",
      strings.hiddenHint,
    );
    expect(screen.getByText(strings.edited)).toHaveAttribute(
      "title",
      strings.editedHint,
    );
  });
});
