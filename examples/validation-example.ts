// ============= 协议合规性验证示例 =============
// 
// 本示例专门展示IDX导出器的协议合规性验证功能
// 包括如何启用验证、处理验证结果、修复常见问题等
//

import { IDXExporter, GlobalUnit, BrowserExportResult } from '../src';
import { ExtendedExportSourceData } from '../src/types/data-models';

/**
 * 演示基本的验证功能
 */
async function basicValidationExample() {
  console.log('🔍 基本验证功能示例\n');
  
  // 创建启用验证的导出器
  const exporter = new IDXExporter({
    output: {
      designName: 'ValidationDemo',
      directory: './output'
    },
    geometry: {
      useSimplified: true,
      defaultUnit: GlobalUnit.UNIT_MM
    },
    collaboration: {
      creatorSystem: 'ValidationDemo',
      creatorCompany: 'Demo Company'
    },
    validation: {
      enabled: true,           // 启用验证
      strictMode: false,       // 非严格模式（允许警告）
      reportWarnings: true     // 报告警告信息
    }
  });

  // 准备测试数据
  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'VALIDATION_BOARD',
      name: 'Validation Test Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 }
        ],
        thickness: 1.6
      }
    },
    components: [
      {
        refDes: 'U1',
        partNumber: 'TEST_IC',
        packageName: 'QFP-64',
        position: { x: 25, y: 15, z: 1.6, rotation: 0 },
        dimensions: { width: 10, height: 10, thickness: 1.0 },
        layer: 'TOP'
      }
    ],
    holes: [
      {
        id: 'VIA_001',
        type: 'via',
        viaType: 'through',
        position: { x: 10, y: 10 },
        diameter: 0.2,
        purpose: 'via'
      }
    ]
  };

  try {
    const result = await exporter.export(boardData);
    
    console.log('📊 导出结果:');
    console.log(`   成功: ${result.success ? '✅' : '❌'}`);
    console.log(`   文件: ${result.fileName}`);
    
    // 详细的验证结果分析
    if (result.validation) {
      console.log('\n🔍 协议合规性验证详情:');
      console.log(`   整体验证: ${result.validation.valid ? '✅ 通过' : '❌ 失败'}`);
      console.log(`   错误数量: ${result.validation.errors.length}`);
      console.log(`   警告数量: ${result.validation.warnings.length}`);
      
      // 显示所有错误
      if (result.validation.errors.length > 0) {
        console.log('\n❌ 协议违规错误:');
        result.validation.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. [${error.code}] ${error.message}`);
          if (error.location) {
            console.log(`      位置: ${error.location}`);
          }
          if (error.suggestion) {
            console.log(`      建议: ${error.suggestion}`);
          }
          console.log('');
        });
      }
      
      // 显示所有警告
      if (result.validation.warnings.length > 0) {
        console.log('\n⚠️  协议合规性警告:');
        result.validation.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. [${warning.code}] ${warning.message}`);
          if (warning.location) {
            console.log(`      位置: ${warning.location}`);
          }
          console.log('');
        });
      }
      
      // 验证通过的情况
      if (result.validation.valid) {
        console.log('\n🎉 恭喜！生成的IDX文件完全符合IDX v4.5协议规范');
        console.log('   - ProcessInstruction使用正确的命名空间');
        console.log('   - 形状引用格式正确');
        console.log('   - 几何类型符合标准');
        console.log('   - XML结构完全合规');
      }
    } else {
      console.log('\n⚠️  验证功能未启用或不可用');
    }
    
  } catch (error) {
    console.error('💥 导出过程中发生错误:', error);
  }
}

/**
 * 演示严格模式验证
 */
async function strictModeValidationExample() {
  console.log('\n🔒 严格模式验证示例\n');
  
  const exporter = new IDXExporter({
    output: {
      designName: 'StrictValidation',
      directory: './output'
    },
    validation: {
      enabled: true,
      strictMode: true,        // 严格模式：警告也视为错误
      reportWarnings: true
    }
  });

  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'STRICT_BOARD',
      name: 'Strict Validation Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 20 },
          { x: 0, y: 20 }
        ],
        thickness: 1.6
      }
    }
  };

  const result = await exporter.export(boardData);
  
  console.log('📊 严格模式验证结果:');
  console.log(`   验证通过: ${result.validation?.valid ? '✅' : '❌'}`);
  
  if (result.validation && !result.validation.valid) {
    console.log('\n❌ 严格模式下的问题:');
    console.log('   在严格模式下，所有警告都被视为错误');
    console.log(`   总问题数: ${result.validation.errors.length + result.validation.warnings.length}`);
  }
}

/**
 * 演示验证结果的编程处理
 */
async function programmaticValidationHandling() {
  console.log('\n💻 编程方式处理验证结果\n');
  
  const exporter = new IDXExporter({
    output: { designName: 'ProgrammaticTest' },
    validation: { enabled: true, reportWarnings: true }
  });

  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'PROG_BOARD',
      name: 'Programmatic Test Board',
      outline: {
        points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 15 }, { x: 0, y: 15 }],
        thickness: 1.6
      }
    }
  };

  const result = await exporter.export(boardData);
  
  // 编程方式处理验证结果
  if (result.validation) {
    const { valid, errors, warnings } = result.validation;
    
    // 根据验证结果采取不同行动
    if (valid) {
      console.log('✅ 验证通过 - 可以安全使用此文件');
      
      // 在浏览器中自动下载
      if (typeof window !== 'undefined') {
        const url = exporter.createDownloadUrl(result.xmlContent);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.fileName;
        link.click();
        URL.revokeObjectURL(url);
        console.log('📥 文件已自动下载');
      }
      
    } else {
      console.log('❌ 验证失败 - 需要修复问题');
      
      // 按严重程度分类问题
      const criticalErrors = errors.filter(e => e.severity === 'error');
      const minorIssues = [...errors.filter(e => e.severity !== 'error'), ...warnings];
      
      if (criticalErrors.length > 0) {
        console.log(`🚨 严重错误 (${criticalErrors.length}个) - 必须修复:`);
        criticalErrors.forEach(error => {
          console.log(`   - ${error.message}`);
        });
      }
      
      if (minorIssues.length > 0) {
        console.log(`⚠️  次要问题 (${minorIssues.length}个) - 建议修复:`);
        minorIssues.forEach(issue => {
          console.log(`   - ${issue.message}`);
        });
      }
      
      // 提供修复建议
      console.log('\n🔧 修复建议:');
      const suggestions = [...errors, ...warnings]
        .map(issue => issue.suggestion)
        .filter(Boolean);
      
      if (suggestions.length > 0) {
        suggestions.forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion}`);
        });
      } else {
        console.log('   请查看详细错误信息或参考文档');
      }
    }
    
    // 生成验证报告
    const report = generateValidationReport(result.validation);
    console.log('\n📋 验证报告已生成');
    console.log(report);
    
  } else {
    console.log('⚠️  验证功能未启用');
  }
}

/**
 * 生成人类可读的验证报告
 */
function generateValidationReport(validation: any): string {
  const lines = [];
  lines.push('='.repeat(50));
  lines.push('IDX 协议合规性验证报告');
  lines.push('='.repeat(50));
  lines.push(`验证时间: ${new Date().toLocaleString()}`);
  lines.push(`整体结果: ${validation.valid ? '✅ 通过' : '❌ 失败'}`);
  lines.push(`错误数量: ${validation.errors.length}`);
  lines.push(`警告数量: ${validation.warnings.length}`);
  lines.push('');
  
  if (validation.errors.length > 0) {
    lines.push('错误详情:');
    lines.push('-'.repeat(30));
    validation.errors.forEach((error: any, index: number) => {
      lines.push(`${index + 1}. [${error.code}] ${error.message}`);
      if (error.location) lines.push(`   位置: ${error.location}`);
      if (error.suggestion) lines.push(`   建议: ${error.suggestion}`);
      lines.push('');
    });
  }
  
  if (validation.warnings.length > 0) {
    lines.push('警告详情:');
    lines.push('-'.repeat(30));
    validation.warnings.forEach((warning: any, index: number) => {
      lines.push(`${index + 1}. [${warning.code}] ${warning.message}`);
      if (warning.location) lines.push(`   位置: ${warning.location}`);
      lines.push('');
    });
  }
  
  lines.push('='.repeat(50));
  return lines.join('\n');
}

/**
 * 浏览器环境下的验证示例
 */
function createValidationBrowserExample() {
  if (typeof window === 'undefined') {
    console.log('此示例需要在浏览器环境中运行');
    return;
  }

  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.maxWidth = '800px';
  
  const title = document.createElement('h2');
  title.textContent = 'IDX 协议合规性验证示例';
  container.appendChild(title);
  
  const description = document.createElement('p');
  description.innerHTML = `
    本示例展示了IDX导出器的协议合规性验证功能。<br>
    验证功能可以检查生成的IDX文件是否符合IDX v4.5协议规范。
  `;
  container.appendChild(description);
  
  // 基本验证按钮
  const basicButton = document.createElement('button');
  basicButton.textContent = '运行基本验证示例';
  basicButton.style.margin = '10px';
  basicButton.style.padding = '10px 20px';
  basicButton.onclick = () => basicValidationExample();
  container.appendChild(basicButton);
  
  // 严格模式按钮
  const strictButton = document.createElement('button');
  strictButton.textContent = '运行严格模式示例';
  strictButton.style.margin = '10px';
  strictButton.style.padding = '10px 20px';
  strictButton.onclick = () => strictModeValidationExample();
  container.appendChild(strictButton);
  
  // 编程处理按钮
  const progButton = document.createElement('button');
  progButton.textContent = '编程方式处理验证';
  progButton.style.margin = '10px';
  progButton.style.padding = '10px 20px';
  progButton.onclick = () => programmaticValidationHandling();
  container.appendChild(progButton);
  
  // 结果显示区域
  const resultArea = document.createElement('div');
  resultArea.id = 'validation-results';
  resultArea.style.marginTop = '20px';
  resultArea.style.padding = '15px';
  resultArea.style.backgroundColor = '#f5f5f5';
  resultArea.style.borderRadius = '5px';
  resultArea.style.fontFamily = 'monospace';
  resultArea.style.whiteSpace = 'pre-wrap';
  container.appendChild(resultArea);
  
  document.body.appendChild(container);
  
  // 重定向console.log到结果区域
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    const resultDiv = document.getElementById('validation-results');
    if (resultDiv) {
      resultDiv.textContent += args.join(' ') + '\n';
      resultDiv.scrollTop = resultDiv.scrollHeight;
    }
  };
}

// 运行示例
if (typeof window !== 'undefined') {
  // 浏览器环境
  createValidationBrowserExample();
} else {
  // Node.js环境
  console.log('🚀 IDX 协议合规性验证示例\n');
  
  async function runAllExamples() {
    await basicValidationExample();
    await strictModeValidationExample();
    await programmaticValidationHandling();
  }
  
  runAllExamples().catch(console.error);
}