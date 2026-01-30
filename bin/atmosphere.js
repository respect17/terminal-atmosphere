#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const gradient = require('gradient-string');
const EnvironmentMonitor = require('../lib/monitor');
const ProductivityOptimizer = require('../lib/optimizer');
const AIAssistant = require('../lib/ai-assistant');

const program = new Command();

console.log(
  gradient.pastel.multiline(figlet.textSync('Terminal Atmosphere', { font: 'Small' }))
);

program
  .name('atmosphere')
  .description('AI-powered terminal environment monitor and productivity optimizer')
  .version('1.0.0');

program
  .command('monitor')
  .description('Start real-time environment monitoring')
  .option('-i, --interval <seconds>', 'Monitoring interval in seconds', '5')
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    const monitor = new EnvironmentMonitor(options);
    await monitor.start();
  });

program
  .command('analyze')
  .description('Analyze current environment and provide insights')
  .option('-d, --depth <level>', 'Analysis depth (basic/advanced/deep)', 'advanced')
  .action(async (options) => {
    const optimizer = new ProductivityOptimizer();
    await optimizer.analyze(options.depth);
  });

program
  .command('optimize')
  .description('Get AI-powered optimization suggestions')
  .option('-f, --focus <area>', 'Focus area (memory/cpu/network/productivity)', 'all')
  .action(async (options) => {
    const ai = new AIAssistant();
    await ai.optimize(options.focus);
  });

program
  .command('profile')
  .description('Create and manage productivity profiles')
  .option('-c, --create <name>', 'Create new profile')
  .option('-l, --list', 'List all profiles')
  .option('-a, --apply <name>', 'Apply existing profile')
  .action(async (options) => {
    const optimizer = new ProductivityOptimizer();
    if (options.create) {
      await optimizer.createProfile(options.create);
    } else if (options.list) {
      await optimizer.listProfiles();
    } else if (options.apply) {
      await optimizer.applyProfile(options.apply);
    } else {
      console.log(chalk.yellow('Please specify an action: --create, --list, or --apply'));
    }
  });

program
  .command('weather')
  .description('Check your development "weather" - current system state')
  .option('-f, --forecast', 'Show 1-hour forecast based on current trends')
  .action(async (options) => {
    const monitor = new EnvironmentMonitor();
    await monitor.weatherReport(options.forecast);
  });

program.parse();
