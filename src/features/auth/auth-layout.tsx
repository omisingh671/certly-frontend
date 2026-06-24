import { type ReactNode } from "react";

const features = [
  {
    title: "Template-driven",
    description: "Dynamic schemas with reusable field definitions.",
  },
  {
    title: "Batch issuance",
    description: "Issue to entire cohorts in one CSV upload.",
  },
  {
    title: "Validation-first",
    description: "Catch row-level errors before anything is issued.",
  },
  {
    title: "Public verify",
    description: "Recipients verify credentials with a single code.",
  },
];

export const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
    <div className="surface-card grid w-full max-w-5xl overflow-hidden rounded-4xl border shadow-panel lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col justify-between bg-slate-900 p-8 text-slate-50 lg:p-10 dark:bg-slate-950">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-wide">
              CredentialOps
            </span>
          </div>

          <div className="mt-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-slate-100">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <span className="text-xs font-medium">
                Certificate management
              </span>
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight">
              Issue. Verify. <span className="text-accent">Trust.</span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-200/85">
              A batch-first credential platform that validates CSVs, issues at
              scale, and lets recipients verify in seconds.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-white/15 bg-white/[0.07] p-3.5 backdrop-blur-sm"
            >
              <p className="text-sm font-semibold text-slate-100">{feature.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-6">
          {[
            ["10k+", "Credentials issued"],
            ["99.9%", "Uptime"],
            ["< 1s", "Verify time"],
          ].map(([value, label]) => (
            <div key={label}>
              <p className="text-lg font-bold text-slate-50">{value}</p>
              <p className="text-xs text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center bg-surface p-8 transition-colors lg:p-10">
        {children}
      </div>
    </div>
  </div>
);
