import { AppAssets } from "../../../../core/constants/appAssets";
import { AppStrings } from "../../../../core/constants/appStrings";
import type { PostDetail, PostSeverity } from "../../models/post";
import type { PostDetailViewModel } from "../../viewmodels/usePostDetailViewModel";

interface AiAnalysisCardProps {
  post: PostDetail;
  viewModel: PostDetailViewModel;
}

const severityBoxClass: Record<PostSeverity, string> = {
  high: "bg-danger-tint text-danger",
  medium: "bg-cyan/40 text-teal",
  low: "bg-chip text-deep-blue",
  unrated: "bg-chip text-slate",
};

const sectionHeadingClass =
  "text-xs leading-4 font-bold tracking-[0.24px] text-deep-blue";

const smallLabelClass =
  "text-[11px] leading-[14px] font-semibold tracking-[0.55px] text-slate uppercase";

/**
 * The AI-derived decision support stored with the report: species match,
 * severity, invasiveness, validation checks, synthesis, and safety advice.
 * Display only; the admin site never calls an AI provider.
 */
export function AiAnalysisCard({ post, viewModel }: AiAnalysisCardProps) {
  const strings = AppStrings.posts;
  const ai = strings.detail.ai;
  const { aiMatch, ai: analysis } = post;

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

      {(aiMatch ?? post.reporterSpecies) && (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-tint p-4">
          {aiMatch && (
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col pt-[7px]">
                <span className={smallLabelClass}>{ai.identifiedSpecies}</span>
                <h3 className="pt-[5px] text-lg leading-6 font-bold tracking-[-0.09px] text-deep-blue">
                  {aiMatch.commonName}
                </h3>
                {aiMatch.scientificName && (
                  <em className="text-sm leading-5 text-slate">
                    {aiMatch.scientificName}
                  </em>
                )}
              </div>
              <span className="pt-[7px] text-right text-sm leading-5 font-bold text-deep-blue">
                {strings.confidence[aiMatch.confidence]}
              </span>
            </div>
          )}
          {post.reporterSpecies && (
            <div className="flex flex-col gap-0.5">
              <span className={smallLabelClass}>{ai.reporterSpecies}</span>
              <p className="text-sm leading-5 font-semibold text-deep-blue">
                {post.reporterSpecies}
              </p>
            </div>
          )}
        </div>
      )}

      {analysis ? (
        <>
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
              {analysis.severitySummary && (
                <p className="text-[13px] leading-[17.88px] text-ink">
                  {analysis.severitySummary}
                </p>
              )}
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
                {analysis.origin && (
                  <span className="rounded-full bg-amber px-2 py-0.5 text-[11px] leading-[14px] font-semibold tracking-[0.44px] text-white">
                    {ai.origin[analysis.origin]}
                  </span>
                )}
                {!post.isInvasive && (
                  <span className="text-[11px] leading-[14px] font-bold tracking-[0.44px] text-amber-ink">
                    {ai.safeToVerify}
                  </span>
                )}
              </div>
            </div>
          </div>

          {viewModel.aiChecklist.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h3 className={sectionHeadingClass}>{ai.checklist}</h3>
              <ul className="flex flex-col gap-2.5">
                {viewModel.aiChecklist.map((item) => (
                  <li
                    key={item.key}
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
          )}

          {analysis.synthesis && (
            <div className="flex flex-col gap-2">
              <h3 className={sectionHeadingClass}>{ai.synthesis}</h3>
              <p className="rounded-lg bg-surface-tint p-3 text-[13px] leading-[21.13px] text-slate">
                {analysis.synthesis}
              </p>
            </div>
          )}

          {analysis.recommendations && (
            <div className="flex flex-col gap-2">
              <h3 className={sectionHeadingClass}>{ai.recommendations}</h3>
              <p className="text-[13px] leading-[18px] whitespace-pre-line text-slate">
                {analysis.recommendations}
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="rounded-lg bg-surface-tint p-3 text-[13px] leading-[18px] text-slate">
          {ai.unavailable}
        </p>
      )}
    </section>
  );
}
