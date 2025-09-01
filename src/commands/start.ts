import { Context } from "grammy";

export const startCommand = async (ctx: Context) => {
  const welcomeMessage = `
Привет! 👋 Я бот расписания БГАС (Белорусская государственная академия связи).

Я могу помочь вам получить расписание занятий для студентов и преподавателей.

Доступные команды:
/help - Показать помощь
/schedule - Получить расписание

Введите /schedule, чтобы начать!
  `.trim();

  await ctx.reply(welcomeMessage);
};