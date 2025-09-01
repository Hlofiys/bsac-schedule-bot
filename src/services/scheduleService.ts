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
      throw new Error("❌ Не удалось получить список групп. Попробуйте позже.");
    }
  }

  async getAllTeachers(): Promise<Teacher[]> {
    try {
      return await getTeachers();
    } catch (error) {
      console.error("Error fetching teachers:", error);
      throw new Error("❌ Не удалось получить список преподавателей. Попробуйте позже.");
    }
  }

  async getGroupSchedule(groupId: number, dates?: string[]): Promise<GetScheduleForOneGroup[]> {
    try {
      return await getGroupSchedule(groupId, dates);
    } catch (error) {
      console.error("Error fetching group schedule:", error);
      throw new Error("❌ Не удалось получить расписание для группы. Попробуйте позже.");
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
      throw new Error("❌ Не удалось получить расписание для преподавателя. Попробуйте позже.");
    }
  }

  formatSchedule(schedule: GetScheduleForOneGroup[]): string {
    // Handle case when no schedule data is available
    if (!schedule || schedule.length === 0) {
      return "📋 Расписание не найдено. Возможно, расписание еще не сформировано или нет занятий на выбранные даты.";
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
      return "📋 Расписание не найдено. Возможно, расписание еще не сформировано или нет занятий на выбранные даты.";
    }

    let message = "📅 Расписание занятий:\n\n";
    
    for (const day of schedule) {
      // Skip days with no schedules
      if (!day.schedules || day.schedules.length === 0) {
        continue;
      }
      
      message += `📆 ${day.date || 'Дата не указана'}\n`;
      
      for (const lesson of day.schedules) {
        // Add null checks for all properties
        const lessonName = (lesson.lessonSchedule?.lesson?.name) || "Не указано";
        const teacherName = (lesson.lessonSchedule?.teacher?.fio) || "Не указано";
        const lessonNumber = lesson.lessonSchedule?.lessonNumber !== undefined ? lesson.lessonSchedule?.lessonNumber : "Не указано";
        const cabinet = lesson.lessonSchedule?.cabinet !== undefined ? lesson.lessonSchedule?.cabinet : "Не указано";
        const block = lesson.lessonSchedule?.block !== undefined ? lesson.lessonSchedule?.block : "Не указано";
        const lessonType = lesson.lessonSchedule?.staticLessonType || "Не указано";
        
        message += `⏱ ${lessonNumber} пара (${lessonName})\n`;
        message += `👨‍🏫 ${teacherName}\n`;
        message += `📍 Кабинет: ${cabinet}, Корпус: ${block}\n`;
        message += `📚 Тип: ${this.translateLessonType(lessonType)}\n\n`;
      }
    }
    
    return message || "📋 Расписание не найдено. Возможно, расписание еще не сформировано или нет занятий на выбранные даты.";
 }

  private translateLessonType(type: string): string {
    switch (type) {
      case "Lecture":
        return "Лекция";
      case "Practical":
        return "Практика";
      case "Laboratory":
        return "Лабораторная";
      default:
        return type || "Не указано";
    }
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