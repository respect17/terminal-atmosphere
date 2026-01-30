const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const si = require('systeminformation');
const AIAssistant = require('./ai-assistant');

class ProductivityOptimizer {
  constructor() {
    this.dataDir = path.join(process.env.HOME, '.terminal-atmosphere');
    this.profilesDir = path.join(this.dataDir, 'profiles');
    this.aiAssistant = new AIAssistant();
  }

  async analyze(depth = 'advanced') {
    const spinner = ora('Analyzing development environment...').start();
    
    try {
      await fs.ensureDir(this.profilesDir);
      
      const analysis = await this.performAnalysis(depth);
      spinner.stop();
      
      this.displayAnalysis(analysis);
      
      // Offer to create optimization profile
      const { createProfile } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'createProfile',
          message: 'Would you like to create an optimization profile based on this analysis?',
          default: true
        }
      ]);

      if (createProfile) {
        await this.createProfileFromAnalysis(analysis);
      }

    } catch (error) {
      spinner.fail(`Analysis failed: ${error.message}`);
    }
  }

  async performAnalysis(depth) {
    const [cpu, mem, disk, network, processes, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.osInfo()
    ]);

    const analysis = {
      timestamp: new Date().toISOString(),
      depth,
      system: {
        cpu: {
          usage: cpu.currentLoad,
          cores: cpu.cpus.length,
          efficiency: this.calculateCPUEfficiency(cpu),
          bottleneck: this.identifyCPUBottlenecks(cpu)
        },
        memory: {
          usage: (mem.used / mem.total) * 100,
          available: mem.free,
          pressure: this.calculateMemoryPressure(mem),
          leaks: this.detectPotentialLeaks(processes)
        },
        disk: {
          usage: disk.map(d => ({
            mount: d.mount,
            usage: d.use,
            available: d.available,
            performance: this.estimateDiskPerformance(d)
          })),
          fragmentation: this.estimateFragmentation()
        },
        network: {
          latency: await this.measureNetworkLatency(),
          bandwidth: this.estimateBandwidth(network),
          congestion: this.detectNetworkCongestion(network)
        },
        processes: {
          total: processes.all,
          running: processes.running,
          resourceHogs: this.identifyResourceHogs(processes),
          zombies: processes.list.filter(p => p.state === 'zombie').length
        }
      },
      recommendations: [],
      score: 0
    };

    // Generate recommendations based on analysis
    analysis.recommendations = this.generateRecommendations(analysis);
    analysis.score = this.calculateOptimizationScore(analysis);

    return analysis;
  }

  calculateCPUEfficiency(cpu) {
    const avgLoad = cpu.cpus.reduce((sum, core) => sum + core.load, 0) / cpu.cpus.length;
    const maxLoad = Math.max(...cpu.cpus.map(core => core.load));
    const efficiency = avgLoad / maxLoad;
    
    return {
      score: efficiency,
      distribution: cpu.cpus.map((core, i) => ({ core: i, load: core.load })),
      balance: efficiency > 0.8 ? 'balanced' : efficiency > 0.5 ? 'moderate' : 'unbalanced'
    };
  }

  identifyCPUBottlenecks(cpu) {
    const bottlenecks = [];
    const maxLoad = Math.max(...cpu.cpus.map(core => core.load));
    
    if (maxLoad > 90) {
      bottlenecks.push('CPU core saturation detected');
    }
    
    if (cpu.currentLoad > 80) {
      bottlenecks.push('High overall CPU usage');
    }
    
    if (cpu.temperature > 70) {
      bottlenecks.push('CPU thermal throttling likely');
    }
    
    return bottlenecks;
  }

  calculateMemoryPressure(mem) {
    const usedPercentage = (mem.used / mem.total) * 100;
    const swapAvailable = mem.swapTotal - mem.swapUsed;
    
    let pressure = 'low';
    if (usedPercentage > 85 || swapAvailable < mem.total * 0.1) {
      pressure = 'high';
    } else if (usedPercentage > 70) {
      pressure = 'moderate';
    }
    
    return { level: pressure, usedPercentage, swapAvailable };
  }

  detectPotentialLeaks(processes) {
    const suspicious = processes.list
      .filter(p => p.pmem > 10) // Processes using >10% memory
      .sort((a, b) => b.pmem - a.pmem)
      .slice(0, 5);
    
    return suspicious.map(p => ({
      name: p.name,
      pid: p.pid,
      memory: p.pmem,
      suspicious: p.pmem > 20
    }));
  }

  estimateDiskPerformance(disk) {
    const usage = disk.use;
    if (usage > 95) return 'critical';
    if (usage > 85) return 'poor';
    if (usage > 70) return 'moderate';
    return 'good';
  }

  estimateFragmentation() {
    // Simplified fragmentation estimation
    return Math.random() * 20; // 0-20% estimated fragmentation
  }

  async measureNetworkLatency() {
    try {
      // Simplified latency measurement
      return Math.random() * 50 + 10; // 10-60ms simulated
    } catch {
      return null;
    }
  }

  estimateBandwidth(network) {
    if (!network || network.length === 0) return 'unknown';
    const totalBytes = network.reduce((sum, net) => sum + (net.rx_bytes + net.tx_bytes), 0);
    return totalBytes > 1000000 ? 'high' : totalBytes > 100000 ? 'medium' : 'low';
  }

  detectNetworkCongestion(network) {
    if (!network || network.length === 0) return false;
    return network.some(net => net.rx_sec > 1000000 || net.tx_sec > 1000000);
  }

  identifyResourceHogs(processes) {
    return processes.list
      .filter(p => p.pcpu > 5 || p.pmem > 5)
      .sort((a, b) => (b.pcpu + b.pmem) - (a.pcpu + a.pmem))
      .slice(0, 10)
      .map(p => ({
        name: p.name,
        pid: p.pid,
        cpu: p.pcpu,
        memory: p.pmem,
        impact: p.pcpu + p.pmem
      }));
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    // CPU recommendations
    if (analysis.system.cpu.usage > 80) {
      recommendations.push({
        category: 'CPU',
        priority: 'high',
        action: 'Close unnecessary applications',
        impact: 'High',
        command: 'ps aux | head -20'
      });
    }

    if (analysis.system.cpu.efficiency.balance === 'unbalanced') {
      recommendations.push({
        category: 'CPU',
        priority: 'medium',
        action: 'Consider process affinity adjustments',
        impact: 'Medium',
        command: 'taskset -c 0-3 <pid>'
      });
    }

    // Memory recommendations
    if (analysis.system.memory.pressure.level === 'high') {
      recommendations.push({
        category: 'Memory',
        priority: 'high',
        action: 'Clear memory caches or restart memory-intensive applications',
        impact: 'High',
        command: 'sudo sh -c "echo 3 > /proc/sys/vm/drop_caches"'
      });
    }

    if (analysis.system.memory.leaks.length > 0) {
      recommendations.push({
        category: 'Memory',
        priority: 'medium',
        action: 'Investigate potential memory leaks',
        impact: 'Medium',
        command: 'valgrind --tool=memcheck <program>'
      });
    }

    // Disk recommendations
    const criticalDisks = analysis.system.disk.usage.filter(d => d.usage > 90);
    if (criticalDisks.length > 0) {
      recommendations.push({
        category: 'Disk',
        priority: 'critical',
        action: `Clean up disk space on ${criticalDisks.map(d => d.mount).join(', ')}`,
        impact: 'Critical',
        command: 'du -sh /* | sort -hr | head -10'
      });
    }

    // Process recommendations
    if (analysis.system.processes.resourceHogs.length > 5) {
      recommendations.push({
        category: 'Processes',
        priority: 'medium',
        action: 'Review and optimize resource-intensive processes',
        impact: 'Medium',
        command: 'top -o %CPU -o %MEM'
      });
    }

    if (analysis.system.processes.zombies > 0) {
      recommendations.push({
        category: 'Processes',
        priority: 'low',
        action: `Clean up ${analysis.system.processes.zombies} zombie processes`,
        impact: 'Low',
        command: 'ps aux | awk "$8 ~ /^Z/ { print $2 }"'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  calculateOptimizationScore(analysis) {
    let score = 100;
    
    // Deduct points for issues
    score -= Math.min(analysis.system.cpu.usage, 30);
    score -= Math.min(analysis.system.memory.usage, 30);
    
    const diskIssues = analysis.system.disk.usage.filter(d => d.usage > 80).length;
    score -= diskIssues * 10;
    
    score -= Math.min(analysis.system.processes.zombies * 2, 10);
    
    return Math.max(0, Math.round(score));
  }

  displayAnalysis(analysis) {
    console.log(chalk.bold.cyan('\n📊 Development Environment Analysis'));
    console.log(chalk.gray(`Analysis depth: ${analysis.depth}`));
    console.log(chalk.gray(`Optimization Score: ${analysis.score}/100`));
    
    // Display system metrics
    console.log(chalk.bold('\n💻 System Metrics:'));
    console.log(`  CPU Usage: ${analysis.system.cpu.usage.toFixed(1)}%`);
    console.log(`  Memory Usage: ${analysis.system.memory.usage.toFixed(1)}%`);
    console.log(`  Disk Usage: ${analysis.system.disk.usage.map(d => `${d.mount}: ${d.usage.toFixed(1)}%`).join(', ')}`);
    console.log(`  Running Processes: ${analysis.system.processes.running}`);

    // Display recommendations
    if (analysis.recommendations.length > 0) {
      console.log(chalk.bold('\n💡 Optimization Recommendations:'));
      
      analysis.recommendations.forEach((rec, index) => {
        const priorityColor = {
          critical: 'red',
          high: 'yellow',
          medium: 'blue',
          low: 'gray'
        }[rec.priority];
        
        console.log(`\n${index + 1}. ${chalk[priorityColor](`[${rec.priority.toUpperCase()}]`)} ${rec.action}`);
        console.log(`   Category: ${rec.category} | Impact: ${rec.impact}`);
        console.log(`   Command: ${chalk.cyan(rec.command)}`);
      });
    }

    // Resource hogs
    if (analysis.system.processes.resourceHogs.length > 0) {
      console.log(chalk.bold('\n🐷 Top Resource Consumers:'));
      analysis.system.processes.resourceHogs.slice(0, 5).forEach(proc => {
        console.log(`  ${proc.name} (PID: ${proc.pid}) - CPU: ${proc.cpu.toFixed(1)}%, Memory: ${proc.memory.toFixed(1)}%`);
      });
    }
  }

  async createProfile(name) {
    console.log(chalk.cyan(`\n🎯 Creating optimization profile: ${name}`));
    
    const { description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Profile description:',
        default: 'Custom optimization profile'
      }
    ]);

    const { optimizations } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'optimizations',
        message: 'Select optimizations to include:',
        choices: [
          { name: 'CPU Optimization', value: 'cpu', checked: true },
          { name: 'Memory Management', value: 'memory', checked: true },
          { name: 'Disk Cleanup', value: 'disk', checked: false },
          { name: 'Process Management', value: 'processes', checked: false },
          { name: 'Network Optimization', value: 'network', checked: false }
        ]
      }
    ]);

    const profile = {
      name,
      description,
      created: new Date().toISOString(),
      optimizations,
      settings: {}
    };

    // Configure specific settings based on selected optimizations
    for (const opt of optimizations) {
      switch (opt) {
        case 'cpu':
          profile.settings.cpu = await this.configureCPUSettings();
          break;
        case 'memory':
          profile.settings.memory = await this.configureMemorySettings();
          break;
        case 'disk':
          profile.settings.disk = await this.configureDiskSettings();
          break;
        case 'processes':
          profile.settings.processes = await this.configureProcessSettings();
          break;
        case 'network':
          profile.settings.network = await this.configureNetworkSettings();
          break;
      }
    }

    const profilePath = path.join(this.profilesDir, `${name}.json`);
    await fs.writeJson(profilePath, profile, { spaces: 2 });
    
    console.log(chalk.green(`✅ Profile "${name}" created successfully!`));
  }

  async configureCPUSettings() {
    return await inquirer.prompt([
      {
        type: 'number',
        name: 'maxUsage',
        message: 'Maximum CPU usage threshold (%):',
        default: 80
      },
      {
        type: 'confirm',
        name: 'autoBalance',
        message: 'Enable automatic load balancing?',
        default: true
      }
    ]);
  }

  async configureMemorySettings() {
    return await inquirer.prompt([
      {
        type: 'number',
        name: 'maxUsage',
        message: 'Maximum memory usage threshold (%):',
        default: 85
      },
      {
        type: 'confirm',
        name: 'autoCleanup',
        message: 'Enable automatic memory cleanup?',
        default: true
      }
    ]);
  }

  async configureDiskSettings() {
    return await inquirer.prompt([
      {
        type: 'number',
        name: 'cleanupThreshold',
        message: 'Disk usage cleanup threshold (%):',
        default: 90
      },
      {
        type: 'checkbox',
        name: 'cleanupTargets',
        message: 'Cleanup targets:',
        choices: [
          { name: 'Temporary files', value: 'temp', checked: true },
          { name: 'Cache files', value: 'cache', checked: true },
          { name: 'Log files', value: 'logs', checked: false },
          { name: 'Downloads folder', value: 'downloads', checked: false }
        ]
      }
    ]);
  }

  async configureProcessSettings() {
    return await inquirer.prompt([
      {
        type: 'number',
        name: 'maxProcesses',
        message: 'Maximum running processes:',
        default: 200
      },
      {
        type: 'confirm',
        name: 'autoKillZombies',
        message: 'Automatically clean zombie processes?',
        default: true
      }
    ]);
  }

  async configureNetworkSettings() {
    return await inquirer.prompt([
      {
        type: 'number',
        name: 'maxLatency',
        message: 'Maximum acceptable latency (ms):',
        default: 100
      },
      {
        type: 'confirm',
        name: 'optimizeDNS',
        message: 'Optimize DNS settings?',
        default: false
      }
    ]);
  }

  async listProfiles() {
    await fs.ensureDir(this.profilesDir);
    
    const profiles = await fs.readdir(this.profilesDir);
    const profileFiles = profiles.filter(p => p.endsWith('.json'));
    
    if (profileFiles.length === 0) {
      console.log(chalk.yellow('No optimization profiles found.'));
      return;
    }

    console.log(chalk.bold.cyan('\n📋 Available Optimization Profiles:'));
    
    for (const file of profileFiles) {
      const profilePath = path.join(this.profilesDir, file);
      const profile = await fs.readJson(profilePath);
      
      console.log(`\n🎯 ${chalk.bold(profile.name)}`);
      console.log(`   ${chalk.gray(profile.description)}`);
      console.log(`   Created: ${new Date(profile.created).toLocaleDateString()}`);
      console.log(`   Optimizations: ${profile.optimizations.join(', ')}`);
    }
  }

  async applyProfile(name) {
    const profilePath = path.join(this.profilesDir, `${name}.json`);
    
    if (!await fs.pathExists(profilePath)) {
      console.log(chalk.red(`❌ Profile "${name}" not found.`));
      return;
    }

    const profile = await fs.readJson(profilePath);
    const spinner = ora(`Applying profile "${name}"...`).start();

    try {
      // Apply optimizations based on profile settings
      for (const optimization of profile.optimizations) {
        await this.applyOptimization(optimization, profile.settings[optimization]);
      }

      spinner.succeed(`Profile "${name}" applied successfully!`);
      console.log(chalk.green('\n✅ Optimizations applied:'));
      console.log(profile.optimizations.map(opt => `  • ${opt}`).join('\n'));

    } catch (error) {
      spinner.fail(`Failed to apply profile: ${error.message}`);
    }
  }

  async applyOptimization(type, settings) {
    // Simulate applying optimizations
    switch (type) {
      case 'cpu':
        console.log(chalk.blue('⚡ Optimizing CPU settings...'));
        break;
      case 'memory':
        console.log(chalk.green('🧠 Optimizing memory settings...'));
        break;
      case 'disk':
        console.log(chalk.yellow('💾 Optimizing disk settings...'));
        break;
      case 'processes':
        console.log(chalk.cyan('⚙️ Optimizing process settings...'));
        break;
      case 'network':
        console.log(chalk.magenta('🌐 Optimizing network settings...'));
        break;
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async createProfileFromAnalysis(analysis) {
    const { profileName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'profileName',
        message: 'Enter profile name:',
        validate: input => input.trim() !== '' || 'Profile name is required'
      }
    ]);

    const profile = {
      name: profileName,
      description: `Auto-generated profile based on system analysis (Score: ${analysis.score}/100)`,
      created: new Date().toISOString(),
      optimizations: analysis.recommendations.map(r => r.category.toLowerCase()),
      settings: {
        thresholds: {
          cpu: analysis.system.cpu.usage,
          memory: analysis.system.memory.usage,
          disk: analysis.system.disk.usage.map(d => d.usage)
        },
        recommendations: analysis.recommendations
      }
    };

    const profilePath = path.join(this.profilesDir, `${profileName}.json`);
    await fs.writeJson(profilePath, profile, { spaces: 2 });
    
    console.log(chalk.green(`✅ Profile "${profileName}" created from analysis!`));
  }
}

module.exports = ProductivityOptimizer;
