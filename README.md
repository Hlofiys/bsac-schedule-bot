# BSAC Schedule Bot

Telegram bot for accessing schedules at BSAC (Belarusian State Academy of Communications) with optimized architecture.

## Features

- View daily schedule (today/tomorrow)
- View weekly schedule
- Search by group, teacher, or subject
- Interactive keyboard navigation
- User settings management
- Clean modular architecture
- MongoDB integration
- Cabinet display logic (shows "Спортзал" for cabinet 0)

## Commands

- `/start` - Start the bot and see the welcome message
- `/help` - Show help information
- `/schedule` - Begin the schedule lookup process

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
│   └── chatHandler.ts    # Text message handler
├── lib/                  # Generated API types
├── schemas/              # MongoDB schemas
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