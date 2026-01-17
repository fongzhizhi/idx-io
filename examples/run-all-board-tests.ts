// ============= 板子测试统一运行器 =============
// 
// 运行所有板子测试案例并生成综合报告
// - 矩形板子测试
// - 圆形板子测试  
// - 复杂形状板子测试
// - 超薄板子测试
//

import { testRectangularBoard } from './board-rectangular';
import { testCircularBoard } from './board-circular';
import { testComplexShapeBoard } from './board-complex';
import { testThinBoard } from './board-thin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 分析生成的IDX文件结构
 */
function analyzeIDXStructure(xmlContent: string) {
  const lines = xmlContent.split('\n');
  return {
    totalLines: lines.length,
    hasXMLDeclaration: xmlContent.includes('<?xml'),
    hasCorrectRootElement: xmlContent.includes('<foundation:EDMDDataSet'),
    hasNamespaces: xmlContent.includes('xmlns:foundation='),
    hasHeader: xmlContent.includes('<foundation:Header>'),
    hasBody: xmlContent.includes('<foundation:Body>'),
    hasProcessInstruction: xmlContent.includes('<foundation:ProcessInstruction'),
    geometricElementsCount: (xmlContent.match(/<foundation:CartesianPoint/g) || []).length +
                           (xmlContent.match(/<foundation:CircleCenter/g) || []).length +
                           (xmlContent.match(/<foundation:PolyLine/g) || []).length,
    itemsCount: (xmlContent.match(/<foundation:Item/g) || []).length
  };
}

/**
 * 运行所有板子测试
 */
async function runAllBoardTests() {
  console.log('🚀 开始板子专项测试套件...\n');
  
  const testResults: any[] = [];
  
  try {
    // 1. 测试矩形板子
    console.log('=' .repeat(50));
    const rectResult = await testRectangularBoard();
    testResults.push({ name: '矩形板子', type: 'rectangular', ...rectResult });
    
    // 2. 测试圆形板子
    console.log('\n' + '='.repeat(50));
    const circResult = await testCircularBoard();
    testResults.push({ name: '圆形板子', type: 'circular', ...circResult });
    
    // 3. 测试复杂形状板子
    console.log('\n' + '='.repeat(50));
    const complexResult = await testComplexShapeBoard();
    testResults.push({ name: '复杂形状板子', type: 'complex', ...complexResult });
    
    // 4. 测试超薄板子
    console.log('\n' + '='.repeat(50));
    const thinResult = await testThinBoard();
    testResults.push({ name: '超薄板子', type: 'thin', ...thinResult });
    
    // 生成综合测试报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 板子测试套件综合报告');
    console.log('='.repeat(60));
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    console.log(`✅ 成功: ${successCount}/${totalCount} 个测试通过`);
    console.log(`📈 成功率: ${Math.round((successCount / totalCount) * 100)}%`);
    
    // 详细结果
    console.log('\n📋 详细测试结果:');
    testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.name}: ${result.success ? result.file : '失败'}`);
      
      if (result.success) {
        // 显示特定测试的检查结果
        if (result.type === 'rectangular' && result.compliance) {
          const complianceCount = Object.values(result.compliance).filter(v => v === true).length;
          console.log(`      规范合规性: ${complianceCount}/4`);
        }
        
        if (result.type === 'circular' && result.optimization && result.compliance) {
          const optimizationCount = Object.values(result.optimization).filter(v => v === true).length;
          const complianceCount = Object.values(result.compliance).filter(v => v === true).length;
          console.log(`      几何优化: ${optimizationCount}/5, 规范合规性: ${complianceCount}/3`);
        }
        
        if (result.type === 'complex' && result.geometry && result.compliance) {
          const geometryCount = Object.values(result.geometry).filter(v => v === true).length;
          const complianceCount = Object.values(result.compliance).filter(v => v === true).length;
          console.log(`      几何处理: ${geometryCount}/5, 规范合规性: ${complianceCount}/4`);
        }
        
        if (result.type === 'thin' && result.precision && result.compliance && result.thinBoardSpecial) {
          const precisionCount = Object.values(result.precision).filter(v => v === true).length;
          const complianceCount = Object.values(result.compliance).filter(v => v === true).length;
          const specialCount = Object.values(result.thinBoardSpecial).filter(v => v === true).length;
          console.log(`      精度处理: ${precisionCount}/5, 规范合规性: ${complianceCount}/4, 特殊验证: ${specialCount}/2`);
        }
      }
      
      if (!result.success && result.issues) {
        result.issues.forEach((issue: any) => {
          console.log(`      ${issue.type}: ${issue.message}`);
        });
      }
    });
    
    // 如果有成功的测试，分析第一个成功的文件
    const firstSuccess = testResults.find(r => r.success && r.content);
    if (firstSuccess && firstSuccess.content) {
      console.log('\n📋 IDX文件结构分析 (基于第一个成功的测试):');
      const analysis = analyzeIDXStructure(firstSuccess.content);
      
      console.log(`   文件总行数: ${analysis.totalLines}`);
      console.log(`   XML声明: ${analysis.hasXMLDeclaration ? '✅' : '❌'}`);
      console.log(`   根元素: ${analysis.hasCorrectRootElement ? '✅' : '❌'}`);
      console.log(`   命名空间: ${analysis.hasNamespaces ? '✅' : '❌'}`);
      console.log(`   Header部分: ${analysis.hasHeader ? '✅' : '❌'}`);
      console.log(`   Body部分: ${analysis.hasBody ? '✅' : '❌'}`);
      console.log(`   ProcessInstruction: ${analysis.hasProcessInstruction ? '✅' : '❌'}`);
      console.log(`   几何元素数量: ${analysis.geometricElementsCount}`);
      console.log(`   项目数量: ${analysis.itemsCount}`);
    }
    
    // 保存综合测试报告
    const reportData = {
      timestamp: new Date().toISOString(),
      testSuite: 'Board Test Suite',
      summary: {
        total: totalCount,
        success: successCount,
        successRate: Math.round((successCount / totalCount) * 100)
      },
      results: testResults.map(r => ({
        name: r.name,
        type: r.type,
        success: r.success,
        file: r.file || null,
        compliance: r.compliance || null,
        optimization: r.optimization || null,
        geometry: r.geometry || null,
        precision: r.precision || null,
        thinBoardSpecial: r.thinBoardSpecial || null,
        issues: r.issues || null
      })),
      structureAnalysis: firstSuccess && firstSuccess.content ? analyzeIDXStructure(firstSuccess.content) : null
    };
    
    const reportPath = path.join('./output', 'board-test-suite-report.json');
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output', { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`\n📄 综合测试报告已保存: ${reportPath}`);
    
    // 总结
    console.log('\n🎯 测试套件总结:');
    if (successCount === totalCount) {
      console.log('🎉 所有板子测试均通过！IDX导出器工作正常。');
    } else {
      console.log(`⚠️  ${totalCount - successCount} 个测试失败，需要检查和修复。`);
    }
    
    console.log('\n📚 测试覆盖范围:');
    console.log('   ✅ 标准矩形板子 (FR4, 1.6mm)');
    console.log('   ✅ 圆形板子 (Rogers4350B, 0.8mm, 自动几何优化)');
    console.log('   ✅ 复杂形状板子 (L形, Polyimide柔性, 2.0mm)');
    console.log('   ✅ 超薄板子 (LCP, 0.1mm, 高精度)');
    
  } catch (error) {
    console.error('💥 测试套件运行错误:', error);
    process.exit(1);
  }
}

// 运行所有测试
runAllBoardTests().catch(console.error);