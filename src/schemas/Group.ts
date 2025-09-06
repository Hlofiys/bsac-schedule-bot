import mongoose from "mongoose";

export enum GroupSetupState {
  MainMenu = "MainMenu",
  AskingGroup = "AskingGroup",
  AskingTime = "AskingTime",
}

export interface GroupChat {
  chatId: number;
  chatTitle?: string;
  selectedGroup?: number; // Group ID for API calls
  selectedGroupNumber?: string; // Group number for display
  selectedTeacher?: string;
  isActive: boolean;
  scheduleTime: string; // Format: "HH:MM" (24-hour format)
  timezone: string; // Timezone for schedule delivery
  sendBothSubgroups: boolean; // Whether to send schedule for both subgroups
  setupState: GroupSetupState; // Current setup state
  lastPromptMessageId?: number; // ID of the last prompt message to delete

  // Mongoose document methods
  save(): Promise<this>;
}

const groupChatSchema = new mongoose.Schema<GroupChat>(
  {
    chatId: { type: Number, required: true, unique: true },
    chatTitle: String,
    selectedGroup: Number,
    selectedGroupNumber: String,
    selectedTeacher: String,
    isActive: { type: Boolean, default: true },
    scheduleTime: { type: String, default: "08:00" }, // Default to 8:00 AM
    timezone: { type: String, default: "Europe/Minsk" }, // Default to Belarus timezone
    sendBothSubgroups: { type: Boolean, default: true },
    setupState: {
      type: String,
      enum: Object.values(GroupSetupState),
      default: GroupSetupState.MainMenu,
    },
    lastPromptMessageId: Number,
  },
  {
    collection: "group_chats",
    timestamps: true,
  }
);

export const GroupChat = mongoose.model<GroupChat>(
  "GroupChat",
  groupChatSchema
);
