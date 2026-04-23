import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n";

const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language.split("-")[0]) || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className="text-muted-foreground hover:text-foreground"
        >
          <Globe className="w-4 h-4" />
          {!compact && <span className="ml-2 text-xs font-medium">{current.flag} {current.code.toUpperCase()}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border max-h-80 overflow-y-auto z-50">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className="cursor-pointer flex items-center gap-2"
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="flex-1 text-sm">{lang.label}</span>
            {current.code === lang.code && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
