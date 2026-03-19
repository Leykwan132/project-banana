import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const getTelegramBotToken = () => process.env.TELEGRAM_BOT_TOKEN;

const getTelegramChatId = () => process.env.TELEGRAM_CHAT_ID;

export const sendBankAccountSubmissionAlert = internalAction({
    args: {
        text: v.string(),
    },
    handler: async (_ctx, args) => {
        const token = getTelegramBotToken();
        const chatId = getTelegramChatId();

        if (!token || !chatId) {
            console.error("Telegram bank alert is not configured");
            return null;
        }

        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: args.text,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Telegram bank alert failed (${response.status}): ${errorText}`);
        }

        return await response.json();
    },
});
