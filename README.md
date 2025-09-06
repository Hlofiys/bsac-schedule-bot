# BSAC Schedule Bot

Telegram bot for accessing schedules at BSAC (Belarusian State Academy of Communications) with optimized architecture.

## Features

- View daily schedule (today/tomorrow)
- View weekly schedule
- Search by group, teacher, or subject
- Interactive keyboard navigation
- User settings management
- **Group chat support with automatic daily schedule delivery**
- **Configurable schedule time and subgroup settings**
- Clean modular architecture
- MongoDB integration
- Cabinet display logic (shows "Спортзал" for cabinet 0)

## Commands

### Private Chat Commands
- `/start` - Start the bot and see the welcome message
- `/help` - Show help information
- `/schedule` - Begin the schedule lookup process

### Group Chat Commands
- `/setup` - Configure the bot for group chat (admin only)
- `/status` - Check current bot configuration in the group

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a Telegram bot by talking to [@BotFather](https://t.me/BotFather) and get your bot token
4. Create a `.env` file with your configuration:
   ```
   BOT_TOKEN=your_actual_telegram_bot_token_here
   API_BASE_URL=https://your-bsac-api-url.com
   MONGODB_URI=mongodb://localhost:27017/bsac-bot
   ```
   Replace `your_actual_telegram_bot_token_here` with your actual bot token from BotFather.
   Replace `https://your-bsac-api-url.com` with the actual URL of the BSAC API.
   Replace the MongoDB URI with your actual MongoDB connection string.
5. Validate your environment configuration:
   ```
   npm run validate
   ```
6. Build the project:
   ```
   npm run build
   ```
7. Start the bot:
   ```
   npm start
   ```

## Group Chat Setup

The bot can be added to group chats to automatically send daily schedules. Here's how to set it up:

### Adding Bot to Group

1. Add the bot to your group chat
2. Make sure the bot has permission to send messages
3. Use `/setup` command (only group administrators can do this)

### Configuration Options

- **Group/Teacher Selection**: Choose which group or teacher's schedule to follow
- **Schedule Time**: Set when the bot should send daily schedules (default: 08:00)
- **Subgroup Settings**: 
  - Send both subgroups separately (recommended)
  - Send all lessons together
- **Notifications**: Enable/disable automatic daily schedules

### How It Works

- The bot sends tomorrow's schedule every day at the configured time
- If "both subgroups" is enabled, it sends separate messages for:
  - Subgroup 1 lessons
  - Subgroup 2 lessons  
  - Common lessons (no subgroup specified)
- If no lessons are found, it sends a "no classes" message
- Only group administrators can change settings

### Commands for Groups

- `/setup` - Open configuration menu (admin only)
- `/status` - View current configuration

## Development

- Run in development mode:
  ```
  npm run dev
  ```

## Architecture

This bot follows a clean, modular architecture inspired by best practices:

### Project Structure

```
src/
├── api/                    # API layer
│   └── ScheduleApi.ts     # Schedule API client
├── commands/              # Bot commands
│   ├── hears/            # Text-based commands
│   ├── actions/          # Callback query handlers
│   │   └── group/        # Group setup handlers
│   ├── slash/            # Slash commands
│   └── chatHandler.ts    # Text message handler
├── lib/                  # Generated API types
├── schemas/              # MongoDB schemas
│   ├── User.ts           # User schema
│   └── Group.ts          # Group chat schema
├── services/             # Background services
│   └── ScheduleScheduler.ts # Daily schedule delivery
├── utils/                # Utilities and helpers
│   ├── BaseApi.ts        # Base API class
│   ├── commandHelpers.ts # Abstract command classes
│   ├── context.ts        # Enhanced context types
│   └── keyboards.ts      # Keyboard utilities
└── index.ts              # Main bot file
```

### Key Features

- **Abstract Command Classes**: All commands extend `AbstractHearsCommand` for consistency
- **Enhanced Context**: Type-safe context with user data
- **MongoDB-Only Storage**: No redundant session storage, all data persisted in MongoDB
- **Modular API Layer**: Clean separation between bot logic and API calls
- **Error Handling**: Comprehensive error handling throughout
- **Cabinet Display Logic**: Shows "Спортзал" for cabinet 0, "Ауд. X" for others
- **Optimized Data Model**: No unnecessary legacy fields, clean schema design

### Command Structure

Commands are organized into:

- **Hears Commands**: Respond to specific text messages
- **Action Commands**: Handle inline keyboard callbacks
- **Chat Handler**: Processes general text input for entity selection

## Technologies

- [TypeScript](https://www.typescriptlang.org/)
- [Grammy](https://grammy.dev/) - Telegram Bot Framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/) - MongoDB ODM
- Node.js with Fetch API

## License

MIT
