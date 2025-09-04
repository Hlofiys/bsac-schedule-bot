import { AbstractHearsCommand, CommandContext, CommandUtils } from "../../utils/index.js";
import { UserState } from "../../schemas/User.js";
import { GetScheduleForOneGroup, LessonSchedule } from "../../api/index.js";

export class DayScheduleCommand extends AbstractHearsCommand {
  constructor(utils: CommandUtils) {
    super(["Сегодня", "Завтра"], utils);
  }

  async execute(ctx: CommandContext) {
    if (!ctx.user || ctx.user.state !== UserState.MainMenu) return;

    const { scheduleApi } = this.utils;
    const isToday = ctx.message?.text === "Сегодня";
    
    try {
      const targetDate = new Date();
      if (!isToday) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      
      const dateString = targetDate.toISOString().split('T')[0];
      
      let scheduleForDay: GetScheduleForOneGroup[] = [];
      if (ctx.user.selectedGroup) {
        scheduleForDay = await scheduleApi.getScheduleForDates({
          groupId: ctx.user.selectedGroup,
          dates: [dateString]
        });
      } else if (ctx.user.selectedTeacher) {
        scheduleForDay = await scheduleApi.getScheduleForDates({
          teacherId: ctx.user.selectedTeacher,
          dates: [dateString]
        });
      } else {
        await ctx.reply("❗ Сначала выберите группу или преподавателя в настройках");
        return;
      }

      const lessons = scheduleForDay.flatMap(day => day.schedules || []);

      if (lessons.length === 0) {
        await ctx.reply(`🎉 На ${isToday ? "сегодня" : "завтра"} занятий нет!`);
        return;
      }

      const scheduleText = this.formatSchedule(lessons, isToday ? "сегодня" : "завтра", ctx.user.subgroup);
      await ctx.reply(scheduleText, { parse_mode: "HTML" });

    } catch (error) {
      console.error("Error fetching day schedule:", error);
      await ctx.reply("❌ Произошла ошибка при получении расписания. Попробуйте позже.");
    }
  }

  private formatSchedule(lessonsWithWork: LessonSchedule[], dayText: string, subgroup?: number): string {
    let message = `🎯 <b>Расписание на ${dayText}</b>\n\n`;
    
    const lessons = lessonsWithWork.filter(lesson => !(subgroup && lesson.lessonSchedule?.subGroup && lesson.lessonSchedule.subGroup !== subgroup));

    lessons.sort((a, b) => (a.lessonSchedule?.lessonNumber || 0) - (b.lessonSchedule?.lessonNumber || 0)).forEach((lessonWithWork, index) => {
      const lesson = lessonWithWork.lessonSchedule;
      if (!lesson) return;

      const timeSlot = this.getLessonTime(lesson.lessonNumber);
      const lessonName = lesson.lesson?.name || "Не указано";
      const teacherName = lesson.teacher?.fio || "Не указано";
      const cabinet = lesson.cabinet;
      const lessonType = lesson.staticLessonType || "Не указано";
      
      const cabinetDisplay = cabinet === 0 ? "🏃‍♂️ Спортзал" : (cabinet ? `🚪 Ауд. ${cabinet}`: "🚪 Ауд. ?");
      const translatedType = this.translateLessonType(lessonType);
      
      message += `⚡ <b>${timeSlot}</b> | ${translatedType}\n`;
      message += `   🧠 ${lessonName}\n`;
      message += `   🤓 ${teacherName}\n`;
      message += `   ${cabinetDisplay}\n`;
      
      if (index < lessons.length - 1) {
        message += "\n";
      }
    });
    
    return message;
  }

  private getLessonTime(lessonNumber: number | undefined): string {
    const times: { [key: number]: string } = {
      1: "08:00-09:35",
      2: "09:45-11:20", 
      3: "11:30-13:05",
      4: "13:45-15:20",
      5: "15:30-17:05",
      6: "17:15-18:50",
      7: "19:00-20:35"
    };
    
    return lessonNumber ? times[lessonNumber] || "Время не указано" : "Время не указано";
  }

  private translateLessonType(type: string): string {
    const translations: { [key: string]: string } = {
        "Lecture": "Лекция",
        "Practical": "Практика", 
        "Laboratory": "Лабораторная"
    };
    
    return translations[type] || type;
  }
}
