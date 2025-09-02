import { MyContext } from "../../schemas/User";
import { UserState, UserRole } from "../../schemas/User";
import { ScheduleService } from "../../services/scheduleService";

export class DayScheduleCommand {
  async execute(ctx: MyContext) {
    if (!ctx.session || ctx.session.state !== UserState.MainMenu) return;

    const { message } = ctx;
    if (!message || !message.text) return;

    const scheduleService = new ScheduleService();

    // Determine if we're looking for today or tomorrow
    const extraDays = message.text === 'Завтра' ? 1 : 0;
  
    // Get current date in Minsk time zone
    const now = new Date();
    now.setDate(now.getDate() + extraDays);
    const targetDate = now.toDateString();

    const isStudent = ctx.session.role !== UserRole.Teacher;

    try {
      let scheduleMessage = '';
      
      if (isStudent && ctx.session.group) {
        const dates = [targetDate];
        const schedule = await scheduleService.getGroupSchedule(ctx.session.group.id, dates);
        scheduleMessage = scheduleService.formatSchedule(schedule, ctx.session.subgroup, ctx.session.group.groupNumber);
      } else if (!isStudent && ctx.session.teacher_name) {
        // For teacher, we need to get the teacher ID first
        const teachers = await scheduleService.getAllTeachers();
        const teacher = teachers.find(t => t.fio === ctx.session.teacher_name);
        
        if (teacher && teacher.id !== undefined) {
          const dates = [targetDate];
          const schedule = await scheduleService.getTeacherSchedule(teacher.id, dates);
          scheduleMessage = scheduleService.formatSchedule(schedule);
        } else {
          await ctx.reply('🤔 Пожалуйста, сначала выберите преподавателя в настройках.');
          return;
        }
      } else {
        await ctx.reply('🤔 Пожалуйста, сначала выберите группу или преподавателя в настройках.');
        return;
      }

      if (scheduleMessage.includes('не найдено') || scheduleMessage.includes('нет занятий')) {
        await ctx.reply(`🍹 На ${message.text.toLowerCase()} нет занятий`);
        return;
      }

      const groupNumber = ctx.session.group?.groupNumber || 'Неизвестная группа';
      await ctx.reply(`🎰 Расписание на ${message.text.toLowerCase()} для группы ${groupNumber}\n\n${scheduleMessage}`);
    } catch (error) {
      console.error("Error in day schedule handler:", error);
      await ctx.reply("👾 Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    }
  }
}