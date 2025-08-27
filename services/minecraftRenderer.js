const config = require('../config');
const Logger = require('../utils/logger');

class MinecraftRenderer {
  constructor(commandSystem) {
    this.commandSystem = commandSystem;
  }

  /**
   * Clear all display areas
   */
  async clearAll() {
    Logger.info('Clearing all display areas...');
    
    const clearCommands = config.coordinates.clearAreas.map(area => 
      `fill ${area.from} ${area.to} air`
    );
    
    await this.commandSystem.sendBatch(clearCommands, 50);
    this.commandSystem.clearQueue();
    
    Logger.success('All areas cleared');
  }

  /**
   * Render subscriber count using pre-built digit templates
   */
  async renderSubscriberCount(subscriberCount) {
    try {
      Logger.info(`Rendering subscriber count: ${subscriberCount}`);
      
      const digits = subscriberCount.toString().split('');
      const commands = [];
      
      for (let i = 0; i < digits.length && i < 10; i++) {
        const digit = digits[i];
        const template = config.coordinates.digitTemplates[digit];
        
        if (!template) {
          Logger.warn(`No template found for digit: ${digit}`);
          continue;
        }
        
        // Calculate destination coordinates
        const destX = config.coordinates.subscriberDisplay.start.x - (i * config.coordinates.subscriberDisplay.digitSpacing);
        const destY = config.coordinates.subscriberDisplay.start.y;
        const destZ = config.coordinates.subscriberDisplay.start.z;
        const destination = `${destX} ${destY} ${destZ}`;
        
        commands.push(`clone ${template.from} ${template.to} ${destination}`);
      }
      
      if (commands.length > 0) {
        await this.commandSystem.sendBatch(commands);
        Logger.success(`Rendered ${commands.length} digits for subscriber count`);
      }
      
    } catch (error) {
      Logger.error('Failed to render subscriber count', error);
      throw error;
    }
  }

  /**
   * Render profile image as pixel art
   */
  async renderProfileImage(blockData) {
    try {
      Logger.info(`Rendering profile image with ${blockData.length} blocks...`);
      
      // Group blocks by type for more efficient rendering
      const blockGroups = new Map();
      
      blockData.forEach(block => {
        if (!blockGroups.has(block.block)) {
          blockGroups.set(block.block, []);
        }
        blockGroups.get(block.block).push(block);
      });
      
      Logger.debug(`Grouped blocks into ${blockGroups.size} different types`);
      
      // Render blocks in batches by type
      for (const [blockType, blocks] of blockGroups) {
        const commands = blocks.map(block => 
          `setblock ${block.coordinates} ${blockType}`
        );
        
        Logger.debug(`Rendering ${commands.length} ${blockType} blocks`);
        await this.commandSystem.sendBatch(commands, 25); // Faster batch for pixel art
      }
      
      Logger.success('Profile image rendered successfully');
      
    } catch (error) {
      Logger.error('Failed to render profile image', error);
      throw error;
    }
  }

  /**
   * Render complete YouTube channel display
   */
  async renderYouTubeChannel(channelData, blockData) {
    try {
      Logger.info(`Rendering complete YouTube channel display for: ${channelData.channelName}`);
      
      // Start with subscriber count (faster)
      await this.renderSubscriberCount(channelData.subscriberCount);
      
      // Then render profile image if available
      if (blockData && blockData.length > 0) {
        await this.renderProfileImage(blockData);
      } else {
        Logger.warn('No profile image block data available');
      }
      
      Logger.success('YouTube channel display completed');
      
    } catch (error) {
      Logger.error('Failed to render YouTube channel display', error);
      await this.commandSystem.say(`❌ Failed to render channel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a simple text display using blocks
   */
  async renderText(text, startCoords, blockType = 'white_wool') {
    // This is a placeholder for future text rendering functionality
    Logger.info(`Text rendering not yet implemented: ${text}`);
    return this.commandSystem.say(`Text: ${text}`);
  }

  /**
   * Display help information in chat
   */
  async showHelp() {
    const helpMessages = [
      '🤖 YouTube Display Bot Commands:',
      '!subs <channel> - Display subscriber count and profile',
      '!clear - Clear all displays',
      '!help - Show this help message',
      '!status - Show bot status',
      '!info <channel> - Get channel info only'
    ];
    
    for (const message of helpMessages) {
      await this.commandSystem.say(message);
      await this.commandSystem.sleep(500); // Brief pause between messages
    }
  }

  /**
   * Display bot status
   */
  async showStatus() {
    const queueLength = this.commandSystem.commandQueue.length;
    const cacheSize = this.imageProcessor?.colorCache?.size || 0;
    
    await this.commandSystem.say(`🟢 Bot Status: Active | Queue: ${queueLength} | Cache: ${cacheSize}`);
  }
}

module.exports = MinecraftRenderer;