#!/usr/bin/env node

/**
 * 运行IDX示例的便捷脚本
 * 
 * 使用方法：
 * node run-example.js 01.simple-board
 * 或者：
 * npm run example 01.simple-board
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 获取命令行参数
const exampleName = process.argv[2];

if (!exampleName) {
    console.log('使用方法: node run-example.js <example-name>');
    console.log('');
    console.log('可用的示例:');
    console.log('  01.simple-board           - 简单板子');
    console.log('  02.layer-and-layer-stackup - 层和层堆叠');
    console.log('  03.components             - 元件');
    console.log('  04.vias                   - 过孔');
    console.log('  05.keepout-keepin         - 禁止区和保留区');
    console.log('  06.complete-board         - 完整多层板');
    process.exit(1);
}

// 构建文件路径
const exampleFile = `${exampleName}.ts`;
const examplePath = path.join(__dirname, exampleFile);

// 检查文件是否存在
if (!fs.existsSync(examplePath)) {
    console.error(`❌ 示例文件不存在: ${exampleFile}`);
    process.exit(1);
}

try {
    console.log(`🚀 运行示例: ${exampleName}`);
    console.log(`📁 文件路径: ${examplePath}`);
    console.log('');
    
    // 运行示例
    execSync(`npx ts-node "${exampleFile}"`, {
        cwd: __dirname,
        stdio: 'inherit'
    });
    
} catch (error) {
    console.error(`❌ 运行示例失败:`, error.message);
    process.exit(1);
}