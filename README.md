# 🎮 Minecraft YouTube Bot

A powerful Node.js bot that displays YouTube channel subscriber counts and profile images as pixel art in Minecraft using WebSocket connections.

![Bot Demo](https://via.placeholder.com/800x400/2D2D2D/FFFFFF?text=Minecraft+YouTube+Bot+Demo)

## ✨ Features

- 📊 **Real-time Subscriber Display**: Shows YouTube subscriber counts using pre-built number templates
- 🖼️ **Profile Image Pixel Art**: Converts YouTube profile pictures into Minecraft wool block art
- 🚀 **High Performance**: Optimized command queuing and batch processing
- 🎯 **Smart Color Matching**: Finds closest wool colors using Euclidean distance algorithm
- 💬 **Rich Commands**: Multiple command formats with helpful feedback
- 🔄 **Auto-cleanup**: Manages temporary files and memory efficiently
- 📝 **Comprehensive Logging**: Color-coded logs with timestamp and severity levels

## 🛠️ Installation

### Prerequisites
- Node.js 14.0.0 or higher
- Minecraft (Java Edition) with command blocks enabled
- A world with sufficient space for displays

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/minecraft-youtube-bot.git
   cd minecraft-youtube-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot** (optional)
   - Edit `config.js` to customize coordinates, delays, and settings
   - Ensure you have `woolColors.json` with your wool color definitions

4. **Start the bot**
   ```bash
   npm start
   ```
   For development with debug logs:
   ```bash
   npm run dev
   ```

## 🎯 Minecraft Setup

### 1. Connect to the Bot
In your Minecraft world, use the command:
```
/connect localhost:3000
```

### 2. Pre-build Number Templates
Create wool block number templates (0-9) at the coordinates specified in `config.js`:
- Default template area: Y=-64, various X/Z coordinates
- Each digit should be built with your desired wool blocks
- The bot will clone these templates to display subscriber counts

### 3. Designate Display Areas
- **Subscriber Counter**: Default starts at `1 -60 42`
- **Profile Image**: Default corner at `-31 -60 82` (35x35 area)
- Ensure these areas are clear and accessible

## 📋 Commands

All commands use the `!` prefix (configurable in `config.js`):

| Command | Description | Example |
|---------|-------------|---------|
| `!subs <channel>` | Display subscriber count and profile image | `!subs UCchannelID` |
| `!info <channel>` | Get channel information only (no display) | `!info @username` |
| `!clear` | Clear all displays | `!clear` |
| `!help` | Show available commands | `!help` |
| `!status` | Show bot status and queue info | `!status` |
| `!reload` | Reload bot systems and clear caches | `!reload` |

### Supported Channel Formats
- **Channel ID**: `UCXuqSBlHAE6Xw-yeJA0Tunw`
- **Username**: `username`
- **@ Format**: `@username`
- **Full URLs**: `https://www.youtube.com/channel/UCXuqSBlHAE6Xw-yeJA0Tunw`
- **Custom URLs**: `https://www.youtube.com/c/channelname`

## ⚙️ Configuration

### Main Configuration (`config.js`)
```javascript
module.exports = {
  port: 3000,                    // WebSocket server port
  commandPrefix: '!',            // Command prefix
  commandDelay: 50,              // ms between commands
  batchDelay: 100,               // ms between batched commands
  
  coordinates: {
    subscriberDisplay: {
      start: { x: 1, y: -60, z: 42 },
      digitSpacing: 4
    },
    profileImage: {
      corner: { x: -31, y: -60, z: 82 },
      width: 35,
      height: 35
    }
  }
}
```

### Wool Colors (`woolColors.json`)
Define available wool colors with their RGB values:
```json
[
  { "name": "white_wool", "rgb": "249,255,254" },
  { "name": "orange_wool", "rgb": "249,128,29" },
  { "name": "magenta_wool", "rgb": "199,78,189" }
]
```

## 🏗️ Architecture

### Project Structure
```
minecraft-youtube-bot/
├── config.js              # Main configuration
├── index.js               # Bot server and initialization
├── package.json           # Dependencies and scripts
├── README.md             # This file
├── woolColors.json       # Wool color definitions
├── utils/
│   ├── logger.js         # Logging system
│   ├── commandSystem.js  # WebSocket command management
│   └── imageProcessor.js # Image processing and color matching
├── services/
│   ├── youtubeService.js # YouTube API integration
│   └── minecraftRenderer.js # Minecraft display rendering
└── handlers/
    └── commandHandler.js # Command parsing and execution
```

### Key Components

- **CommandSystem**: Manages WebSocket communication with rate limiting and queuing
- **ImageProcessor**: Handles image download, resizing, and color conversion
- **YouTubeService**: Fetches channel data from YouTube API
- **MinecraftRenderer**: Renders displays in Minecraft world
- **CommandHandler**: Processes player commands and coordinates services

## 🚀 Performance Features

### Command Queuing
- Rate-limited command execution prevents server spam
- Intelligent batching for large operations
- Priority system for urgent commands

### Image Processing
- Color matching cache for repeated lookups
- Optimized block grouping for efficient rendering
- Automatic cleanup of temporary files

### Memory Management
- Automatic cache clearing
- Temporary file cleanup
- Queue management and limits

## 🐛 Troubleshooting

### Common Issues

**Bot won't connect to Minecraft**
- Ensure Minecraft allows WebSocket connections
- Check firewall settings for port 3000
- Verify you're using the correct `/connect` command

**Profile images not displaying**
- Check that the profile image area is clear
- Ensure wool colors are properly defined
- Verify internet connection for image downloads

**Commands not responding**
- Check that messages start with `!` prefix
- Ensure bot is connected (look for connection message)
- Try `!status` to check bot health

**Performance issues**
- Reduce batch sizes in config
- Clear caches with `!reload`
- Check available memory and CPU

### Debug Mode
Run with debug logging:
```bash
NODE_ENV=development npm start
```

## 🔧 Development

### Adding New Commands
1. Add command logic to `CommandHandler.executeCommand()`
2. Update help text in `MinecraftRenderer.showHelp()`
3. Test with various input formats

### Customizing Display Areas
1. Modify coordinates in `config.js`
2. Update clear areas to match new locations
3. Rebuild number templates if needed

### Extending Image Processing
- Modify `ImageProcessor.findClosestWoolColor()` for different color algorithms
- Add new image formats in `downloadAndProcessImage()`
- Customize resizing options in `processImage()`

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Mixerno Space API](https://mixerno.space) for YouTube channel data
- Minecraft community for WebSocket protocol documentation
- Sharp library for efficient image processing

## 📞 Support

If you encounter issues or have questions:
1. Check this README and troubleshooting section
2. Look through existing GitHub issues
3. Create a new issue with detailed information
4. Join our Discord server (if available)

---

Made with ❤️ for the Minecraft and YouTube communities