import { MiddlewareFn } from "grammy";
import { EnhancedContext } from "./context.js";
import { ScheduleApi } from "../api/ScheduleApi.js";

export type CommandMiddleware = MiddlewareFn<EnhancedContext>;
export type CommandContext = Parameters<CommandMiddleware>[0];

export interface CommandUtils {
  scheduleApi: ScheduleApi;
}

export interface CommandEntity {
  triggers: string | string[] | RegExp;
  execute: CommandMiddleware;
  utils: CommandUtils;
}

export abstract class AbstractCommand implements CommandEntity {
  triggers: CommandEntity["triggers"];
  utils: CommandUtils;

  constructor(triggers: CommandEntity["triggers"], utils: CommandUtils) {
    this.triggers = triggers;
    this.utils = utils;
  }

  abstract execute(ctx: CommandContext): Promise<void> | void;
}

export abstract class AbstractHearsCommand extends AbstractCommand {
  constructor(triggers: string | string[], utils: CommandUtils) {
    super(triggers, utils);
  }
}

export abstract class AbstractSlashCommand extends AbstractCommand {
  constructor(triggers: string, utils: CommandUtils) {
    super(triggers, utils);
  }
}
