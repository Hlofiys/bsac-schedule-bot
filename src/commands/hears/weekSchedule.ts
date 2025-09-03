import { AbstractHearsCommand, CommandContext, CommandUtils } from "../../utils";
import { UserState, UserRole } from "../../schemas/User";
import { callbackIdBuild, dateToCallback } from "../../utils/keyboards";
import { InlineKeyboard } from "grammy";

export class WeekScheduleCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super(["Неделя"], utils);
  }

  async execute(ctx: CommandContext) {
    if (ctx.user?.state !== UserState.MainMenu) return;

    const { scheduleApi } = this.utils;

    // Get current week start
    const today = new Date();
    const currentWeekStart = new Date(today);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    try {
      const isStudent = ctx.user?.role !== UserRole.Teacher;
      
      if (isStudent && ctx.user?.selectedGroup) {
        // Create buttons for current and next few weeks
        const buttons = new InlineKeyboard();
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(currentWeekStart);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          
          const weekLabel = i === 0 ? 'Текущая неделя' :
                           i === 1 ? 'Следующая неделя' :
                           `Через ${i} недели`;
          
          buttons.text(weekLabel, callbackIdBuild('group_week', [ctx.user.selectedGroup, dateToCallback(weekStart)])).row();
        }

        await ctx.reply('🧦 Выбери неделю', {
          reply_markup: buttons
        });
      } else if (!isStudent && ctx.user?.selectedTeacher) {
        // For teacher, create week buttons directly
        const teacherId = ctx.user.selectedTeacher;
        
        // Create buttons for current and next few weeks
        const buttons = new InlineKeyboard();
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(currentWeekStart);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          
          const weekLabel = i === 0 ? 'Текущая неделя' :
                           i === 1 ? 'Следующая неделя' :
                           `Через ${i} недели`;
          
          buttons.text(weekLabel, callbackIdBuild('teacher_week', [teacherId, dateToCallback(weekStart)])).row();
        }

        await ctx.reply('🧦 Выбери неделю', {
          reply_markup: buttons
        });
      } else {
        await ctx.reply('🤔 Пожалуйста, сначала выберите группу или преподавателя в настройках.');
        return;
      }
    } catch (error) {
      console.error("Error in week schedule handler:", error);
      await ctx.reply("❌ Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    }
  }
}