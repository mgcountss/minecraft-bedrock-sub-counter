const sharp = require('sharp');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const config = require('../config');
const Logger = require('./logger');

class ImageProcessor {
  constructor(woolColors) {
    this.woolColors = woolColors;
    this.colorCache = new Map();
  }

  /**
   * Find the closest wool color for RGB values using Euclidean distance
   * Cached for performance
   */
  findClosestWoolColor(r, g, b) {
    const key = `${r},${g},${b}`;
    
    if (this.colorCache.has(key)) {
      return this.colorCache.get(key);
    }

    let closestColor = this.woolColors[0];
    let closestDistance = Number.MAX_VALUE;

    for (const woolColor of this.woolColors) {
      const [wr, wg, wb] = woolColor.rgb.split(',').map(Number);
      const distance = (r - wr) ** 2 + (g - wg) ** 2 + (b - wb) ** 2;
      
      if (distance < closestDistance) {
        closestColor = woolColor;
        closestDistance = distance;
      }
    }

    this.colorCache.set(key, closestColor.name);
    return closestColor.name;
  }

  /**
   * Download and process an image from URL
   */
  async downloadAndProcessImage(imageUrl) {
    try {
      Logger.info(`Downloading image from: ${imageUrl}`);
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.buffer();
      await fs.writeFile(config.image.tempFiles.original, buffer);
      
      Logger.success('Image downloaded successfully');
      return await this.processImage();
    } catch (error) {
      Logger.error('Failed to download image', error);
      throw error;
    }
  }

  /**
   * Process the downloaded image (resize and optimize)
   */
  async processImage() {
    try {
      Logger.info(`Processing image to ${config.image.width}x${config.image.height}`);
      
      await sharp(config.image.tempFiles.original)
        .resize(config.image.width, config.image.height, {
          fit: 'cover',
          position: 'center'
        })
        .png()
        .toFile(config.image.tempFiles.processed);
      
      Logger.success('Image processed successfully');
      return config.image.tempFiles.processed;
    } catch (error) {
      Logger.error('Failed to process image', error);
      throw error;
    }
  }

  /**
   * Generate Minecraft blocks data from processed image
   */
  async generateBlockData() {
    try {
      const { data, info } = await sharp(config.image.tempFiles.processed)
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const blocks = [];
      const { width, height } = info;
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 3; // RGB = 3 bytes per pixel
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          const woolColor = this.findClosestWoolColor(r, g, b);
          
          // Calculate Minecraft coordinates
          const mcX = config.coordinates.profileImage.corner.x + (width - 1 - x);
          const mcY = config.coordinates.profileImage.corner.y;
          const mcZ = config.coordinates.profileImage.corner.z - y; // Flip Y axis for Minecraft
          
          blocks.push({
            x: mcX,
            y: mcY,
            z: mcZ,
            block: woolColor,
            coordinates: `${mcX} ${mcY} ${mcZ}`
          });
        }
      }
      
      Logger.success(`Generated ${blocks.length} block placements`);
      return blocks;
    } catch (error) {
      Logger.error('Failed to generate block data', error);
      throw error;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    try {
      await fs.unlink(config.image.tempFiles.original).catch(() => {});
      await fs.unlink(config.image.tempFiles.processed).catch(() => {});
      Logger.debug('Temporary files cleaned up');
    } catch (error) {
      Logger.warn('Failed to cleanup temporary files', error);
    }
  }

  /**
   * Clear the color cache
   */
  clearCache() {
    this.colorCache.clear();
    Logger.debug('Color cache cleared');
  }
}

module.exports = ImageProcessor;