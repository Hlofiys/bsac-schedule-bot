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
    const offset = 3 * 60; // UTC+3 in minutes
    const minskTime = new Date(now.getTime() + offset * 60 * 1000);
    
    // Create target date
    const targetDate = new Date(minskTime);
    targetDate.setDate(targetDate.getDate() + extraDays);
    targetDate.setHours(0, 0, 0, 0);
    
    // Convert back to UTC for API request
    const utcTargetDate = new Date(targetDate.getTime() - offset * 60 * 1000);

    const isStudent = ctx.session.role !== UserRole.Teacher;

    try {
      let scheduleMessage = '';
      
      if (isStudent && ctx.session.group) {
        const dates = [utcTargetDate.toISOString().split('T')[0]];
        const schedule = await scheduleService.getGroupSchedule(ctx.session.group.id, dates);
        scheduleMessage = scheduleService.formatSchedule(schedule);
      } else if (!isStudent && ctx.session.teacher_name) {
        // For teacher, we need to get the teacher ID first
        const teachers = await scheduleService.getAllTeachers();
        const teacher = teachers.find(t => t.fio === ctx.session.teacher_name);
        
        if (teacher && teacher.id !== undefined) {
          const dates = [utcTargetDate.toISOString().split('T')[0]];
          const schedule = await scheduleService.getTeacherSchedule(teacher.id, dates);
          scheduleMessage = scheduleService.formatSchedule(schedule);
        } else {
          await ctx.reply('Пожалуйста, сначала выберите преподавателя в настройках.');
          return;
        }
      } else {
        await ctx.reply('Пожалуйста, сначала выберите группу или преподавателя в настройках.');
        return;
      }

      if (scheduleMessage.includes('не найдено') || scheduleMessage.includes('нет занятий')) {
        await ctx.reply(`🤩 На ${message.text.toLowerCase()} нет занятий`);
        return;
      }

      await ctx.reply(`Расписание на ${message.text.toLowerCase()}\n\n${scheduleMessage}`);
    } catch (error) {
      console.error("Error in day schedule handler:", error);
      await ctx.reply("❌ Произошла ошибка при получении расписания. Пожалуйста, попробуйте позже.");
    }
  }
}