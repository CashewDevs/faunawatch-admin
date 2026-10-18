import type { ReactNode } from "react";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostApprovalsViewModel } from "../../viewmodels/usePostApprovalsViewModel";
import { PostCard } from "./PostCard";

interface PostGridProps {
  viewModel: PostApprovalsViewModel;
}

/**
 * Responsive grid of post cards with loading, empty, and error states.
 */
export function PostGrid({ viewModel }: PostGridProps) {
  const strings = AppStrings.posts;
  const { posts, isLoading, isError } = viewModel;

  if (isLoading) {
    return <Message busy>{strings.loading}</Message>;
  }

  if (isError) {
    return (
      <Message>
        <span role="alert">{strings.error}</span>{" "}
        <button
          type="button"
          onClick={viewModel.retry}
          className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {strings.retry}
        </button>
      </Message>
    );
  }

  if (posts.length === 0) {
    return <Message>{strings.empty}</Message>;
  }

  return (
    <ul
      aria-label={strings.gridLabel}
      className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6"
    >
      {posts.map((post) => (
        <li key={post.id} className="flex">
          <PostCard
            post={post}
            isSelected={viewModel.selectedIds.has(post.id)}
            onToggleSelect={viewModel.toggleSelection}
            onApprove={viewModel.approvePost}
            onDecline={viewModel.declinePost}
            isModerationAvailable={viewModel.isModerationAvailable}
          />
        </li>
      ))}
    </ul>
  );
}

function Message({
  children,
  busy = false,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <p
      aria-busy={busy}
      className="rounded-xl bg-white py-16 text-center text-sm text-muted"
    >
      {children}
    </p>
  );
}
