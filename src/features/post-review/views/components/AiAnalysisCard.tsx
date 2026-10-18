import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostDetail, PostSeverity } from "../../models/post";

interface AiAnalysisCardProps {
  post: PostDetail;
}

const severityBoxClass: Record<PostSeverity, string> = {
  high: "bg-danger-tint text-danger",
  medium: "bg-cyan/40 text-teal",
  low: "bg-chip text-deep-blue",
};

const sectionHeadingClass =
  "text-xs leading-4 font-bold tracking-[0.24px] text-deep-blue";

/**
 * The AI-derived decision support stored with the report: species match,
 * severity, invasiveness, validation checks, synthesis, and field advice.
 * Display only; the admin site never calls an AI provider.
 */
export function AiAnalysisCard({ post }: AiAnalysisCardProps) {
  const strings = AppStrings.posts;
  const ai = strings.detail.ai;
  const { aiMatch } = post;

  return (
    <section
      aria-labelledby="post-ai-heading"
      className="relative flex flex-col gap-5 overflow-hidden rounded-xl bg-white p-6 shadow-md"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5 bg-primary"
      />

      <div className="flex items-center gap-2">
        <img
          src={AppAssets.postDetail.iconAiSparkles}
          alt=""
          className="shrink-0"
        />
        <div className="flex flex-col">
          <h2
            id="post-ai-heading"
            className="text-base leading-6 font-bold text-deep-blue"
          >
            {ai.heading}
          </h2>
          <p className="text-[13px] leading-[18px] text-slate">
            {ai.subheading}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-surface-tint p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col pt-[7px]">
            <span className="text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-slate uppercase">
              {ai.identifiedSpecies}
            </span>
            <h3 className="pt-[5px] text-lg leading-6 font-bold tracking-[-0.09px] text-deep-blue">
              {aiMatch.commonName}
            </h3>
            <em className="text-sm leading-5 text-slate">
              {aiMatch.scientificName}
            </em>
          </div>
          <div className="flex flex-col items-end gap-[1.5px] text-right">
            <span className="text-lg leading-6 font-bold tracking-[-0.09px] text-deep-blue">
              {aiMatch.confidencePercent}%
            </span>
            <span className="text-[11px] leading-[14px] font-bold tracking-[0.44px] text-slate">
              {ai.matchConfidence}
            </span>
          </div>
        </div>
        <progress
          value={aiMatch.confidencePercent}
          max={100}
          aria-label={ai.matchConfidence}
          className="h-2.5 w-full appearance-none overflow-hidden rounded-full bg-chip [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-chip [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className={`flex flex-col gap-1 rounded-xl p-3.5 ${severityBoxClass[post.severity]}`}
        >
          <p className="flex items-center gap-1.5 text-base leading-6 font-bold">
            {/* The Figma icon is drawn in the medium-severity colour only. */}
            {post.severity === "medium" && (
              <img
                src={AppAssets.postDetail.iconAiSeverity}
                alt=""
                className="shrink-0"
              />
            )}
            {strings.severity[post.severity]} {strings.severitySuffix}
          </p>
          <p className="text-[13px] leading-[17.88px] text-ink">
            {post.ai.severitySummary}
          </p>
        </div>

        <div
          className={`flex flex-col justify-between gap-6 rounded-xl p-3.5 ${
            post.isInvasive ? "bg-danger-tint" : "bg-amber-soft/40"
          }`}
        >
          <p
            className={`flex items-center gap-1.5 text-base leading-6 font-bold ${
              post.isInvasive ? "text-danger" : "text-amber-ink"
            }`}
          >
            {!post.isInvasive && (
              <img
                src={AppAssets.postDetail.iconLeaf}
                alt=""
                className="shrink-0"
              />
            )}
            {post.isInvasive ? ai.invasive : ai.notInvasive}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-amber px-2 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.44px] text-white">
              {ai.origin[post.ai.origin]}
            </span>
            {!post.isInvasive && (
              <span className="text-[11px] leading-[14px] font-bold tracking-[0.44px] text-amber-ink">
                {ai.safeToVerify}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <h3 className={sectionHeadingClass}>{ai.checklist}</h3>
        <ul className="flex flex-col gap-2.5">
          {post.ai.checklist.map((item) => (
            <li
              key={item.label}
              className={`flex items-center gap-2.5 rounded-lg p-2 text-[13px] leading-[18px] ${
                item.passed
                  ? "bg-surface-tint text-ink"
                  : "bg-danger-tint text-danger"
              }`}
            >
              <img
                src={
                  item.passed
                    ? AppAssets.postDetail.iconCheckCircle
                    : AppAssets.shared.iconDecline
                }
                alt={item.passed ? "" : ai.failed}
                className="shrink-0"
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className={sectionHeadingClass}>{ai.synthesis}</h3>
        <p className="rounded-lg bg-surface-tint p-3 text-[13px] leading-[21.13px] text-slate">
          {post.ai.synthesis}
        </p>
      </div>

      {post.ai.recommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className={sectionHeadingClass}>{ai.recommendations}</h3>
          <ul className="flex flex-col gap-1.5 pl-2">
            {post.ai.recommendations.map((recommendation) => (
              <li
                key={recommendation}
                className="flex items-start gap-2 text-[13px] leading-[18px] text-slate"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                />
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
