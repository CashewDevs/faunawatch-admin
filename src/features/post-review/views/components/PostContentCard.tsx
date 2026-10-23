import type { ReactNode } from "react";
import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import { formatDateTime } from "../../../../core/utils/formatters";
import type { PostDetail, PostSeverity } from "../../models/post";
import { ScientificText } from "./ScientificText";

interface PostContentCardProps {
  post: PostDetail;
}

const chipClass =
  "flex items-center gap-1 rounded-full px-3 py-1 text-[11px] leading-[14px] font-bold tracking-[0.44px]";

const severityChipClass: Record<PostSeverity, string> = {
  high: "bg-danger-tint text-danger",
  medium: "bg-cyan text-teal",
  low: "bg-chip text-deep-blue",
};

/**
 * Title, submission chips, description, and the reporter's field notes.
 */
export function PostContentCard({ post }: PostContentCardProps) {
  const strings = AppStrings.posts;
  const detail = strings.detail;
  const { fieldNotes } = post;
  const meters = (value: number) => `${String(value)} ${detail.metersSuffix}`;

  const fields: { label: string; value: string }[] = [];
  if (post.location.elevationMeters !== null) {
    fields.push({
      label: detail.fields.elevation,
      value: meters(post.location.elevationMeters),
    });
  }
  if (fieldNotes.perchHeightMeters !== null) {
    fields.push({
      label: detail.fields.perchHeight,
      value: meters(fieldNotes.perchHeightMeters),
    });
  }
  if (fieldNotes.hostTree) {
    fields.push({ label: detail.fields.hostTree, value: fieldNotes.hostTree });
  }
  if (fieldNotes.observerDevice) {
    fields.push({
      label: detail.fields.observerDevice,
      value: fieldNotes.observerDevice,
    });
  }

  return (
    <section
      aria-labelledby="post-title"
      className="flex flex-col gap-4 rounded-xl bg-white p-6 drop-shadow-xs"
    >
      <div className="flex flex-col gap-3">
        <h2
          id="post-title"
          className="text-[22px] leading-7 font-semibold tracking-[-0.55px] text-deep-blue"
        >
          {post.title}
        </h2>
        <ul className="flex flex-wrap gap-2">
          <Chip
            className="bg-chip text-slate"
            icon={AppAssets.postDetail.iconCalendar}
          >
            {detail.submittedPrefix} {formatDateTime(post.submittedAt)}
          </Chip>
          <Chip
            className="bg-amber-soft text-amber-ink"
            icon={AppAssets.postDetail.iconCategory}
          >
            {strings.category[post.category]}
          </Chip>
          <Chip
            className={severityChipClass[post.severity]}
            // The Figma icon is drawn in the medium-severity colour only.
            icon={
              post.severity === "medium"
                ? AppAssets.postDetail.iconSeverity
                : undefined
            }
          >
            {strings.severity[post.severity]} {strings.severitySuffix}
          </Chip>
          {fieldNotes.isNightObservation && (
            <Chip
              className="bg-avatar text-deep-blue"
              icon={AppAssets.postDetail.iconNight}
            >
              {detail.nightObservation}
            </Chip>
          )}
        </ul>
      </div>

      <div className="flex flex-col gap-[7px] pt-2">
        <h2 className="text-base leading-6 font-semibold text-ink">
          {detail.descriptionHeading}
        </h2>
        <p className="text-sm leading-[22.75px] whitespace-pre-line text-slate">
          <ScientificText
            text={post.description}
            scientificName={post.aiMatch.scientificName}
          />
        </p>
      </div>

      {fields.length > 0 && (
        <dl
          aria-label={detail.fieldNotesLabel}
          className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4"
        >
          {fields.map((field) => (
            <div
              key={field.label}
              className="flex min-h-[100px] flex-col gap-0.5 rounded-lg bg-surface-tint p-3"
            >
              <dt className="text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate">
                {field.label}
              </dt>
              <dd className="text-base leading-6 font-bold break-words text-deep-blue">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Chip({
  className,
  icon,
  children,
}: {
  className: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <li className={`${chipClass} ${className}`}>
      {icon && <img src={icon} alt="" />}
      {children}
    </li>
  );
}
