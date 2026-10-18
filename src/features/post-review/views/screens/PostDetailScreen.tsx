import type { ReactNode } from "react";
import { useParams } from "react-router";
import { AppStrings } from "../../../../core/constants/appStrings";
import { usePostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";
import { AdminNotesCard } from "../components/AdminNotesCard";
import { AiAnalysisCard } from "../components/AiAnalysisCard";
import { PostCommentsCard } from "../components/PostCommentsCard";
import { PostContentCard } from "../components/PostContentCard";
import { PostDecisionBar } from "../components/PostDecisionBar";
import { PostDetailHeader } from "../components/PostDetailHeader";
import { PostGallery } from "../components/PostGallery";
import { PostLocationCard } from "../components/PostLocationCard";
import { ReporterCard } from "../components/ReporterCard";

/**
 * One post's review page. Keyed by post so gallery, comment, and note
 * state starts fresh on Prev / Next.
 */
export function PostDetailScreen() {
  const { postId = "" } = useParams();
  return <PostDetailContent key={postId} postId={postId} />;
}

function PostDetailContent({ postId }: { postId: string }) {
  const viewModel = usePostDetailViewModel(postId);
  const strings = AppStrings.posts.detail;
  const { post } = viewModel;

  let body: ReactNode;
  if (viewModel.isLoading) {
    body = <Message busy>{strings.loading}</Message>;
  } else if (viewModel.isError) {
    body = (
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
  } else if (!post) {
    body = <Message>{strings.notFound}</Message>;
  } else {
    body = (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,643fr)_minmax(0,453fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <PostGallery post={post} viewModel={viewModel} />
          <PostContentCard post={post} />
          <PostLocationCard post={post} viewModel={viewModel} />
          <PostCommentsCard post={post} viewModel={viewModel} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <ReporterCard post={post} approvalRate={viewModel.approvalRate} />
          <AiAnalysisCard post={post} />
          <AdminNotesCard viewModel={viewModel} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 animate-fade-in flex-col motion-reduce:animate-none">
      <div className="flex flex-col gap-4 px-8 pt-5 pb-8">
        <PostDetailHeader viewModel={viewModel} />
        {body}
      </div>
      {post && <PostDecisionBar post={post} viewModel={viewModel} />}
    </div>
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
