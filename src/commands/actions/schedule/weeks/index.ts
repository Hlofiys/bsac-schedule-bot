import { Composer } from "grammy";
import { MyContext } from "../../../../schemas/User";
import { groupWeekHandler } from './groupWeek';
import { teacherWeekHandler } from './teacherWeek';

export const weeksHandler = new Composer<MyContext>();

weeksHandler
  .use(groupWeekHandler)
  .use(teacherWeekHandler);