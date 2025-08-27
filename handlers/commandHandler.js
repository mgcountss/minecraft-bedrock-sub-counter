const config = require('../config');
const Logger = require('../utils/logger');
const YouTubeService = require('../services/youtubeService');

class CommandHandler {
  constructor(commandSystem, imageProcessor, minecraftRenderer) {
    this.commandSystem = commandSystem;
    this.imageProcessor = imageProcessor;
    this.minecraftRenderer = minecraftRenderer;
    this.isProcessing = false;
  }

  /**
   * Parse and execute commands from player messages
   */
  async handleMessage(message) {
    try {
      const trimmed = message.trim();
      
      if (!trimmed.startsWith(config.commandPrefix)) {
        return false; // Not a command
      }

      const parts = trimmed.substring(1).split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      Logger.info(`Processing command: ${command} with args: [${args.join(', ')}]`);
      
      await this.executeCommand(command, args);
      return true;
      
    } catch (error) {
      Logger.error('Failed to handle command', error);
      await this.commandSystem.say(`❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute specific commands
   */
  async executeCommand(command, args) {
    // Prevent multiple simultaneous operations
    if (this.isProcessing && ['subs', 'channel', 'clear'].includes(command)) {
      await this.commandSystem.say('⏳ Please wait, still processing previous command...');
      return;
    }

    switch (command) {
      case 'subs':
      case 'subscribers':
        await this.handleSubscribers(args);
        break;

      case 'channel':
      case 'chan':
        await this.handleSubscribers(args); // Same functionality
        break;

      case 'info':
        await this.handleChannelInfo(args);
        break;

      case 'clear':
      case 'reset':
        await this.handleClear();
        break;

      case 'help':
      case 'commands':
        await this.minecraftRenderer.showHelp();
        break;

      case 'status':
        await this.minecraftRenderer.showStatus();
        break;

      case 'reload':
        await this.handleReload();
        break;

      default:
        await this.commandSystem.say(`❓ Unknown command: ${command}. Use !help for available commands.`);
    }
  }

  /**
   * Handle subscriber display command
   */
  async handleSubscribers(args) {
    this.isProcessing = true;
    
    try {
      if (args.length === 0) {
        await this.commandSystem.say('❓ Usage: !subs <channel_url_or_id>');
        return;
      }

      const channelInput = args.join(' ');
      
      if (!YouTubeService.isValidChannelInput(channelInput)) {
        await this.commandSystem.say('❌ Invalid channel format. Please provide a YouTube channel URL, ID, or @username.');
        return;
      }

      await this.commandSystem.say('🔍 Fetching channel data...');
      
      // Fetch channel data
      const channelData = await YouTubeService.getChannelData(channelInput);
      
      if (!channelData.success) {
        await this.commandSystem.say(`❌ Failed to fetch channel data: ${channelData.error}`);
        return;
      }

      await this.commandSystem.say(`✅ Found: ${channelData.channelName} (${YouTubeService.formatSubscriberCount(channelData.subscriberCount)} subs)`);
      
      // Process profile image if available
      let blockData = null;
      if (channelData.profileImageUrl) {
        try {
          await this.commandSystem.say('🖼️ Processing profile image...');
          
          await this.imageProcessor.downloadAndProcessImage(channelData.profileImageUrl);
          blockData = await this.imageProcessor.generateBlockData();
          
        } catch (error) {
          Logger.warn('Failed to process profile image, continuing without it', error);
          await this.commandSystem.say('⚠️ Profile image failed, showing subscriber count only');
        }
      }

      // Render in Minecraft
      await this.commandSystem.say('🎮 Rendering in Minecraft...');
      await this.minecraftRenderer.renderYouTubeChannel(channelData, blockData);
      
      await this.commandSystem.say('✨ Display complete!');
      
      // Cleanup
      await this.imageProcessor.cleanup();
      
    } catch (error) {
      Logger.error('Failed to handle subscribers command', error);
      await this.commandSystem.say(`❌ Command failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle channel info command (no rendering)
   */
  async handleChannelInfo(args) {
    try {
      if (args.length === 0) {
        await this.commandSystem.say('❓ Usage: !info <channel_url_or_id>');
        return;
      }

      const channelInput = args.join(' ');
      
      if (!YouTubeService.isValidChannelInput(channelInput)) {
        await this.commandSystem.say('❌ Invalid channel format.');
        return;
      }

      await this.commandSystem.say('🔍 Fetching channel info...');
      
      const channelData = await YouTubeService.getChannelData(channelInput);
      
      if (!channelData.success) {
        await this.commandSystem.say(`❌ Failed to fetch channel: ${channelData.error}`);
        return;
      }

      const formattedSubs = YouTubeService.formatSubscriberCount(channelData.subscriberCount);
      await this.commandSystem.say(`📊 ${channelData.channelName}`);
      await this.commandSystem.say(`👥 Subscribers: ${channelData.subscriberCount.toLocaleString('en-US')} (${formattedSubs})`);
      
    } catch (error) {
      Logger.error('Failed to handle channel info command', error);
      await this.commandSystem.say(`❌ Info failed: ${error.message}`);
    }
  }

  /**
   * Handle clear/reset command
   */
  async handleClear() {
    this.isProcessing = true;
    
    try {
      await this.commandSystem.say('🧹 Clearing displays...');
      await this.minecraftRenderer.clearAll();
      await this.commandSystem.say('✅ All displays cleared!');
      
    } catch (error) {
      Logger.error('Failed to clear displays', error);
      await this.commandSystem.say(`❌ Clear failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle reload command (clear caches, etc.)
   */
  async handleReload() {
    try {
      await this.commandSystem.say('🔄 Reloading bot systems...');
      
      // Clear caches
      this.imageProcessor.clearCache();
      this.commandSystem.clearQueue();
      
      // Cleanup temp files
      await this.imageProcessor.cleanup();
      
      await this.commandSystem.say('✅ Bot reloaded successfully!');
      
    } catch (error) {
      Logger.error('Failed to reload bot', error);
      await this.commandSystem.say(`❌ Reload failed: ${error.message}`);
    }
  }

  /**
   * Handle batch channel processing (experimental)
   */
  async handleBatchChannels(args) {
    if (this.isProcessing) {
      await this.commandSystem.say('⏳ Bot is busy, please wait...');
      return;
    }

    this.isProcessing = true;
    
    try {
      const channels = args.join(' ').split(',').map(c => c.trim());
      
      if (channels.length === 0 || channels.length > 5) {
        await this.commandSystem.say('❓ Usage: !batch <channel1>,<channel2>,... (max 5)');
        return;
      }

      await this.commandSystem.say(`🔄 Processing ${channels.length} channels...`);
      
      for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        await this.commandSystem.say(`[${i + 1}/${channels.length}] Processing: ${channel}`);
        
        const channelData = await YouTubeService.getChannelData(channel);
        if (channelData.success) {
          const formatted = YouTubeService.formatSubscriberCount(channelData.subscriberCount);
          await this.commandSystem.say(`✅ ${channelData.channelName}: ${formatted} subs`);
        } else {
          await this.commandSystem.say(`❌ Failed: ${channel}`);
        }
        
        // Small delay between channels
        await this.commandSystem.sleep(1000);
      }
      
      await this.commandSystem.say('✨ Batch processing complete!');
      
    } catch (error) {
      Logger.error('Failed to handle batch command', error);
      await this.commandSystem.say(`❌ Batch failed: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle top channels command (mock data for now)
   */
  async handleTopChannels() {
    const topChannels = [
      { name: 'T-Series', subs: '245000000' },
      { name: 'YouTube Movies', subs: '173000000' },
      { name: 'Cocomelon', subs: '172000000' },
      { name: 'SET India', subs: '171000000' },
      { name: 'MrBeast', subs: '112000000' }
    ];

    await this.commandSystem.say('🏆 Top 5 YouTube Channels:');
    
    for (let i = 0; i < topChannels.length; i++) {
      const channel = topChannels[i];
      const formatted = YouTubeService.formatSubscriberCount(channel.subs);
      await this.commandSystem.say(`${i + 1}. ${channel.name}: ${formatted} subs`);
      await this.commandSystem.sleep(500);
    }
  }

  /**
   * Handle search command
   */
  async handleSearch(args) {
    if (args.length === 0) {
      await this.commandSystem.say('❓ Usage: !search <search_term>');
      return;
    }

    const searchTerm = args.join(' ');
    await this.commandSystem.say(`🔍 Search functionality not implemented yet for: "${searchTerm}"`);
    await this.commandSystem.say('💡 Try using a direct channel URL or ID instead!');
  }

  /**
   * Handle stats command
   */
  async handleStats() {
    const stats = {
      uptime: Math.floor(process.uptime()),
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      queueLength: this.commandSystem.commandQueue.length,
      cacheSize: this.imageProcessor.colorCache?.size || 0
    };

    const uptimeHours = Math.floor(stats.uptime / 3600);
    const uptimeMinutes = Math.floor((stats.uptime % 3600) / 60);

    await this.commandSystem.say('📈 Bot Statistics:');
    await this.commandSystem.say(`⏱️ Uptime: ${uptimeHours}h ${uptimeMinutes}m`);
    await this.commandSystem.say(`🧠 Memory: ${stats.memory}MB`);
    await this.commandSystem.say(`📋 Queue: ${stats.queueLength} commands`);
    await this.commandSystem.say(`🎨 Cache: ${stats.cacheSize} colors`);
  }

  /**
   * Get list of available commands
   */
  getAvailableCommands() {
    return [
      { command: '!subs <channel>', description: 'Display subscriber count and profile image' },
      { command: '!info <channel>', description: 'Get channel information only' },
      { command: '!clear', description: 'Clear all displays' },
      { command: '!help', description: 'Show help message' },
      { command: '!status', description: 'Show bot status' },
      { command: '!stats', description: 'Show detailed bot statistics' },
      { command: '!reload', description: 'Reload bot systems' },
      { command: '!top', description: 'Show top YouTube channels' },
      { command: '!batch <ch1,ch2,...>', description: 'Process multiple channels (max 5)' },
      { command: '!search <term>', description: 'Search for channels (coming soon)' }
    ];
  }

  /**
   * Validate command rate limiting per user
   */
  validateRateLimit(userId) {
    // This could be expanded to implement per-user rate limiting
    if (this.isProcessing) {
      return false;
    }
    return true;
  }

  /**
   * Get command usage statistics
   */
  getCommandStats() {
    // This could track command usage for analytics
    return {
      totalCommands: 0,
      popularCommands: [],
      errorRate: 0
    };
  }
}

module.exports = CommandHandler;