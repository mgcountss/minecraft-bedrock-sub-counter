const uuid = require('uuid');
const config = require('../config');
const Logger = require('./logger');

class CommandSystem {
  constructor(socket) {
    this.socket = socket;
    this.lastCommandTime = 0;
    this.commandQueue = [];
    this.isProcessing = false;
  }

  /**
   * Send a Minecraft command through WebSocket
   * @param {string} command - Minecraft command without leading slash
   * @param {boolean} priority - Skip rate limiting for urgent commands
   */
  async sendCommand(command, priority = false) {
    return new Promise((resolve, reject) => {
      if (!command) {
        reject(new Error('Command cannot be empty'));
        return;
      }

      // Add slash prefix if not present
      const fullCommand = command.startsWith('/') ? command : `/${command}`;
      
      const commandData = {
        command: fullCommand,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      };

      if (priority || (Date.now() - this.lastCommandTime >= config.commandDelay)) {
        this.executeCommand(commandData);
      } else {
        this.commandQueue.push(commandData);
        this.processQueue();
      }
    });
  }

  /**
   * Send multiple commands as a batch
   * @param {string[]} commands - Array of commands
   * @param {number} delay - Delay between commands in ms
   */
  async sendBatch(commands, delay = config.batchDelay) {
    const results = [];
    for (let i = 0; i < commands.length; i++) {
      try {
        const result = await this.sendCommand(commands[i]);
        results.push(result);
        
        // Add delay between commands except for the last one
        if (i < commands.length - 1) {
          await this.sleep(delay);
        }
      } catch (error) {
        Logger.error(`Failed to execute batch command ${i}: ${commands[i]}`, error);
        results.push({ error: error.message });
      }
    }
    return results;
  }

  /**
   * Execute a single command immediately
   */
  executeCommand({ command, resolve, reject }) {
    try {
      const message = {
        header: {
          version: 1,
          requestId: uuid.v4(),
          messagePurpose: 'commandRequest',
          messageType: 'commandRequest'
        },
        body: {
          version: 1,
          commandLine: command,
          origin: {
            type: 'player'
          }
        }
      };

      this.socket.send(JSON.stringify(message));
      this.lastCommandTime = Date.now();
      
      Logger.debug(`Executed command: ${command}`);
      resolve({ success: true, command });
    } catch (error) {
      Logger.error(`Failed to execute command: ${command}`, error);
      reject(error);
    }
  }

  /**
   * Process queued commands
   */
  async processQueue() {
    if (this.isProcessing || this.commandQueue.length === 0) return;

    this.isProcessing = true;
    
    while (this.commandQueue.length > 0) {
      const timeSinceLastCommand = Date.now() - this.lastCommandTime;
      
      if (timeSinceLastCommand < config.commandDelay) {
        await this.sleep(config.commandDelay - timeSinceLastCommand);
      }
      
      const commandData = this.commandQueue.shift();
      this.executeCommand(commandData);
    }
    
    this.isProcessing = false;
  }

  /**
   * Clear all queued commands
   */
  clearQueue() {
    const clearedCount = this.commandQueue.length;
    this.commandQueue.forEach(({ reject }) => {
      reject(new Error('Command cancelled - queue cleared'));
    });
    this.commandQueue = [];
    Logger.info(`Cleared ${clearedCount} queued commands`);
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send a chat message
   */
  async say(message) {
    return this.sendCommand(`say ${message}`, true);
  }

  /**
   * Fill an area with blocks
   */
  async fill(from, to, block = 'air') {
    return this.sendCommand(`fill ${from} ${to} ${block}`);
  }

  /**
   * Set a single block
   */
  async setBlock(coordinates, block) {
    return this.sendCommand(`setblock ${coordinates} ${block}`);
  }

  /**
   * Clone a structure
   */
  async clone(from, to, destination) {
    return this.sendCommand(`clone ${from} ${to} ${destination}`);
  }
}

module.exports = CommandSystem;