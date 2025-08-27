module.exports = {
  // WebSocket server configuration
  port: 3000,
  
  // Command configuration
  commandPrefix: '!',
  
  // Rate limiting
  commandDelay: 50, // ms between commands
  batchDelay: 100,  // ms between batched commands
  
  // Minecraft coordinates
  coordinates: {
    // Subscriber counter display area
    subscriberDisplay: {
      start: { x: 1, y: -60, z: 42 },
      digitSpacing: 4
    },
    
    // Pre-built digit templates (clone source coordinates)
    digitTemplates: {
      '0': { from: '-34 -64 46', to: '-36 -64 42' },
      '1': { from: '2 -64 46', to: '0 -64 42' },
      '2': { from: '-2 -64 46', to: '-4 -64 42' },
      '3': { from: '-6 -64 46', to: '-8 -64 42' },
      '4': { from: '-10 -64 46', to: '-12 -64 42' },
      '5': { from: '-14 -64 46', to: '-16 -64 42' },
      '6': { from: '-18 -64 46', to: '-20 -64 42' },
      '7': { from: '-22 -64 46', to: '-24 -64 42' },
      '8': { from: '-26 -64 46', to: '-28 -64 42' },
      '9': { from: '-30 -64 46', to: '-32 -64 42' }
    },
    
    // Profile image display area
    profileImage: {
      corner: { x: -31, y: -60, z: 82 },
      width: 35,
      height: 35
    },
    
    // Clear areas
    clearAreas: [
      { from: '3 -60 42', to: '-31 -60 46' },  // Subscriber display
      { from: '-31 -60 82', to: '3 -59 48' }   // Profile image area
    ]
  },
  
  // Image processing
  image: {
    width: 35,
    height: 35,
    tempFiles: {
      original: './temp_original.png',
      processed: './temp_processed.png'
    }
  },
  
  // API endpoints
  api: {
    youtubeCounter: 'https://mixerno.space/api/youtube-channel-counter/user/'
  }
};