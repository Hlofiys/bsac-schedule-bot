import { MyContext } from "../../schemas/User";
import { UserState, UserRole } from "../../schemas/User";
import { callbackIdBuild, dateToCallback } from "../../utils/keyboards";
import { InlineKeyboard } from "grammy";
import { ScheduleService } from "../../services/scheduleService";

export class WeekScheduleCommand {
  async execute(ctx: MyContext) {
    if (!ctx.session || ctx.session.state !== UserState.MainMenu) return;

    const scheduleService = new ScheduleService();

    // Get current week start
    const today = new Date();
    const currentWeekStart = new Date(today);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    try {
      const isStudent = ctx.session.role !== UserRole.Teacher;
      
      if (isStudent && ctx.session.group) {
        // Create buttons for current and next few weeks
        const buttons = new InlineKeyboard();
        for (let i = 0; i < 4; i++) {
          const weekStart = new Date(currentWeekStart);
          weekStart.setDate(weekStart.getDate() + (i * 7));
          
          const weekLabel = i === 0 ? 'Текущая неделя' :
                           i === 1 ? 'Следующая неделя' :
                           `Через ${i} недели`;
          
          buttons.text(weekLabel, callbackIdBuild('group_week', [ctx.session.group.id.toString(), dateToCallback(weekStart)])).row();
        }

        await ctx.reply('🧦 Выбери неделю', {
          reply_markup: buttons
        });
      } else if (!isStudent && ctx.session.teacher_name) {
        // For teacher, we need to get the teacher ID first
        const teachers = await scheduleService.getAllTeachers();
        const teacher = teachers.find(t => t.fio === ctx.session.teacher_name);
        
        if (teacher && teacher.id !== undefined) {
          // Create buttons for current and next few weeks
          const buttons = new InlineKeyboard();
          for (let i = 0; i < 4; i++) {
            const weekStart = new Date(currentWeekStart);
            weekStart.setDate(weekStart.getDate() + (i * 7));
            
            const weekLabel = i === 0 ? 'Текущая неделя' :
                             i === 1 ? 'Следующая неделя' :
                             `Через ${i} недели`;
            
            buttons.text(weekLabel, callbackIdBuild('teacher_week', [teacher.id.toString(), dateToCallback(weekStart)])).row();
          }

          await ctx.reply('🧦 Выбери неделю', {
            reply_markup: buttons
          });
        } else {
          await ctx.reply('Пожалуйста, сначала выберите группу или преподавателя в настройках.');
          return;
        }
      } else {
        await ctx.reply('Пожалуйста, сначала выберите группу или преподавателя в настройках.');
        return;
      }
    } catch (error) {
      console.error("Error in week schedule handler:", error);
      await ctx.reply("❌ Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    }
  }
}