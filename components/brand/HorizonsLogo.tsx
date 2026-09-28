import Link from "next/link";

type LogoProps = {
  href?: string;
  compact?: boolean;
  className?: string;
};

/**
 * Horizons wordmark.
 *
 * Inline SVG rather than a raster asset: it renders crisply on low-end phones,
 * costs no download, and follows the brand token if it ever changes.
 */
export function HorizonsLogo({ href = "/", compact = false, className = "" }: LogoProps) {
  const content = (
    <span className={`horizons-logo ${className}`} aria-label="Horizons home" role="img">
      <svg width={compact ? 28 : 34} height={compact ? 28 : 34} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect width="36" height="36" rx="9" fill="var(--primary-600)" />
        <path d="M10 12 18 8l8 4v13l-8 4-8-4V12Z" fill="var(--surface)" />
        <path d="M18 8v21" stroke="var(--primary-600)" strokeWidth="1.75" />
        <circle cx="18" cy="18" r="3.5" fill="var(--primary-600)" />
      </svg>
      {!compact && <span className="horizons-wordmark">Horizons</span>}
    </span>
  );

  return href ? <Link href={href} aria-label="Horizons home">{content}</Link> : content;
}
export { HorizonsLogo as EduCoreLogo };