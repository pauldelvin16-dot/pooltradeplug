import PoolChatRoom from "@/components/PoolChatRoom";
import { useTranslation } from "react-i18next";

const ChatPage = () => {
  const { t } = useTranslation();
  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">{t("chat.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("chat.subtitle")}</p>
      </div>
      <PoolChatRoom />
    </div>
  );
};

export default ChatPage;
