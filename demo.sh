#!/bin/bash

echo "🌍 Terminal Atmosphere Demo Script"
echo "=================================="
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🚀 Starting Terminal Atmosphere Demo..."
echo ""

# Show help
echo "📖 Available Commands:"
node bin/atmosphere.js --help

echo ""
echo "🌤️  Weather Report:"
node bin/atmosphere.js weather

echo ""
echo "📊 System Analysis:"
node bin/atmosphere.js analyze --depth basic

echo ""
echo "🤖 AI Optimization (Memory Focus):"
echo "n" | node bin/atmosphere.js optimize --focus memory

echo ""
echo "✅ Demo completed!"
echo ""
echo "To start real-time monitoring, run:"
echo "  node bin/atmosphere.js monitor --interval 5"
echo ""
echo "To create a productivity profile, run:"
echo "  node bin/atmosphere.js profile --create demo-profile"
