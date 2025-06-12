const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');

class HardwareService {
  constructor() {
    this.execPromise = util.promisify(exec);
  }

  // Get hardware information
  async getHardwareInfo() {
    try {
      // Get temperature and fan speed using AWK
      const { stdout: tempFanOutput } = await this.execPromise(`sensors | awk '
        /temp1/ {
            gsub(/[+°C]/, "", $2);
            temps[++count] = $2
        }
        /fan1/ {
            gsub(/RPM/, "", $3);
            rpm = $2
        }
        END {
            avg = (temps[1] + temps[2]) / 2;
            printf "%.1f|%d", avg, rpm
        }'`);

      // Split the output into temperature and fan speed
      const [temp, fan] = tempFanOutput.split('|').map(Number);

      // Get uptime
      const { stdout: uptimeOutput } = await this.execPromise('uptime -p');
      const uptime = uptimeOutput.trim().replace('up ', '');

      return {
        temperature: {
          value: temp,
          color: this.getTemperatureColor(temp)
        },
        fanSpeed: {
          value: fan,
          color: this.getFanSpeedColor(fan)
        },
        uptime: uptime
      };
    } catch (error) {
      logger.error('Error getting hardware information:', error);
      throw error;
    }
  }

  // Determine temperature color
  getTemperatureColor(temp) {
    if (temp > 70) return 'red';
    if (temp >= 40) return 'green';
    return 'blue';
  }

  // Determine fan speed color
  getFanSpeedColor(fan) {
    if (fan > 3000) return 'red';
    if (fan >= 1500) return 'green';
    return 'blue';
  }
}

module.exports = new HardwareService();
