const fetch = require('node-fetch');
const config = require('../config');
const Logger = require('../utils/logger');

class YouTubeService {
  /**
   * Extract channel ID from various YouTube URL formats
   */
  static extractChannelId(input) {
    // Remove common prefixes and clean input
    let cleanInput = input.trim();
    
    // Handle full YouTube URLs
    if (cleanInput.includes('youtube.com')) {
      if (cleanInput.includes('/channel/')) {
        cleanInput = cleanInput.split('/channel/')[1].split(/[?&#]/)[0];
      } else if (cleanInput.includes('/c/') || cleanInput.includes('/user/')) {
        // These would need additional API calls to resolve to channel IDs
        // For now, return as-is and let the API handle it
        cleanInput = cleanInput.split('/').pop().split(/[?&#]/)[0];
      }
    }
    
    // Handle @username format
    if (cleanInput.startsWith('@')) {
      cleanInput = cleanInput.substring(1);
    }
    
    return cleanInput;
  }

  /**
   * Fetch YouTube channel data
   */
  static async getChannelData(channelInput) {
    try {
      const channelId = this.extractChannelId(channelInput);
      Logger.info(`Fetching data for channel: ${channelId}`);
      
      const response = await fetch(`${config.api.youtubeCounter}${channelId}`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data.counts || !data.counts[0] || !data.user || !data.user[1]) {
        throw new Error('Invalid API response structure');
      }
      
      const result = {
        subscriberCount: data.counts[0].count.toString(),
        profileImageUrl: data.user[1].count, // This seems to be the profile image URL based on original code
        channelName: data.user[0]?.count || 'Unknown Channel',
        success: true
      };
      
      Logger.success(`Fetched data for ${result.channelName}: ${result.subscriberCount} subscribers`);
      return result;
      
    } catch (error) {
      Logger.error(`Failed to fetch channel data for: ${channelInput}`, error);
      return {
        success: false,
        error: error.message,
        subscriberCount: '0',
        profileImageUrl: null,
        channelName: 'Unknown'
      };
    }
  }

  /**
   * Validate if input looks like a valid channel identifier
   */
  static isValidChannelInput(input) {
    if (!input || typeof input !== 'string') return false;
    
    const cleaned = input.trim();
    
    // Check for various valid formats
    const patterns = [
      /^UC[\w-]{22}$/,              // Channel ID format
      /^[\w-]+$/,                   // Simple username
      /^@[\w-]+$/,                  // @username format
      /youtube\.com\/(channel|c|user)\//  // Full YouTube URL
    ];
    
    return patterns.some(pattern => pattern.test(cleaned));
  }

  /**
   * Format subscriber count for display
   */
  static formatSubscriberCount(count) {
    const num = parseInt(count);
    
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    
    return count;
  }
}

module.exports = YouTubeService;