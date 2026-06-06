import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads admin-configured favicon/logo from admin_settings and applies them
 * to the document head dynamically. Also drives <SiteLogo /> via context-free
 * window event so any header consuming it can re-render.
 */
const SiteBranding = () => {
  useEffect(() => {
    const apply = async () => {
      const { data } = await supabase.from("admin_settings")
        .select("site_favicon_url, site_logo_url").limit(1).maybeSingle();
      const fav = (data as any)?.site_favicon_url;
      const logo = (data as any)?.site_logo_url;
      const favicon = fav || logo;
      if (favicon) {
        document.querySelectorAll("link[rel*='icon'], link[rel='apple-touch-icon'], link[rel='mask-icon']").forEach((el) => el.remove());
        const addIcon = (rel: string, sizes?: string) => {
          const link = document.createElement("link");
          link.rel = rel;
          link.href = favicon;
          if (sizes) link.setAttribute("sizes", sizes);
          const type = favicon.endsWith(".svg") ? "image/svg+xml" : favicon.endsWith(".ico") ? "image/x-icon" : "image/png";
          link.type = type;
          document.head.appendChild(link);
        };
        addIcon("icon", "32x32");
        addIcon("icon", "192x192");
        addIcon("apple-touch-icon", "180x180");

        // Open Graph + Twitter image fallback so SEO uses the configured logo
        const setMeta = (name: string, attr: "name" | "property", val: string) => {
          let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
          if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
          el.content = val;
        };
        if (logo) {
          setMeta("og:image", "property", logo);
          setMeta("twitter:image", "name", logo);
        }
      }
      if (logo) (window as any).__SITE_LOGO__ = logo;
    };
    apply();
  }, []);
  return null;
};

export default SiteBranding;
