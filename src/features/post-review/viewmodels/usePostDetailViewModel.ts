import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { AppStrings } from "../../../core/constants/appStrings";
import { isRequestChangesEnabled } from "../../../core/constants/featureFlags";
import { useNotice } from "../../../core/hooks/useNotice";
import {
  formatCoordinates,
  formatNumber,
} from "../../../core/utils/formatters";
import { adminNoteMaxLength, canSaveAdminNote } from "../models/adminNote";
import { addAdminNote, fetchAdminNotes } from "../services/adminNotesService";
import { userVerifiedQuery } from "../../users/viewmodels/userQueries";
import {
  getApprovalRate,
  getObserverDevices,
  getQueuePosition,
  humanizeKey,
  sortComments,
  type CommentSort,
} from "../models/post";
import { canWithdrawChangeRequest } from "../models/changeRequest";
import { canTakeDown, isDecidable } from "../models/moderation";
import { fetchChangeRequests } from "../services/changeRequestService";
import { fetchPost } from "../services/postsService";
import { getReturnPath } from "./postNavigation";
import { allPostsQuery, signedUrlStaleTimeMs } from "./postQueries";
import { useChangeRequestFlow } from "./useChangeRequestFlow";
import { useCommentModerationFlow } from "./useCommentModerationFlow";
import { useModerationFlow } from "./useModerationFlow";

/** Comments shown before "Show more comments". */
export const initialCommentCount = 3;

export const copiedResetMs = 2000;

/** The note's length shows once it reaches this share of the limit. */
export const noteCounterThreshold = 0.9;

/** The last note save: none since typing, saved, or failed. */
export type NoteStatus = "idle" | "saved" | "failed";

const noteStrings = AppStrings.posts.detail.notes;

/**
 * Presentation state and actions for one post's review page: the post,
 * its place in the queue, photo gallery, comments and their moderation,
 * coordinates, and the admin's note and decision.
 *
 * Render the screen with `key={postId}` so this state resets per post.
 */
export function usePostDetailViewModel(postId: string) {
  const location = useLocation();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const [showAllComments, setShowAllComments] = useState(false);
  const queryClient = useQueryClient();
  const [adminNote, setAdminNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<NoteStatus>("idle");
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

  const notesQuery = useQuery({
    queryKey: ["posts", "notes", postId],
    queryFn: () => fetchAdminNotes(postId),
  });
  const noteMutation = useMutation({
    mutationFn: (body: string) => addAdminNote(postId, body),
  });
  const hasNoteToSave = canSaveAdminNote(adminNote);

  const saveNote = () => {
    if (!hasNoteToSave || noteMutation.isPending) return;
    noteMutation.mutate(adminNote, {
      onSuccess: () => {
        // Only clear what was saved; text typed meanwhile stays.
        setAdminNote((current) => (current === adminNote ? "" : current));
        setNoteStatus("saved");
        void queryClient.invalidateQueries({
          queryKey: ["posts", "notes", postId],
        });
      },
      onError: () => {
        setNoteStatus("failed");
      },
    });
  };

  // The page stays on the post; the reload swaps the buttons for the result.
  // Unsaved note text is saved with the decision, so nothing typed is lost.
  // Decisions and comment changes share one message area.
  const notice = useNotice();
  const moderation = useModerationFlow({
    onDecided: saveNote,
    dialogHint: hasNoteToSave ? noteStrings.savedWithDecision : null,
    notice,
  });
  const commentModeration = useCommentModerationFlow({ postId, notice });
  // Request changes and Withdraw share the page's message area too, and
  // save unsaved note text with the change like a decision does.
  const changeRequest = useChangeRequestFlow({
    postId,
    notice,
    onChanged: saveNote,
    dialogHint: hasNoteToSave ? noteStrings.savedWithChange : null,
  });
  const changeRequestsQuery = useQuery({
    queryKey: ["posts", "changeRequests", postId],
    queryFn: () => fetchChangeRequests(postId),
  });

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
    changeAdminNote: (value: string) => {
      setAdminNote(value);
      setNoteStatus("idle");
    },
    adminNoteMaxLength,
    /** "1,980 / 2,000", shown only near the limit. */
    adminNoteLengthLabel:
      adminNote.length >= adminNoteMaxLength * noteCounterThreshold
        ? `${formatNumber(adminNote.length)} ${noteStrings.lengthSeparator} ${formatNumber(adminNoteMaxLength)}`
        : null,
    canSaveNote: hasNoteToSave && !noteMutation.isPending,
    isSavingNote: noteMutation.isPending,
    saveNote,
    noteStatus,
    notes: notesQuery.data ?? [],
    isNotesLoading: notesQuery.isPending,
    isNotesError: notesQuery.isError,
    retryNotes: () => void notesQuery.refetch(),
    moderation,
    commentModeration,
    changeRequest,
    changeRequests: changeRequestsQuery.data ?? [],
    isChangeRequestsError: changeRequestsQuery.isError,
    retryChangeRequests: () => void changeRequestsQuery.refetch(),
    canDecide: post ? isDecidable(post.status) : false,
    canTakeDown: post ? canTakeDown(post.status) : false,
    /** Request changes is switched on (see core/constants/featureFlags.ts). */
    isRequestChangesAvailable: isRequestChangesEnabled(),
    /** Withdraw works whatever the switch says, so a stray request can be handled. */
    canWithdrawRequest: post ? canWithdrawChangeRequest(post.status) : false,
    approve: () => {
      moderation.open("approve", [postId]);
    },
    decline: () => {
      moderation.open("decline", [postId]);
    },
    takeDown: () => {
      moderation.open("takeDown", [postId]);
    },
    requestChanges: () => {
      if (!isRequestChangesEnabled()) return;
      changeRequest.open("request");
    },
    withdrawRequest: () => {
      changeRequest.open("withdraw");
    },
  };
}

export type PostDetailViewModel = ReturnType<typeof usePostDetailViewModel>;
