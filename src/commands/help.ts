import { Context } from "grammy";

export const helpCommand = async (ctx: Context) => {
  const helpMessage = `
🤖 Доступные команды:

🚀 /start - Начать работу с ботом
📖 /help - Показать помощь
📅 /schedule - Получить расписание

💡 Чтобы получить расписание:
1️⃣ Введите /schedule
2️⃣ Выберите группу или преподавателя
  `.trim();

  await ctx.reply(helpMessage);
};