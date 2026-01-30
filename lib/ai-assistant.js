const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const si = require('systeminformation');
const { spawn } = require('child_process');

class AIAssistant {
  constructor() {
    this.dataDir = path.join(process.env.HOME, '.terminal-atmosphere');
    this.contextFile = path.join(this.dataDir, 'context.json');
    this.suggestionsFile = path.join(this.dataDir, 'suggestions.json');
  }

  async optimize(focusArea = 'all') {
    console.log(chalk.cyan('🤖 AI Assistant analyzing your development environment...'));
    
    const spinner = ora('Gathering system intelligence...').start();
    
    try {
      const systemData = await this.gatherSystemData();
      const context = await this.loadContext();
      const analysis = await this.performAIAnalysis(systemData, context, focusArea);
      
      spinner.stop();
      
      await this.displayOptimizations(analysis);
      await this.saveContext(analysis);
      
      // Ask if user wants to apply suggestions
      const { applySuggestions } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'applySuggestions',
          message: 'Would you like to apply these AI suggestions?',
          default: false
        }
      ]);

      if (applySuggestions) {
        await this.applySuggestions(analysis.suggestions);
      }

    } catch (error) {
      spinner.fail(`AI analysis failed: ${error.message}`);
    }
  }

  async gatherSystemData() {
    const [cpu, mem, disk, network, processes, osInfo, graphics] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.osInfo(),
      si.graphics()
    ]);

    return {
      timestamp: new Date().toISOString(),
      system: {
        cpu: {
          usage: cpu.currentLoad,
          cores: cpu.cpus.length,
          temperature: cpu.temperature || 0,
          loadAverage: osInfo.loadavg || []
        },
        memory: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          swapTotal: mem.swapTotal,
          swapUsed: mem.swapUsed
        },
        disk: disk.map(d => ({
          fs: d.fs,
          mount: d.mount,
          size: d.size,
          used: d.used,
          available: d.available,
          usage: d.use
        })),
        network: network.map(n => ({
          interface: n.iface,
          rx_bytes: n.rx_bytes,
          tx_bytes: n.tx_bytes,
          rx_sec: n.rx_sec,
          tx_sec: n.tx_sec
        })),
        processes: {
          running: processes.running,
          blocked: processes.blocked,
          sleeping: processes.sleeping,
          list: processes.list.slice(0, 20) // Top 20 processes
        },
        graphics: graphics.controllers || [],
        os: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
          uptime: osInfo.uptime
        }
      },
      environment: {
        node_version: process.version,
        shell: process.env.SHELL,
        term: process.env.TERM,
        user: process.env.USER,
        home: process.env.HOME,
        pwd: process.cwd()
      }
    };
  }

  async loadContext() {
    try {
      if (await fs.pathExists(this.contextFile)) {
        return await fs.readJson(this.contextFile);
      }
    } catch (error) {
      console.warn('Could not load context:', error.message);
    }
    return { history: [], patterns: [], preferences: {} };
  }

  async performAIAnalysis(systemData, context, focusArea) {
    const analysis = {
      timestamp: systemData.timestamp,
      focusArea,
      insights: [],
      suggestions: [],
      predictions: [],
      patterns: this.identifyPatterns(systemData, context),
      score: 0
    };

    // Analyze based on focus area
    switch (focusArea) {
      case 'cpu':
        analysis.insights.push(...this.analyzeCPU(systemData.system.cpu));
        break;
      case 'memory':
        analysis.insights.push(...this.analyzeMemory(systemData.system.memory));
        break;
      case 'network':
        analysis.insights.push(...this.analyzeNetwork(systemData.system.network));
        break;
      case 'productivity':
        analysis.insights.push(...this.analyzeProductivity(systemData, context));
        break;
      case 'all':
      default:
        analysis.insights.push(
          ...this.analyzeCPU(systemData.system.cpu),
          ...this.analyzeMemory(systemData.system.memory),
          ...this.analyzeNetwork(systemData.system.network),
          ...this.analyzeProductivity(systemData, context)
        );
    }

    // Generate suggestions based on insights
    analysis.suggestions = this.generateSuggestions(analysis.insights, systemData);
    
    // Make predictions
    analysis.predictions = this.makePredictions(systemData, context);
    
    // Calculate optimization score
    analysis.score = this.calculateAIScore(analysis);

    return analysis;
  }

  analyzeCPU(cpu) {
    const insights = [];

    if (cpu.usage > 80) {
      insights.push({
        type: 'warning',
        category: 'cpu',
        message: 'CPU usage is critically high',
        severity: 'high',
        data: { usage: cpu.usage }
      });
    }

    if (cpu.temperature > 70) {
      insights.push({
        type: 'thermal',
        category: 'cpu',
        message: 'CPU temperature elevated - thermal throttling likely',
        severity: 'medium',
        data: { temperature: cpu.temperature }
      });
    }

    if (cpu.cores > 4 && cpu.usage > 60) {
      insights.push({
        type: 'optimization',
        category: 'cpu',
        message: 'Consider process affinity optimization for better core utilization',
        severity: 'low',
        data: { cores: cpu.cores, usage: cpu.usage }
      });
    }

    return insights;
  }

  analyzeMemory(memory) {
    const insights = [];

    const usagePercentage = (memory.used / memory.total) * 100;
    
    if (usagePercentage > 85) {
      insights.push({
        type: 'critical',
        category: 'memory',
        message: 'Memory usage critically high - system may become unstable',
        severity: 'high',
        data: { usage: usagePercentage }
      });
    }

    if (memory.swapUsed > memory.swapTotal * 0.5) {
      insights.push({
        type: 'performance',
        category: 'memory',
        message: 'High swap usage detected - performance degradation likely',
        severity: 'medium',
        data: { swapUsage: (memory.swapUsed / memory.swapTotal) * 100 }
      });
    }

    return insights;
  }

  analyzeNetwork(network) {
    const insights = [];

    const totalTraffic = network.reduce((sum, n) => sum + (n.rx_sec + n.tx_sec), 0);
    
    if (totalTraffic > 1000000) { // 1MB/s
      insights.push({
        type: 'bandwidth',
        category: 'network',
        message: 'High network traffic detected',
        severity: 'low',
        data: { traffic: totalTraffic }
      });
    }

    return insights;
  }

  analyzeProductivity(systemData, context) {
    const insights = [];

    // Analyze process patterns
    const devProcesses = systemData.system.processes.list.filter(p => 
      ['node', 'npm', 'yarn', 'git', 'code', 'vim', 'emacs'].includes(p.name.toLowerCase())
    );

    if (devProcesses.length === 0) {
      insights.push({
        type: 'productivity',
        category: 'development',
        message: 'No development tools detected - are you in a coding session?',
        severity: 'info',
        data: { devProcesses: devProcesses.length }
      });
    }

    // Check for distractions
    const distractionProcesses = systemData.system.processes.list.filter(p =>
      ['chrome', 'firefox', 'safari', 'slack', 'discord'].includes(p.name.toLowerCase())
    );

    if (distractionProcesses.length > 3) {
      insights.push({
        type: 'productivity',
        category: 'focus',
        message: 'Multiple potential distractions detected',
        severity: 'low',
        data: { distractions: distractionProcesses.length }
      });
    }

    return insights;
  }

  identifyPatterns(systemData, context) {
    const patterns = [];

    // Time-based patterns
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17) {
      patterns.push({
        type: 'time',
        name: 'work_hours',
        description: 'Currently during work hours - productivity optimization recommended'
      });
    }

    // Resource usage patterns
    if (systemData.system.cpu.usage > 70 && systemData.system.memory.used / systemData.system.memory.total > 70) {
      patterns.push({
        type: 'resource',
        name: 'high_load',
        description: 'Consistent high resource usage pattern detected'
      });
    }

    return patterns;
  }

  generateSuggestions(insights, systemData) {
    const suggestions = [];

    insights.forEach(insight => {
      switch (insight.type) {
        case 'warning':
        case 'critical':
          suggestions.push({
            category: insight.category,
            priority: 'high',
            action: this.getHighPriorityAction(insight),
            command: this.getOptimizationCommand(insight),
            impact: 'High',
            automated: true
          });
          break;
        case 'performance':
        case 'thermal':
          suggestions.push({
            category: insight.category,
            priority: 'medium',
            action: this.getMediumPriorityAction(insight),
            command: this.getOptimizationCommand(insight),
            impact: 'Medium',
            automated: false
          });
          break;
        case 'optimization':
        case 'productivity':
          suggestions.push({
            category: insight.category,
            priority: 'low',
            action: this.getLowPriorityAction(insight),
            command: this.getOptimizationCommand(insight),
            impact: 'Low',
            automated: false
          });
          break;
      }
    });

    // Add AI-powered smart suggestions
    suggestions.push(...this.getSmartSuggestions(systemData));

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  getHighPriorityAction(insight) {
    const actions = {
      cpu: 'Terminate CPU-intensive processes and enable cooling optimization',
      memory: 'Clear memory caches and restart memory-intensive applications',
      network: 'Optimize network settings and close bandwidth-heavy applications',
      disk: 'Immediate disk cleanup required'
    };
    return actions[insight.category] || 'System optimization required';
  }

  getMediumPriorityAction(insight) {
    const actions = {
      cpu: 'Adjust process priorities and optimize core distribution',
      memory: 'Monitor memory usage and consider application restart',
      network: 'Monitor network traffic and adjust Quality of Service settings',
      disk: 'Schedule disk cleanup and defragmentation'
    };
    return actions[insight.category] || 'Performance tuning recommended';
  }

  getLowPriorityAction(insight) {
    const actions = {
      cpu: 'Consider long-term CPU optimization strategies',
      memory: 'Implement memory monitoring and optimization routines',
      network: 'Set up network monitoring and optimization schedules',
      productivity: 'Optimize development environment for better focus'
    };
    return actions[insight.category] || 'General optimization suggested';
  }

  getOptimizationCommand(insight) {
    const commands = {
      cpu: 'ps aux --sort=-%cpu | head -10',
      memory: 'ps aux --sort=-%mem | head -10',
      network: 'netstat -i',
      disk: 'du -sh /* | sort -hr | head -10',
      productivity: 'ps aux | grep -E "(chrome|firefox|slack|discord)"'
    };
    return commands[insight.category] || 'top';
  }

  getSmartSuggestions(systemData) {
    const suggestions = [];

    // AI-powered contextual suggestions
    if (systemData.environment.pwd.includes('node_modules')) {
      suggestions.push({
        category: 'development',
        priority: 'medium',
        action: 'Node.js project detected - consider npm optimization',
        command: 'npm cache clean --force',
        impact: 'Medium',
        automated: false
      });
    }

    if (systemData.system.processes.running > 150) {
      suggestions.push({
        category: 'processes',
        priority: 'medium',
        action: 'High process count detected - consider process cleanup',
        command: 'ps aux | awk "$8 ~ /^Z/ { print $2 }" | xargs kill -9',
        impact: 'Medium',
        automated: true
      });
    }

    return suggestions;
  }

  makePredictions(systemData, context) {
    const predictions = [];

    // Predict system behavior based on current trends
    const cpuTrend = this.predictTrend(systemData.system.cpu.usage, context.history, 'cpu');
    const memTrend = this.predictTrend(
      (systemData.system.memory.used / systemData.system.memory.total) * 100,
      context.history,
      'memory'
    );

    if (cpuTrend.direction === 'increasing' && cpuTrend.rate > 5) {
      predictions.push({
        type: 'cpu',
        timeframe: '30 minutes',
        prediction: 'CPU usage likely to reach critical levels',
        confidence: cpuTrend.confidence
      });
    }

    if (memTrend.direction === 'increasing' && memTrend.rate > 3) {
      predictions.push({
        type: 'memory',
        timeframe: '1 hour',
        prediction: 'Memory pressure likely to increase significantly',
        confidence: memTrend.confidence
      });
    }

    return predictions;
  }

  predictTrend(currentValue, history, metric) {
    // Simplified trend prediction
    const recentHistory = history.slice(-5).filter(h => h[metric]);
    
    if (recentHistory.length < 2) {
      return { direction: 'stable', rate: 0, confidence: 0.3 };
    }

    const values = recentHistory.map(h => h[metric]);
    const trend = (values[values.length - 1] - values[0]) / values.length;
    
    return {
      direction: trend > 2 ? 'increasing' : trend < -2 ? 'decreasing' : 'stable',
      rate: Math.abs(trend),
      confidence: Math.min(0.9, 0.3 + (recentHistory.length * 0.1))
    };
  }

  calculateAIScore(analysis) {
    let score = 100;
    
    // Deduct points for issues
    analysis.insights.forEach(insight => {
      switch (insight.severity) {
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
        case 'info': score -= 2; break;
      }
    });

    // Add points for good patterns
    analysis.patterns.forEach(pattern => {
      if (pattern.type === 'time' && pattern.name === 'work_hours') score += 5;
    });

    return Math.max(0, Math.round(score));
  }

  async displayOptimizations(analysis) {
    console.log(chalk.bold.cyan('\n🤖 AI Assistant Analysis Results'));
    console.log(chalk.gray(`Focus Area: ${analysis.focusArea}`));
    console.log(chalk.gray(`Optimization Score: ${analysis.score}/100`));

    // Display insights
    if (analysis.insights.length > 0) {
      console.log(chalk.bold('\n🔍 System Insights:'));
      analysis.insights.forEach((insight, index) => {
        const severityColor = {
          high: 'red',
          medium: 'yellow',
          low: 'blue',
          info: 'gray'
        }[insight.severity];
        
        console.log(`\n${index + 1}. ${chalk[severityColor](`[${insight.severity.toUpperCase()}]`)} ${insight.message}`);
        console.log(`   Category: ${insight.category}`);
      });
    }

    // Display suggestions
    if (analysis.suggestions.length > 0) {
      console.log(chalk.bold('\n💡 AI-Powered Suggestions:'));
      
      analysis.suggestions.slice(0, 10).forEach((suggestion, index) => {
        const priorityColor = {
          high: 'red',
          medium: 'yellow',
          low: 'blue'
        }[suggestion.priority];
        
        console.log(`\n${index + 1}. ${chalk[priorityColor](`[${suggestion.priority.toUpperCase()}]`)} ${suggestion.action}`);
        console.log(`   Impact: ${suggestion.impact} | Automated: ${suggestion.automated ? 'Yes' : 'No'}`);
        console.log(`   Command: ${chalk.cyan(suggestion.command)}`);
      });
    }

    // Display predictions
    if (analysis.predictions.length > 0) {
      console.log(chalk.bold('\n🔮 Predictions:'));
      analysis.predictions.forEach(pred => {
        console.log(`\n• ${pred.prediction} (within ${pred.timeframe})`);
        console.log(`  Confidence: ${Math.round(pred.confidence * 100)}%`);
      });
    }

    // Display patterns
    if (analysis.patterns.length > 0) {
      console.log(chalk.bold('\n📊 Detected Patterns:'));
      analysis.patterns.forEach(pattern => {
        console.log(`• ${pattern.description}`);
      });
    }
  }

  async applySuggestions(suggestions) {
    const { selectedSuggestions } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedSuggestions',
        message: 'Select suggestions to apply:',
        choices: suggestions
          .filter(s => s.automated)
          .map(s => ({
            name: `${s.action} (${s.impact} impact)`,
            value: s,
            checked: s.priority === 'high'
          }))
      }
    ]);

    if (selectedSuggestions.length === 0) {
      console.log(chalk.yellow('No suggestions selected for application.'));
      return;
    }

    console.log(chalk.cyan('\n🚀 Applying AI suggestions...'));
    
    for (const suggestion of selectedSuggestions) {
      const spinner = ora(`Applying: ${suggestion.action}`).start();
      
      try {
        await this.executeCommand(suggestion.command);
        spinner.succeed(`Applied: ${suggestion.action}`);
      } catch (error) {
        spinner.fail(`Failed: ${suggestion.action} - ${error.message}`);
      }
    }

    console.log(chalk.green('\n✅ AI suggestions applied successfully!'));
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { stdio: 'pipe' });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on('error', reject);
    });
  }

  async saveContext(analysis) {
    try {
      await fs.ensureDir(this.dataDir);
      
      const context = await this.loadContext();
      context.history.push({
        timestamp: analysis.timestamp,
        score: analysis.score,
        insights: analysis.insights.length,
        suggestions: analysis.suggestions.length
      });

      // Keep only last 50 entries
      if (context.history.length > 50) {
        context.history = context.history.slice(-50);
      }

      // Update patterns
      context.patterns = analysis.patterns;

      await fs.writeJson(this.contextFile, context, { spaces: 2 });
      
      // Save suggestions for future reference
      await fs.writeJson(this.suggestionsFile, analysis.suggestions, { spaces: 2 });
      
    } catch (error) {
      console.warn('Could not save context:', error.message);
    }
  }
}

module.exports = AIAssistant;
