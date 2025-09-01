import { InlineKeyboardButton } from "grammy/types";
import { UserState, UserRole } from "../schemas/User";
import { InlineKeyboard, Keyboard } from "grammy";

export enum WeeksArchiveAction {
  GetLessons = 'gl',
  ShowPage = 'sp'
}

export enum WeeksArchiveType {
  Group = 'gp',
  Teacher = 'tc',
  Subject = 'sb'
}

export enum ClassroomScheduleType {
  Default = 'def',
  Free = 'free'
}

export const CallbackIdSplitter = ':';

export const callbackIdBuild = (command: string, args?: string[]): string => {
  return [ command, ...(args || []) ].join(CallbackIdSplitter);
};

export const callbackIdParse = (str: string) => str.split(CallbackIdSplitter);

export const dateToCallback = (date: Date): string =>
  `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate()}`;

export const replyKeyboards = {
  [UserState.AskingFollowingEntity]: new Keyboard().resized(),
 [UserState.ChoosingFollowingEntity]: new Keyboard()
    .text('Отмена')
    .resized(),
  [UserState.AskingWeekTeacher]: new Keyboard()
    .text('Отмена')
    .resized(),
  [UserState.AskingWeekGroup]: new Keyboard()
    .text('Отмена')
    .resized(),
  [UserState.MainMenu]: new Keyboard()
    .text('Сегодня').text('Завтра').text('Неделя')
    .row()
    .text('Другие расписания').text('Настройки')
    .resized()
};

export const inlineKeyboards = {
  chooseRole: new InlineKeyboard()
    .text('Студент', callbackIdBuild('settings', [ 'role', 'student' ]))
    .text('Преподаватель', callbackIdBuild('settings', [ 'role', 'teacher' ])),
  otherSchedules: new InlineKeyboard()
    .text('Преподаватель', callbackIdBuild('teacher_week'))
    .text('Группа', callbackIdBuild('group_week'))
    .row()
    .text('Аудитории', callbackIdBuild('classroom_schedule'))
    .text('Дисциплина', callbackIdBuild('subject_schedule')),
  classroomScheduleType: new InlineKeyboard()
    .text('Свободные аудитории', callbackIdBuild('classroom_schedule', [ ClassroomScheduleType.Free ]))
};

export const batchButtons = (buttons: InlineKeyboardButton[], rowSize = 3, extraRows: InlineKeyboardButton[][] = []): InlineKeyboard => {
 const keyboard = new InlineKeyboard();
  
  // Add buttons in rows
  for (let i = 0; i < buttons.length; i += rowSize) {
    const row = buttons.slice(i, i + rowSize);
    keyboard.row(...row);
 }
  
  // Add extra rows
  for (const row of extraRows) {
    keyboard.row(...row);
  }
  
  return keyboard;
};