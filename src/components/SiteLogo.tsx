import { useAdminSettings } from "@/hooks/useAdminSettings";

type SiteLogoProps = {
  className?: string;
  textClassName?: string;
  showText?: boolean;
  label?: string;
};

const SiteLogo = ({ className = "h-8 w-8", textClassName = "text-xl", showText = true, label = "TradeLux" }: SiteLogoProps) => {
  const { data: settings } = useAdminSettings();
  const logo = (settings as any)?.site_logo_url;

  return (
    <span className="flex items-center gap-2 min-w-0">
      {logo && (
        <img
          src={logo}
          alt={`${label} logo`}
          className={`${className} object-contain shrink-0`}
          loading="eager"
        />
      )}
      {showText && <span className={`font-display font-bold gold-text truncate ${textClassName}`}>{label}</span>}
    </span>
  );
};

export default SiteLogo;