import { Composer } from "grammy";
import { EnhancedContext } from "../../../../utils/index.js";
import { subjectScheduleHandler } from "./subjectSchedule.js";

export const subjectScheduleMasterHandler = new Composer<EnhancedContext>();

subjectScheduleMasterHandler.use(subjectScheduleHandler);
