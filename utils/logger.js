const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class Logger {
  static info(message) {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${new Date().toISOString()} - ${message}`);
  }

  static success(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${new Date().toISOString()} - ${message}`);
  }

  static warn(message) {
    console.log(`${colors.yellow}[WARN]${colors.reset} ${new Date().toISOString()} - ${message}`);
  }

  static error(message, error = null) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.log(`${colors.red}${error.stack}${colors.reset}`);
    }
  }

  static debug(message) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.magenta}[DEBUG]${colors.reset} ${new Date().toISOString()} - ${message}`);
    }
  }
}

module.exports = Logger;