const si = require('systeminformation');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const boxen = require('boxen');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');

class EnvironmentMonitor {
  constructor(options = {}) {
    this.options = options;
    this.isMonitoring = false;
    this.history = [];
    this.maxHistory = 100;
    this.dataDir = path.join(process.env.HOME, '.terminal-atmosphere');
    this.historyFile = path.join(this.dataDir, 'history.json');
  }

  async start() {
    console.log(chalk.cyan('🌍 Starting Terminal Atmosphere Monitor...'));
    
    await fs.ensureDir(this.dataDir);
    await this.loadHistory();

    this.isMonitoring = true;
    const spinner = ora('Monitoring system environment').start();
    
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        spinner.stop();
        return;
      }

      try {
        const data = await this.collectMetrics();
        this.addToHistory(data);
        await this.saveHistory();
        
        spinner.text = this.getStatusText(data);
        
        if (this.options.verbose) {
          spinner.stop();
          this.displayMetrics(data);
          spinner.start();
        }

        // Check for alerts
        this.checkAlerts(data);
        
      } catch (error) {
        spinner.fail(`Error: ${error.message}`);
      }
    }, this.options.interval * 1000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.isMonitoring = false;
      console.log(chalk.yellow('\n👋 Monitor stopped gracefully'));
      process.exit(0);
    });
  }

  async collectMetrics() {
    const [cpu, mem, osInfo, networkStats, diskLayout, processes] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.osInfo(),
      si.networkStats(),
      si.diskLayout(),
      si.processes()
    ]);

    return {
      timestamp: new Date().toISOString(),
      cpu: {
        usage: cpu.currentLoad,
        cores: cpu.cpus.map(core => core.load),
        temperature: cpu.temperature || 0
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percentage: (mem.used / mem.total) * 100
      },
      network: {
        rx: networkStats[0]?.rx_bytes || 0,
        tx: networkStats[0]?.tx_bytes || 0,
        interface: networkStats[0]?.iface || 'unknown'
      },
      disk: {
        layout: diskLayout,
        usage: await this.getDiskUsage()
      },
      processes: {
        running: processes.running,
        blocked: processes.blocked,
        sleeping: processes.sleeping,
        total: processes.all
      },
      environment: {
        node_version: process.version,
        platform: osInfo.platform,
        arch: osInfo.arch,
        uptime: osInfo.uptime
      }
    };
  }

  async getDiskUsage() {
    const fsSize = await si.fsSize();
    return fsSize.map(fs => ({
      fs: fs.fs,
      type: fs.type,
      size: fs.size,
      used: fs.used,
      available: fs.available,
      use: fs.use
    }));
  }

  getStatusText(data) {
    const cpuStatus = data.cpu.usage > 80 ? '🔥' : data.cpu.usage > 50 ? '⚡' : '😌';
    const memStatus = data.memory.percentage > 80 ? '🔥' : data.memory.percentage > 50 ? '⚡' : '😌';
    
    return `${cpuStatus} CPU: ${data.cpu.usage.toFixed(1)}% | ${memStatus} RAM: ${data.memory.percentage.toFixed(1)}% | 📊 Processes: ${data.processes.running}`;
  }

  displayMetrics(data) {
    console.clear();
    
    const header = boxen(
      chalk.bold.cyan('🌍 Terminal Atmosphere - Real-time Monitor'),
      { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
    );
    console.log(header);

    // CPU Table
    const cpuTable = new Table({
      head: [chalk.blue('CPU Metric'), chalk.blue('Value')],
      colWidths: [20, 15]
    });
    cpuTable.push(
      ['Usage', `${data.cpu.usage.toFixed(1)}%`],
      ['Cores Active', data.cpu.cores.filter(c => c > 0).length],
      ['Temperature', `${data.cpu.temperature}°C`]
    );

    // Memory Table
    const memTable = new Table({
      head: [chalk.green('Memory Metric'), chalk.green('Value')],
      colWidths: [20, 15]
    });
    memTable.push(
      ['Used', `${(data.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB`],
      ['Total', `${(data.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`],
      ['Percentage', `${data.memory.percentage.toFixed(1)}%`]
    );

    // Network Table
    const netTable = new Table({
      head: [chalk.yellow('Network Metric'), chalk.yellow('Value')],
      colWidths: [20, 15]
    });
    netTable.push(
      ['Interface', data.network.interface],
      ['Download', `${(data.network.rx / 1024 / 1024).toFixed(2)} MB`],
      ['Upload', `${(data.network.tx / 1024 / 1024).toFixed(2)} MB`]
    );

    console.log(chalk.bold('\n💻 CPU Performance:'));
    console.log(cpuTable.toString());
    
    console.log(chalk.bold('\n🧠 Memory Usage:'));
    console.log(memTable.toString());
    
    console.log(chalk.bold('\n🌐 Network Activity:'));
    console.log(netTable.toString());

    console.log(chalk.gray(`\n📅 Last updated: ${new Date(data.timestamp).toLocaleString()}`));
  }

  checkAlerts(data) {
    const alerts = [];

    if (data.cpu.usage > 90) {
      alerts.push({ type: 'critical', message: 'CPU usage critically high!' });
    } else if (data.cpu.usage > 75) {
      alerts.push({ type: 'warning', message: 'CPU usage elevated' });
    }

    if (data.memory.percentage > 90) {
      alerts.push({ type: 'critical', message: 'Memory usage critically high!' });
    } else if (data.memory.percentage > 75) {
      alerts.push({ type: 'warning', message: 'Memory usage elevated' });
    }

    if (data.processes.running > 200) {
      alerts.push({ type: 'info', message: 'High number of running processes' });
    }

    alerts.forEach(alert => {
      const color = alert.type === 'critical' ? 'red' : alert.type === 'warning' ? 'yellow' : 'blue';
      console.log(chalk[color](`\n⚠️  ${alert.message}`));
    });
  }

  async weatherReport(forecast = false) {
    const spinner = ora('Generating weather report...').start();
    
    try {
      const current = await this.collectMetrics();
      spinner.stop();

      console.log(boxen(
        chalk.bold.cyan('🌤️  Development Weather Report'),
        { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
      ));

      const weather = this.determineWeather(current);
      console.log(`\n${weather.icon} Current Conditions: ${weather.condition}`);
      console.log(chalk.gray(weather.description));

      if (forecast && this.history.length > 10) {
        console.log(chalk.bold('\n🔮 1-Hour Forecast:'));
        const forecastData = this.generateForecast();
        console.log(forecastData);
      }

      console.log(chalk.bold('\n📊 Quick Stats:'));
      console.log(`  Temperature: ${this.getTemperature(current.cpu.usage)}`);
      console.log(`  Humidity: ${this.getHumidity(current.memory.percentage)}`);
      console.log(`  Wind Speed: ${this.getWindSpeed(current.processes.running)}`);
      console.log(`  Visibility: ${this.getVisibility(current.disk.usage)}`);

    } catch (error) {
      spinner.fail(`Error generating weather report: ${error.message}`);
    }
  }

  determineWeather(data) {
    const cpuScore = data.cpu.usage;
    const memScore = data.memory.percentage;
    const processScore = Math.min(data.processes.running / 200, 1);
    
    const overallScore = (cpuScore + memScore + (processScore * 100)) / 3;

    if (overallScore > 80) {
      return {
        icon: '🌩️',
        condition: 'Stormy',
        description: 'System under heavy load. Consider closing resource-intensive applications.'
      };
    } else if (overallScore > 60) {
      return {
        icon: '🌧️',
        condition: 'Rainy',
        description: 'Moderate load. Some optimization may be beneficial.'
      };
    } else if (overallScore > 40) {
      return {
        icon: '⛅',
        condition: 'Cloudy',
        description: 'Light load. System running normally.'
      };
    } else if (overallScore > 20) {
      return {
        icon: '🌤️',
        condition: 'Partly Sunny',
        description: 'Good conditions. System running smoothly.'
      };
    } else {
      return {
        icon: '☀️',
        condition: 'Sunny',
        description: 'Excellent conditions. Optimal performance!'
      };
    }
  }

  getTemperature(cpuUsage) {
    if (cpuUsage > 80) return '🔥 Hot';
    if (cpuUsage > 60) return '🌡️ Warm';
    if (cpuUsage > 40) return '🌤️ Mild';
    return '❄️ Cool';
  }

  getHumidity(memUsage) {
    if (memUsage > 80) return '💧 Very Humid';
    if (memUsage > 60) return '🌫️ Humid';
    if (memUsage > 40) return '🌤️ Moderate';
    return '🏜️ Dry';
  }

  getWindSpeed(processes) {
    if (processes > 150) return '🌪️ Hurricane';
    if (processes > 100) return '💨 Strong Wind';
    if (processes > 50) return '🍃 Breeze';
    return '🍂 Calm';
  }

  getVisibility(diskUsage) {
    const avgUsage = diskUsage.reduce((sum, disk) => sum + disk.use, 0) / diskUsage.length;
    if (avgUsage > 90) return '🌫️ Foggy';
    if (avgUsage > 75) return '☁️ Cloudy';
    if (avgUsage > 50) return '🌤️ Hazy';
    return '☀️ Clear';
  }

  generateForecast() {
    const recent = this.history.slice(-10);
    const trends = this.calculateTrends(recent);
    
    let forecast = 'Conditions expected to remain ';
    if (trends.cpu > 5) forecast += 'intense with potential storms';
    else if (trends.cpu < -5) forecast += 'calm and clear';
    else forecast += 'stable';
    
    return forecast;
  }

  calculateTrends(data) {
    if (data.length < 2) return { cpu: 0, memory: 0 };
    
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    return {
      cpu: latest.cpu.usage - previous.cpu.usage,
      memory: latest.memory.percentage - previous.memory.percentage
    };
  }

  addToHistory(data) {
    this.history.push(data);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  async loadHistory() {
    try {
      if (await fs.pathExists(this.historyFile)) {
        this.history = await fs.readJson(this.historyFile);
      }
    } catch (error) {
      console.warn('Could not load history:', error.message);
    }
  }

  async saveHistory() {
    try {
      await fs.writeJson(this.historyFile, this.history, { spaces: 2 });
    } catch (error) {
      console.warn('Could not save history:', error.message);
    }
  }
}

module.exports = EnvironmentMonitor;
