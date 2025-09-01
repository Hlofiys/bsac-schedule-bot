import { Context } from "grammy";

export const startCommand = async (ctx: Context) => {
  const welcomeMessage = `
👋 Привет! Я бот расписания БГАС.

📅 Получите расписание занятий для студентов и преподавателей.

💡 Введите /schedule, чтобы начать!
  `.trim();

  await ctx.reply(welcomeMessage);
};