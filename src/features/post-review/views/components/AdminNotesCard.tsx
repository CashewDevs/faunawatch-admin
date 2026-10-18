import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface AdminNotesCardProps {
  viewModel: PostDetailViewModel;
}

/**
 * Optional internal note to go with the review decision.
 */
export function AdminNotesCard({ viewModel }: AdminNotesCardProps) {
  const strings = AppStrings.posts.detail.notes;

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-white p-6 drop-shadow-xs">
      <label
        htmlFor="post-admin-note"
        className="flex items-center gap-2 text-base leading-6 font-bold text-deep-blue"
      >
        <img src={AppAssets.postDetail.iconNotes} alt="" />
        {strings.label}
      </label>
      {/* TODO(moderation): The note is kept in memory only. Store it with
          the decision once the moderation backend exists. */}
      <textarea
        id="post-admin-note"
        rows={3}
        value={viewModel.adminNote}
        onChange={(event) => {
          viewModel.changeAdminNote(event.target.value);
        }}
        placeholder={strings.placeholder}
        className="min-h-[84px] resize-y rounded-lg bg-surface-tint px-3 pt-3 pb-8 text-sm leading-5 text-ink placeholder:text-muted focus:outline-2 focus:outline-primary"
      />
      <p className="text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate">
        {strings.visibility}
      </p>
    </section>
  );
}
