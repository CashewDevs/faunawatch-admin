import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { useNow } from "../../../../core/hooks/useNow";
import {
  formatDateTime,
  formatRelativeTime,
} from "../../../../core/utils/formatters";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface AdminNotesCardProps {
  viewModel: PostDetailViewModel;
}

/**
 * Internal notes on the post: earlier notes, newest first, then a box to
 * add one. Notes are saved with the button, or with the decision when
 * the admin decides with text still in the box. They are never edited.
 */
export function AdminNotesCard({ viewModel }: AdminNotesCardProps) {
  const strings = AppStrings.posts.detail.notes;
  const now = useNow();
  const { notes, noteStatus } = viewModel;

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-6 drop-shadow-xs">
      <label
        htmlFor="post-admin-note"
        className="flex items-center gap-2 text-base leading-6 font-bold text-deep-blue"
      >
        <img src={AppAssets.postDetail.iconNotes} alt="" />
        {strings.label}
      </label>

      {viewModel.isNotesError ? (
        <p className="text-sm leading-5 text-muted">
          <span role="alert">{strings.loadFailed}</span>{" "}
          <button
            type="button"
            onClick={viewModel.retryNotes}
            className="font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {strings.retry}
          </button>
        </p>
      ) : (
        notes.length > 0 && (
          <ul
            aria-label={strings.listLabel}
            className="flex max-h-72 flex-col gap-2 overflow-y-auto"
          >
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-1 rounded-lg bg-surface px-3 py-2"
              >
                <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-xs leading-4">
                  <span className="font-bold text-deep-blue">
                    {note.authorId === null
                      ? strings.formerAdmin
                      : (note.authorName ?? strings.unknownAdmin)}
                  </span>
                  <time
                    dateTime={note.createdAt}
                    title={formatDateTime(note.createdAt)}
                    className="text-muted"
                  >
                    {formatRelativeTime(note.createdAt, now)}
                  </time>
                </p>
                <p className="text-sm leading-5 break-words whitespace-pre-wrap text-ink">
                  {note.body}
                </p>
              </li>
            ))}
          </ul>
        )
      )}

      <textarea
        id="post-admin-note"
        rows={3}
        value={viewModel.adminNote}
        maxLength={viewModel.adminNoteMaxLength}
        onChange={(event) => {
          viewModel.changeAdminNote(event.target.value);
        }}
        placeholder={strings.placeholder}
        className="min-h-[84px] resize-y rounded-lg bg-surface-tint px-3 pt-3 pb-8 text-sm leading-5 text-ink placeholder:text-muted focus:outline-2 focus:outline-primary"
      />

      <div className="flex items-center justify-between gap-3">
        <p
          role={noteStatus === "failed" ? "alert" : "status"}
          className={`text-xs leading-4 font-semibold ${
            noteStatus === "failed" ? "text-danger" : "text-teal"
          }`}
        >
          {noteStatus === "saved" && strings.saved}
          {noteStatus === "failed" && strings.saveFailed}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          {viewModel.adminNoteLengthLabel && (
            <span className="text-xs leading-4 text-muted">
              {viewModel.adminNoteLengthLabel}
            </span>
          )}
          <button
            type="button"
            onClick={viewModel.saveNote}
            disabled={!viewModel.canSaveNote}
            aria-busy={viewModel.isSavingNote}
            className="rounded-lg bg-surface-tint px-4 py-2 text-sm leading-5 font-semibold whitespace-nowrap text-deep-blue transition-colors hover:bg-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface-tint"
          >
            {viewModel.isSavingNote ? strings.saving : strings.save}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate">
        <p>{strings.visibility}</p>
        <p>{strings.permanence}</p>
      </div>
    </section>
  );
}
