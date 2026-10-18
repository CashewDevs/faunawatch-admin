import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { formatCoordinates } from "../../../core/utils/formatters";
import {
  getApprovalRate,
  sortComments,
  type CommentSort,
} from "../models/post";
import { fetchPost, fetchPostQueuePosition } from "../services/postsService";
import { getReturnPath } from "./postNavigation";

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
  });

  const queueQuery = useQuery({
    queryKey: ["posts", "queue", postId],
    queryFn: () => fetchPostQueuePosition(postId),
    placeholderData: keepPreviousData,
  });

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
  const photoCount = post?.photoUrls.length ?? 0;
  const sortedComments = post ? sortComments(post.comments, commentSort) : [];
  const visibleComments = showAllComments
    ? sortedComments
    : sortedComments.slice(0, initialCommentCount);
  const coordinatesLabel = post
    ? formatCoordinates(post.location.latitude, post.location.longitude)
    : "";

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

  // TODO(moderation): Approve, decline, and request changes need the
  // reports moderation status column, an admin-only RLS policy (or Edge
  // Function), and a place to store the admin note with the decision.
  // Visual only until then.
  const approve = () => undefined;
  const decline = () => undefined;
  const requestChanges = () => undefined;

  return {
    post,
    isLoading: postQuery.isPending,
    isError: postQuery.isError,
    isNotFound: postQuery.isSuccess && postQuery.data === null,
    retry: () => void postQuery.refetch(),
    queue: queueQuery.data ?? undefined,
    returnPath: getReturnPath(location.state),
    /** Router state to forward on Prev / Next so Back still works. */
    linkState: location.state as unknown,
    photoIndex,
    photoCount,
    currentPhotoUrl: post?.photoUrls[photoIndex],
    showPhoto,
    showPreviousPhoto: () => {
      showPhoto(photoIndex - 1);
    },
    showNextPhoto: () => {
      showPhoto(photoIndex + 1);
    },
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
