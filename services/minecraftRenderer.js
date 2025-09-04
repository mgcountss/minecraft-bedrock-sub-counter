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
   * Clear only the subscriber count display area
   */
  async clearSubscriberDisplay() {
    Logger.info('Clearing subscriber display area...');
    
    const subscriberArea = config.coordinates.clearAreas[0]; // First clear area is subscriber display
    const clearCommand = `fill ${subscriberArea.from} ${subscriberArea.to} air`;
    
    await this.commandSystem.sendCommand(clearCommand);
    
    Logger.success('Subscriber display area cleared');
  }

  /**
   * Clear only the profile image display area
   */
  async clearProfileImage() {
    Logger.info('Clearing profile image display area...');
    
    const profileArea = config.coordinates.clearAreas[1]; // Second clear area is profile image
    const clearCommand = `fill ${profileArea.from} ${profileArea.to} air`;
    
    await this.commandSystem.sendCommand(clearCommand);
    
    Logger.success('Profile image display area cleared');
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
   * Update only the subscriber count (for live updates)
   * Only changes digits that are different from the previous count
   */
  async updateSubscriberCount(newCount, oldCount = null) {
    try {
      Logger.info(`Updating subscriber count from ${oldCount || 'unknown'} to: ${newCount}`);
      
      if (!oldCount) {
        // If we don't have the old count, clear and render everything
        await this.clearSubscriberDisplay();
        await this.renderSubscriberCount(newCount);
        Logger.success('Subscriber count fully updated (no previous count available)');
        return;
      }
      
      const newDigits = newCount.toString().split('');
      const oldDigits = oldCount.toString().split('');
      const maxLength = Math.max(newDigits.length, oldDigits.length);
      
      // Pad shorter number with leading spaces for comparison
      while (newDigits.length < maxLength) newDigits.unshift(' ');
      while (oldDigits.length < maxLength) oldDigits.unshift(' ');
      
      const changedPositions = [];
      const commands = [];
      
      // Find positions where digits have changed
      for (let i = 0; i < maxLength; i++) {
        if (newDigits[i] !== oldDigits[i]) {
          changedPositions.push(i);
          
          const destX = config.coordinates.subscriberDisplay.start.x - (i * config.coordinates.subscriberDisplay.digitSpacing);
          const destY = config.coordinates.subscriberDisplay.start.y;
          const destZ = config.coordinates.subscriberDisplay.start.z;
          
          if (newDigits[i] === ' ') {
            // Clear this position (number got shorter)
            const clearFrom = `${destX + 2} ${destY} ${destZ - 2}`;
            const clearTo = `${destX - 2} ${destY + 4} ${destZ + 2}`;
            commands.push(`fill ${clearFrom} ${clearTo} air`);
          } else {
            // First clear the specific position
            const clearFrom = `${destX + 2} ${destY} ${destZ - 2}`;
            const clearTo = `${destX - 2} ${destY + 4} ${destZ + 2}`;
            commands.push(`fill ${clearFrom} ${clearTo} air`);
            
            // Then place the new digit
            const template = config.coordinates.digitTemplates[newDigits[i]];
            if (template) {
              const destination = `${destX} ${destY} ${destZ}`;
              commands.push(`clone ${template.from} ${template.to} ${destination}`);
            }
          }
        }
      }
      
      if (commands.length > 0) {
        Logger.info(`Updating ${changedPositions.length} digit positions: [${changedPositions.join(', ')}]`);
        await this.commandSystem.sendBatch(commands, 25);
        Logger.success(`Updated ${changedPositions.length} digits efficiently`);
      } else {
        Logger.info('No digit changes detected, skipping update');
      }
      
    } catch (error) {
      Logger.error('Failed to update subscriber count', error);
      throw error;
    }
  }

  /**
   * Smart render subscriber count - checks if we need full render or partial update
   */
  async smartRenderSubscriberCount(newCount, oldCount = null) {
    try {
      if (!oldCount) {
        // Full render for initial display
        await this.renderSubscriberCount(newCount);
      } else {
        // Efficient partial update
        await this.updateSubscriberCount(newCount, oldCount);
      }
    } catch (error) {
      Logger.error('Failed to smart render subscriber count', error);
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
      '!info <channel> - Get channel info only',
      '!search <term> - Search for YouTube channels',
      '!live - Enable live subscriber updates (optimized)',
      '!stop - Stop live updates',
      '!clear - Clear all displays',
      '!help - Show this help message',
      '!status - Show bot status',
      '!stats - Show detailed statistics'
    ];
    
    for (const message of helpMessages) {
      await this.commandSystem.say(message);
      await this.commandSystem.sleep(500); // Brief pause between messages
    }
  }

  /**
   * Display bot status
   */
  async showStatus(liveUpdatesState) {
    const queueLength = this.commandSystem.commandQueue.length;
    const cacheSize = this.imageProcessor?.colorCache?.size || 0;
    
    await this.commandSystem.say(`🟢 Bot Status: Active | Queue: ${queueLength} | Cache: ${cacheSize}`);
    
    if (liveUpdatesState && liveUpdatesState.enabled) {
      const duration = Math.floor((Date.now() - liveUpdatesState.startTime) / 1000);
      await this.commandSystem.say(`🔴 Live Updates: Active for ${liveUpdatesState.channelData.channelName} (${duration}s)`);
    } else {
      await this.commandSystem.say(`⚫ Live Updates: Disabled`);
    }
  }

  /**
   * Show a countdown for live updates
   */
  async showLiveUpdateCountdown(seconds) {
    if (seconds <= 5 && seconds > 0) {
      await this.commandSystem.say(`🔄 Live update in ${seconds}...`);
    }
  }

  /**
   * Display an error message with formatting
   */
  async showError(message) {
    await this.commandSystem.say(`❌ Error: ${message}`);
  }

  /**
   * Display a success message with formatting
   */
  async showSuccess(message) {
    await this.commandSystem.say(`✅ ${message}`);
  }

  /**
   * Display an info message with formatting
   */
  async showInfo(message) {
    await this.commandSystem.say(`ℹ️ ${message}`);
  }

  /**
   * Display a warning message with formatting
   */
  async showWarning(message) {
    await this.commandSystem.say(`⚠️ ${message}`);
  }
}

module.exports = MinecraftRenderer;