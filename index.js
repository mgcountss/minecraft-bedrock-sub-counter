const WebSocket = require('ws');
const uuid = require('uuid');
const fs = require('fs').promises;
const path = require('path');

// Import our modules
const config = require('./config');
const Logger = require('./utils/logger');
const CommandSystem = require('./utils/commandSystem');
const ImageProcessor = require('./utils/imageProcessor');
const YouTubeService = require('./services/youtubeService');
const MinecraftRenderer = require('./services/minecraftRenderer');
const CommandHandler = require('./handlers/commandHandler');

class MinecraftYouTubeBot {
  constructor() {
    this.wss = null;
    this.woolColors = null;
    this.connectedClients = new Set();
    this.commandHandlers = new Map(); // Store command handlers for cleanup
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    try {
      Logger.info('Initializing Minecraft YouTube Bot...');
      
      // Load wool colors
      await this.loadWoolColors();
      
      // Create WebSocket server
      this.createWebSocketServer();
      
      Logger.success(`Bot initialized successfully on port ${config.port}`);
      Logger.info(`Connect to Minecraft with: /connect localhost:${config.port}`);
      Logger.info(`Command prefix: ${config.commandPrefix}`);
      Logger.info('Live updates: Available (use !live after displaying a channel)');
      
    } catch (error) {
      Logger.error('Failed to initialize bot', error);
      process.exit(1);
    }
  }

  /**
   * Load wool colors configuration
   */
  async loadWoolColors() {
    try {
      const woolColorsPath = path.join(__dirname, 'woolColors.json');
      const woolColorsData = await fs.readFile(woolColorsPath, 'utf8');
      this.woolColors = JSON.parse(woolColorsData);
      
      Logger.success(`Loaded ${this.woolColors.length} wool colors`);
    } catch (error) {
      Logger.error('Failed to load wool colors', error);
      throw error;
    }
  }

  /**
   * Create and configure WebSocket server
   */
  createWebSocketServer() {
    this.wss = new WebSocket.Server({ 
      port: config.port,
      perMessageDeflate: false // Disable compression for better performance
    });

    this.wss.on('connection', (socket, request) => {
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      Logger.error('WebSocket server error', error);
    });
  }

  /**
   * Handle new WebSocket connections
   */
  handleConnection(socket, request) {
    const clientId = uuid.v4();
    this.connectedClients.add(socket);
    
    Logger.success(`Client connected: ${clientId} (${request.socket.remoteAddress})`);
    Logger.info(`Total connections: ${this.connectedClients.size}`);

    // Initialize client systems
    const commandSystem = new CommandSystem(socket);
    const imageProcessor = new ImageProcessor(this.woolColors);
    const minecraftRenderer = new MinecraftRenderer(commandSystem);
    const commandHandler = new CommandHandler(commandSystem, imageProcessor, minecraftRenderer);

    // Store command handler for cleanup
    this.commandHandlers.set(socket, commandHandler);

    // Subscribe to player messages
    this.subscribeToPlayerMessages(socket);

    // Handle incoming messages
    socket.on('message', async (data) => {
      await this.handleMessage(data, commandHandler);
    });

    // Handle disconnection
    socket.on('close', (code, reason) => {
      this.connectedClients.delete(socket);
      
      // Cleanup command handler
      const handler = this.commandHandlers.get(socket);
      if (handler) {
        handler.cleanup();
        this.commandHandlers.delete(socket);
      }
      
      Logger.warn(`Client disconnected: ${clientId} (Code: ${code}, Reason: ${reason})`);
      Logger.info(`Total connections: ${this.connectedClients.size}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      Logger.error(`Socket error for client ${clientId}`, error);
      
      // Cleanup on error
      const handler = this.commandHandlers.get(socket);
      if (handler) {
        handler.cleanup();
        this.commandHandlers.delete(socket);
      }
    });

    // Send welcome message
    setTimeout(async () => {
      await commandSystem.say('🤖 YouTube Bot connected! Use !help for commands.');
      await commandSystem.say('💡 New: Search channels with !search, live updates with !live!');
    }, 1000);
  }

  /**
   * Subscribe to Minecraft player messages
   */
  subscribeToPlayerMessages(socket) {
    const subscribeMessage = {
      header: {
        version: 1,
        requestId: uuid.v4(),
        messageType: 'commandRequest',
        messagePurpose: 'subscribe'
      },
      body: {
        eventName: 'PlayerMessage'
      }
    };

    socket.send(JSON.stringify(subscribeMessage));
    Logger.debug('Subscribed to PlayerMessage events');
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(data, commandHandler) {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle player messages
      if (message.header?.eventName === 'PlayerMessage') {
        const playerMessage = message.body?.message;
        const playerName = message.body?.sender || 'Unknown';
        
        if (playerMessage) {
          Logger.info(`Player message from ${playerName}: ${playerMessage}`);
          await commandHandler.handleMessage(playerMessage);
        }
      }
      
    } catch (error) {
      if (error instanceof SyntaxError) {
        Logger.warn('Received invalid JSON message');
      } else {
        Logger.error('Failed to handle message', error);
      }
    }
  }

  /**
   * Shutdown the bot gracefully
   */
  async shutdown() {
    Logger.info('Shutting down bot...');
    
    // Cleanup all command handlers (stops live updates)
    for (const handler of this.commandHandlers.values()) {
      handler.cleanup();
    }
    this.commandHandlers.clear();
    
    if (this.wss) {
      // Close all client connections
      for (const socket of this.connectedClients) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1001, 'Server shutting down');
        }
      }
      
      // Close server
      this.wss.close(() => {
        Logger.success('WebSocket server closed');
      });
    }
    
    Logger.success('Bot shutdown complete');
  }

  /**
   * Get bot statistics
   */
  getStats() {
    const liveUpdatesActive = Array.from(this.commandHandlers.values())
      .filter(handler => handler.liveUpdates?.enabled).length;
    
    return {
      connections: this.connectedClients.size,
      woolColors: this.woolColors?.length || 0,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      liveUpdatesActive: liveUpdatesActive
    };
  }

  /**
   * Get all active live update sessions
   */
  getActiveLiveUpdates() {
    const activeSessions = [];
    
    for (const handler of this.commandHandlers.values()) {
      if (handler.liveUpdates?.enabled && handler.liveUpdates.channelData) {
        activeSessions.push({
          channelName: handler.liveUpdates.channelData.channelName,
          channelId: handler.liveUpdates.channelData.channelId,
          startTime: handler.liveUpdates.startTime,
          lastCount: handler.liveUpdates.lastSubscriberCount
        });
      }
    }
    
    return activeSessions;
  }
}

// Create and start the bot
const bot = new MinecraftYouTubeBot();

// Handle process events
process.on('SIGINT', async () => {
  Logger.info('Received SIGINT, shutting down gracefully...');
  await bot.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  Logger.info('Received SIGTERM, shutting down gracefully...');
  await bot.shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  Logger.error('Uncaught exception', error);
  bot.shutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start the bot
bot.initialize().catch((error) => {
  Logger.error('Failed to start bot', error);
  process.exit(1);
});

module.exports = MinecraftYouTubeBot;