#!/usr/bin/env node

// setup.js - Cross-platform setup script

import { execSync } from 'child_process';
import { platform } from 'os';

const isWindows = platform() === 'win32';

function run(command, description) {
    console.log(`📦 ${description}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${description} completed\n`);
    } catch (error) {
        console.error(`❌ ${description} failed:`, error.message);
        process.exit(1);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('🚀 LoadUp Challenge - Setting up development environment\n');
    
    // Step 1: Install dependencies
    run('npm install', 'Installing dependencies');
    
    // Step 2: Start database
    run('docker compose up -d', 'Starting PostgreSQL database');
    
    // Step 3: Wait for database to be ready
    console.log('⏳ Waiting for database to be ready...');
    await sleep(5000);
    console.log('✅ Database should be ready\n');
    
    // Step 4: Run migrations
    run('npm run migrate', 'Running database migrations');
    
    // Step 5: Seed data
    run('npm run seed', 'Seeding sample data');
    
    console.log('🎉 Setup complete! Run "npm run dev" to start the server.');
    console.log('📚 API documentation: http://localhost:3000/docs');
}

main().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
});