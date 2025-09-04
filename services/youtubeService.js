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
   * Check if input matches channel ID regex pattern
   */
  static isChannelId(input) {
    const channelIdPattern = /^UC[\w-]{22}$/;
    return channelIdPattern.test(input.trim());
  }

  /**
   * Search for YouTube channels using the search API
   */
  static async searchChannels(query) {
    try {
      Logger.info(`Searching for channels with query: ${query}`);
      
      const response = await fetch(`${config.api.youtubeSearch}${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Search API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.list || !Array.isArray(data.list)) {
        throw new Error('Invalid search API response structure');
      }
      
      const results = data.list.map(item => ({
        channelName: item[0],
        profileImageUrl: item[1],
        channelId: item[2]
      }));
      
      Logger.success(`Found ${results.length} channels for query: ${query}`);
      return {
        success: true,
        results: results
      };
      
    } catch (error) {
      Logger.error(`Failed to search channels for query: ${query}`, error);
      return {
        success: false,
        error: error.message,
        results: []
      };
    }
  }

  /**
   * Get channel data, with automatic search fallback
   */
  static async getChannelData(channelInput) {
    try {
      const cleanInput = this.extractChannelId(channelInput);
      
      // First try to get data directly if it looks like a channel ID
      if (this.isChannelId(cleanInput)) {
        Logger.info(`Direct channel ID detected: ${cleanInput}`);
        return await this.fetchChannelDataDirect(cleanInput);
      }
      
      // If it's not a channel ID, try direct fetch first (for usernames, etc.)
      Logger.info(`Attempting direct fetch for: ${cleanInput}`);
      const directResult = await this.fetchChannelDataDirect(cleanInput);
      
      if (directResult.success) {
        return directResult;
      }
      
      // If direct fetch fails, try searching
      Logger.info(`Direct fetch failed, searching for: ${cleanInput}`);
      const searchResults = await this.searchChannels(cleanInput);
      
      if (!searchResults.success || searchResults.results.length === 0) {
        throw new Error(`No channels found for: ${channelInput}`);
      }
      
      // Use the first search result
      const firstResult = searchResults.results[0];
      Logger.info(`Using search result: ${firstResult.channelName} (${firstResult.channelId})`);
      
      return await this.fetchChannelDataDirect(firstResult.channelId);
      
    } catch (error) {
      Logger.error(`Failed to get channel data for: ${channelInput}`, error);
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
   * Fetch channel data directly from the API
   */
  static async fetchChannelDataDirect(channelId) {
    try {
      Logger.info(`Fetching direct data for channel: ${channelId}`);
      
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
        channelId: channelId,
        success: true
      };
      
      Logger.success(`Fetched data for ${result.channelName}: ${result.subscriberCount} subscribers`);
      return result;
      
    } catch (error) {
      Logger.error(`Failed to fetch direct channel data for: ${channelId}`, error);
      return {
        success: false,
        error: error.message,
        subscriberCount: '0',
        profileImageUrl: null,
        channelName: 'Unknown',
        channelId: channelId
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