import {
  getGroups,
  getTeachers,
  getGroupSchedule,
  getTeacherSchedule
} from "../lib/api/client";
import type { components } from "../lib/api/scheme";

type Group = components["schemas"]["Group"];
type Teacher = components["schemas"]["Teacher"];
type GetScheduleForOneGroup = components["schemas"]["GetScheduleForOneGroup"];

export class ScheduleService {
  async getAllGroups(): Promise<Group[]> {
    try {
      return await getGroups();
    } catch (error) {
      console.error("Error fetching groups:", error);
      throw new Error("🤖 Не удалось получить список групп. Попробуйте позже.");
    }
  }

  async getAllTeachers(): Promise<Teacher[]> {
    try {
      return await getTeachers();
    } catch (error) {
      console.error("Error fetching teachers:", error);
      throw new Error("🤖 Не удалось получить список преподавателей. Попробуйте позже.");
    }
  }

  async getGroupSchedule(groupId: number, dates?: string[]): Promise<GetScheduleForOneGroup[]> {
    try {
      return await getGroupSchedule(groupId, dates);
    } catch (error) {
      console.error("Error fetching group schedule:", error);
      throw new Error("🤖 Не удалось получить расписание для группы. Попробуйте позже.");
    }
  }

  /**
   * Get schedule for a teacher
   * Note: This returns the same type as group schedules (GetScheduleForOneGroup[])
   */
  async getTeacherSchedule(teacherId: number, dates?: string[]): Promise<GetScheduleForOneGroup[]> {
    try {
      return await getTeacherSchedule(teacherId, dates);
    } catch (error) {
      console.error("Error fetching teacher schedule:", error);
      throw new Error("🤖 Не удалось получить расписание для преподавателя. Попробуйте позже.");
    }
  }

  formatSchedule(schedule: GetScheduleForOneGroup[], userSubgroup?: number, groupNumber?: string): string {
    // Handle case when no schedule data is available
    if (!schedule || schedule.length === 0) {
      return "😴 Расписание не найдено\n\nВозможно, расписание еще не сформировано или нет занятий на выбранные даты.";
    }

    // Check if any day has schedules
    let hasAnySchedules = false;
    for (const day of schedule) {
      if (day.schedules && day.schedules.length > 0) {
        hasAnySchedules = true;
        break;
      }
    }
    
    if (!hasAnySchedules) {
      return "😴 Расписание не найдено\n\nВозможно, расписание еще не сформировано или нет занятий на выбранные даты.";
    }

    let message = "";
    
    for (const day of schedule) {
      // Skip days with no schedules
      if (!day.schedules || day.schedules.length === 0) {
        continue;
      }
      
      // Filter lessons by subgroup if specified
      const filteredLessons = userSubgroup !== undefined 
        ? day.schedules.filter(lesson => {
            const lessonSubgroup = lesson.lessonSchedule?.subGroup;
            // Show lesson if it's for all subgroups (0, null, undefined) or if it matches user's subgroup
            return lessonSubgroup === 0 || lessonSubgroup === undefined || lessonSubgroup === null || lessonSubgroup === userSubgroup;
          })
        : day.schedules;
      
      // Skip day if no lessons after filtering
      if (filteredLessons.length === 0) {
        continue;
      }
      
      // Format date nicely
      let dayName = "Неизвестный день";
      let formattedDate = "??.??";
      
      if (day.date) {
        try {
          const dateObj = new Date(day.date);
          if (!isNaN(dateObj.getTime())) {
            dayName = this.getDayName(dateObj.getDay());
            formattedDate = this.formatDate(dateObj);
          }
        } catch (e) {
          console.error('Error parsing date:', day.date, e);
        }
      }
      
      message += `📅 ${dayName}, ${formattedDate}\n`;
      
      // Sort lessons by lesson number
      const sortedLessons = filteredLessons.sort((a, b) => {
        const aNum = a.lessonSchedule?.lessonNumber || 0;
        const bNum = b.lessonSchedule?.lessonNumber || 0;
        return aNum - bNum;
      });
      
      for (const lesson of sortedLessons) {
        // Add null checks for all properties
        const lessonName = (lesson.lessonSchedule?.lesson?.name) || "Не указано";
        const shortLessonName = (lesson.lessonSchedule?.lesson?.subName) || lessonName;
        const teacherName = (lesson.lessonSchedule?.teacher?.fio) || "Не указано";
        const lessonNumber = lesson.lessonSchedule?.lessonNumber !== undefined ? lesson.lessonSchedule?.lessonNumber : "?";
        const cabinet = lesson.lessonSchedule?.cabinet !== undefined ? lesson.lessonSchedule?.cabinet : "?";
        const block = lesson.lessonSchedule?.block !== undefined ? lesson.lessonSchedule?.block : "?";
        const lessonType = lesson.lessonSchedule?.staticLessonType || "Не указано";
        
        const translatedType = this.translateLessonType(lessonType);
        const timeSlot = this.getLessonTime(lessonNumber);
        
        // Use short name if the full name is too long (more than 30 characters)
        const displayName = lessonName.length > 30 ? shortLessonName : lessonName;
        
        message += `  🦑 ${timeSlot} | ${translatedType} | Ауд. ${cabinet} | ${displayName} | ${teacherName}\n`;
      }
      
      message += "\n";
    }
    
    return message.trim() || "😴 Расписание не найдено\n\nВозможно, расписание еще не сформировано или нет занятий на выбранные даты.";
 }

  private translateLessonType(type: string): string {
    switch (type) {
      case "Lecture":
        return "Лекция";
      case "Practical":
        return "Практическое";
      case "Laboratory":
        return "Лабораторная";
      default:
        return type || "Не указано";
    }
  }

  private getDayName(dayOfWeek: number): string {
    const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
    return days[dayOfWeek] || "Неизвестный день";
  }

  private formatDate(date: Date): string {
    const day = date.getDate();
    const monthNames = ["января", "февраля", "марта", "апреля", "мая", "июня", 
                       "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  }

  private getLessonTime(lessonNumber: number | string): string {
    const times: { [key: string]: string } = {
      "1": "08:00-9:40",
      "2": "09:55-11:35", 
      "3": "12:15-13:55",
      "4": "14:10-15:50",
      "5": "16:20-18:00",
      "6": "18:15-19:55"
    };
    return times[lessonNumber.toString()] || "??:??-??:??";
  }

  formatGroupsList(groups: Group[]): string {
    if (!groups || groups.length === 0) {
      return "Группы не найдены.";
    }

    let message = "👥 Список групп:\n\n";
    
    // Group by course
    const groupsByCourse: { [key: number]: Group[] } = {};
    
    for (const group of groups) {
      const course = group.course || 0; // Default to 0 if course is undefined
      if (!groupsByCourse[course]) {
        groupsByCourse[course] = [];
      }
      groupsByCourse[course].push(group);
    }
    
    // Sort courses and groups
    const sortedCourses = Object.keys(groupsByCourse)
      .map(Number)
      .sort((a, b) => a - b);
    
    for (const course of sortedCourses) {
      message += `📚 Курс ${course}:\n`;
      const sortedGroups = groupsByCourse[course].sort((a, b) =>
        (a.groupNumber || '').localeCompare(b.groupNumber || '')
      );
      
      for (const group of sortedGroups) {
        message += `🔹 ${group.groupNumber || 'Не указано'}\n`;
      }
      message += "\n";
    }
    
    return message;
  }

  formatTeachersList(teachers: Teacher[]): string {
    if (!teachers || teachers.length === 0) {
      return "Преподаватели не найдены.";
    }

    let message = "👨‍🏫 Список преподавателей:\n\n";
    
    // Sort teachers by name
    const sortedTeachers = teachers.sort((a, b) =>
      (a.fio || '').localeCompare(b.fio || '')
    );
    
    for (const teacher of sortedTeachers) {
      message += `🔸 ${teacher.fio || 'Не указано'}\n`;
    }
    
    return message;
  }
}