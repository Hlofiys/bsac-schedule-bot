# BSAC Schedule Bot

Telegram bot for accessing schedules at BSAC (Belarusian State Academy of Communications).

## Features

- Get schedules for groups
- Get schedules for teachers
- Russian language interface
- Easy-to-use conversation flow

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
   ```
   Replace `your_actual_telegram_bot_token_here` with your actual bot token from BotFather.
   Replace `https://your-bsac-api-url.com` with the actual URL of the BSAC API.
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

## Technologies

- [TypeScript](https://www.typescriptlang.org/)
- [Grammy](https://grammy.dev/) - Telegram Bot Framework
- Node.js with Fetch API

## License

MIT