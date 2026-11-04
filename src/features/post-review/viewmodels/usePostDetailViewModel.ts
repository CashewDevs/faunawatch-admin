import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AppStrings } from "../../../core/constants/appStrings";
import { formatCoordinates } from "../../../core/utils/formatters";
import { userVerifiedQuery } from "../../users/viewmodels/userQueries";
import {
  getApprovalRate,
  getObserverDevices,
  getQueuePosition,
  humanizeKey,
  sortComments,
  type CommentSort,
} from "../models/post";
import { fetchPost } from "../services/postsService";
import { getReturnPath } from "./postNavigation";
import { allPostsQuery, signedUrlStaleTimeMs } from "./postQueries";

/** Comments shown before "Show more comments". */
export const initialCommentCount = 3;

export const copiedResetMs = 2000;

/**
 * Presentation state and actions for one post's review page: the post,
 * its place in the queue, photo gallery, comments, coordinates, and the
 * admin's note and decision.
 *
 * Render the screen with `key={postId}` so this state resets per post.
 */
export function usePostDetailViewModel(postId: string) {
  const location = useLocation();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const [showAllComments, setShowAllComments] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const postQuery = useQuery({
    queryKey: ["posts", "detail", postId],
    queryFn: () => fetchPost(postId),
    staleTime: signedUrlStaleTimeMs,
  });

  // The same list the Post Approvals screen loads, usually already cached.
  const allPosts = useQuery(allPostsQuery).data;

  useEffect(() => {
    if (!isCopied) return;
    const timer = setTimeout(() => {
      setIsCopied(false);
    }, copiedResetMs);
    return () => {
      clearTimeout(timer);
    };
  }, [isCopied]);

  const post = postQuery.data ?? undefined;
  const isReporterVerified = useQuery(
    userVerifiedQuery(post?.reporter.id),
  ).data;
  const photoCount = post?.photos.length ?? 0;
  const currentPhoto = post?.photos[photoIndex];
  const sortedComments = post ? sortComments(post.comments, commentSort) : [];
  const visibleComments = showAllComments
    ? sortedComments
    : sortedComments.slice(0, initialCommentCount);
  const coordinatesLabel = post
    ? formatCoordinates(post.location.latitude, post.location.longitude)
    : "";
  const checkLabels = AppStrings.posts.detail.ai.checks;

  const showPhoto = (index: number) => {
    if (photoCount === 0) return;
    setPhotoIndex(((index % photoCount) + photoCount) % photoCount);
  };

  const copyCoordinates = async () => {
    try {
      await navigator.clipboard.writeText(coordinatesLabel);
      setIsCopied(true);
    } catch {
      // Clipboard access can be denied; the coordinates stay visible.
    }
  };

  // TODO(moderation): Approve, decline, and request changes go through
  // admin_decide_report, with the admin note stored in admin_notes.
  // Visual only until the team switches moderation on.
  const approve = () => undefined;
  const decline = () => undefined;
  const requestChanges = () => undefined;

  return {
    post,
    isLoading: postQuery.isPending,
    isError: postQuery.isError,
    isNotFound: postQuery.isSuccess && postQuery.data === null,
    retry: () => void postQuery.refetch(),
    queue: allPosts
      ? (getQueuePosition(allPosts, postId) ?? undefined)
      : undefined,
    returnPath: getReturnPath(location.state),
    /** Router state to forward on Prev / Next so Back still works. */
    linkState: location.state as unknown,
    photoIndex,
    photoCount,
    currentPhotoUrl: currentPhoto?.url ?? undefined,
    /** EXIF of the photo being shown, for the camera and flash overlays. */
    currentPhotoExif: currentPhoto?.exif ?? null,
    showPhoto,
    showPreviousPhoto: () => {
      showPhoto(photoIndex - 1);
    },
    showNextPhoto: () => {
      showPhoto(photoIndex + 1);
    },
    observerDevice: post ? getObserverDevices(post.photos) : null,
    aiChecklist:
      post?.ai?.checklist.map((item) => ({
        ...item,
        label: checkLabels[item.key] ?? humanizeKey(item.key),
      })) ?? [],
    commentSort,
    changeCommentSort: setCommentSort,
    comments: visibleComments,
    commentCount: sortedComments.length,
    hiddenCommentCount: sortedComments.length - visibleComments.length,
    showAllComments,
    toggleComments: () => {
      setShowAllComments((current) => !current);
    },
    coordinatesLabel,
    copyCoordinates: () => void copyCoordinates(),
    isCopied,
    isReporterVerified: isReporterVerified ?? false,
    approvalRate: post ? getApprovalRate(post.reporterStats) : 0,
    adminNote,
    changeAdminNote: setAdminNote,
    isModerationAvailable: false,
    approve,
    decline,
    requestChanges,
  };
}

export type PostDetailViewModel = ReturnType<typeof usePostDetailViewModel>;
