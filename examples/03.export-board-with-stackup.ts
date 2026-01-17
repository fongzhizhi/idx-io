// ============= 带层叠结构的板子测试案例 =============
// 
// 本案例测试带有层叠结构的PCB板子，验证AssembleToName的正确设置
// 
// 测试内容：
// 1. 简单板子（无层叠结构）- AssembleToName应该为空
// 2. 4层板（有层叠结构）- AssembleToName应该引用底层
// 3. 6层板（复杂层叠结构）- AssembleToName应该引用底层
//

import { IDXExporter, GlobalUnit } from '../src';
import { ExtendedExportSourceData, LayerStackupData, LayerType } from '../src/types/data-models';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试无层叠结构的简单板子
 */
async function testSimpleBoardWithoutStackup() {
  console.log('📋 测试无层叠结构的简单板子...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'SimpleBoard',
      compress: false,
      namingPattern: '{designName}_no_stackup.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'Stackup-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: false
    }
  });

  const simpleBoardData: ExtendedExportSourceData = {
    board: {
      id: 'SIMPLE_BOARD_001',
      name: 'Simple Board Without Stackup',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 50 },
          { x: 50, y: 50 },
          { x: 50, y: 0 }
        ],
        thickness: 1.6
      },
      // 注意：没有layerStackup属性
      properties: {
        'BOARD_TYPE': 'SIMPLE',
        'MATERIAL': 'FR4'
      }
    }
  };

  const result = await exporter.export(simpleBoardData);
  
  if (result.success) {
    console.log('✅ 简单板子测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   无层叠结构，AssembleToName应该为空`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    // 验证AssembleToName不存在
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    console.log(`   AssembleToName检查: ${hasAssembleToName ? '❌ 不应该存在' : '✅ 正确为空'}`);
    
    return { success: true, file: result.fileName, content: result.xmlContent, hasAssembleToName };
  } else {
    console.error('❌ 简单板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 测试4层板（有层叠结构）
 */
async function testFourLayerBoardWithStackup() {
  console.log('📚 测试4层板（有层叠结构）...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'FourLayerBoard',
      compress: false,
      namingPattern: '{designName}_with_stackup.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'Stackup-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: true
    }
  });

  // 创建4层板的层叠结构
  const fourLayerStackup: LayerStackupData = {
    id: 'STACKUP_4L',
    name: '4-Layer Standard',
    totalThickness: 1.6,
    description: 'Standard 4-layer PCB stackup',
    boardType: 'rigid',
    layers: [
      { layerId: 'L1_TOP', position: 1, thickness: 0.035, material: 'Copper' },
      { layerId: 'D1_PREPREG', position: 2, thickness: 0.2, material: 'FR4' },
      { layerId: 'L2_GND', position: 3, thickness: 0.035, material: 'Copper' },
      { layerId: 'CORE', position: 4, thickness: 1.065, material: 'FR4' },
      { layerId: 'L3_PWR', position: 5, thickness: 0.035, material: 'Copper' },
      { layerId: 'D2_PREPREG', position: 6, thickness: 0.2, material: 'FR4' },
      { layerId: 'L4_BOTTOM', position: 7, thickness: 0.035, material: 'Copper' }
    ]
  };

  const fourLayerBoardData: ExtendedExportSourceData = {
    board: {
      id: 'FOUR_LAYER_BOARD_001',
      name: '4-Layer Board With Stackup',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 80 },
          { x: 100, y: 80 },
          { x: 100, y: 0 }
        ],
        thickness: 1.6
      },
      layerStackup: fourLayerStackup,
      properties: {
        'BOARD_TYPE': 'MULTILAYER',
        'LAYER_COUNT': '4',
        'MATERIAL': 'FR4'
      }
    }
  };

  const result = await exporter.export(fourLayerBoardData);
  
  if (result.success) {
    console.log('✅ 4层板测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   有层叠结构，AssembleToName应该引用底层: L1_TOP`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    // 验证AssembleToName存在且正确
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    const assembleToNameMatch = result.xmlContent.match(/<pdm:AssembleToName>([^<]+)<\/pdm:AssembleToName>/);
    const assembleToNameValue = assembleToNameMatch ? assembleToNameMatch[1] : null;
    
    console.log(`   AssembleToName检查: ${hasAssembleToName ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   AssembleToName值: ${assembleToNameValue || '未找到'}`);
    console.log(`   底层引用正确: ${assembleToNameValue === 'L1_TOP' ? '✅' : '❌'}`);
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent, 
      hasAssembleToName,
      assembleToNameValue
    };
  } else {
    console.error('❌ 4层板测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 测试6层板（复杂层叠结构）
 */
async function testSixLayerBoardWithStackup() {
  console.log('📖 测试6层板（复杂层叠结构）...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'SixLayerBoard',
      compress: false,
      namingPattern: '{designName}_complex_stackup.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'Stackup-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: true
    }
  });

  // 创建6层板的层叠结构
  const sixLayerStackup: LayerStackupData = {
    id: 'STACKUP_6L',
    name: '6-Layer High-Speed',
    totalThickness: 1.6,
    description: '6-layer high-speed PCB stackup',
    boardType: 'rigid',
    layers: [
      { layerId: 'L1_TOP_SIG', position: 1, thickness: 0.035, material: 'Copper' },
      { layerId: 'D1_PREPREG_1', position: 2, thickness: 0.1, material: 'FR4' },
      { layerId: 'L2_GND_1', position: 3, thickness: 0.035, material: 'Copper' },
      { layerId: 'CORE_1', position: 4, thickness: 0.5, material: 'FR4' },
      { layerId: 'L3_SIG_1', position: 5, thickness: 0.035, material: 'Copper' },
      { layerId: 'D2_PREPREG_2', position: 6, thickness: 0.1, material: 'FR4' },
      { layerId: 'L4_SIG_2', position: 7, thickness: 0.035, material: 'Copper' },
      { layerId: 'CORE_2', position: 8, thickness: 0.5, material: 'FR4' },
      { layerId: 'L5_PWR', position: 9, thickness: 0.035, material: 'Copper' },
      { layerId: 'D3_PREPREG_3', position: 10, thickness: 0.1, material: 'FR4' },
      { layerId: 'L6_BOTTOM_SIG', position: 11, thickness: 0.035, material: 'Copper' }
    ],
    impedanceControl: {
      singleEnded: 50,
      differential: 100,
      tolerance: 10
    }
  };

  const sixLayerBoardData: ExtendedExportSourceData = {
    board: {
      id: 'SIX_LAYER_BOARD_001',
      name: '6-Layer High-Speed Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 120 },
          { x: 150, y: 120 },
          { x: 150, y: 0 }
        ],
        thickness: 1.6
      },
      layerStackup: sixLayerStackup,
      properties: {
        'BOARD_TYPE': 'HIGH_SPEED',
        'LAYER_COUNT': '6',
        'MATERIAL': 'FR4',
        'IMPEDANCE_CONTROL': 'YES'
      }
    }
  };

  const result = await exporter.export(sixLayerBoardData);
  
  if (result.success) {
    console.log('✅ 6层板测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   有复杂层叠结构，AssembleToName应该引用底层: L1_TOP_SIG`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    // 验证AssembleToName存在且正确
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    const assembleToNameMatch = result.xmlContent.match(/<pdm:AssembleToName>([^<]+)<\/pdm:AssembleToName>/);
    const assembleToNameValue = assembleToNameMatch ? assembleToNameMatch[1] : null;
    
    console.log(`   AssembleToName检查: ${hasAssembleToName ? '✅ 存在' : '❌ 缺失'}`);
    console.log(`   AssembleToName值: ${assembleToNameValue || '未找到'}`);
    console.log(`   底层引用正确: ${assembleToNameValue === 'L1_TOP_SIG' ? '✅' : '❌'}`);
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent, 
      hasAssembleToName,
      assembleToNameValue
    };
  } else {
    console.error('❌ 6层板测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 主测试函数 - 运行所有层叠结构测试
 */
async function runStackupTests() {
  console.log('🚀 开始层叠结构测试...\n');
  
  const testResults = [];
  
  try {
    // 1. 测试无层叠结构的简单板子
    const simpleResult = await testSimpleBoardWithoutStackup();
    testResults.push({ name: '简单板子（无层叠）', ...simpleResult });
    
    // 2. 测试4层板
    const fourLayerResult = await testFourLayerBoardWithStackup();
    testResults.push({ name: '4层板（有层叠）', ...fourLayerResult });
    
    // 3. 测试6层板
    const sixLayerResult = await testSixLayerBoardWithStackup();
    testResults.push({ name: '6层板（复杂层叠）', ...sixLayerResult });
    
    // 生成测试报告
    console.log('\n📊 层叠结构测试总结:');
    console.log('='.repeat(60));
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    console.log(`✅ 成功: ${successCount}/${totalCount} 个测试通过`);
    console.log(`📈 成功率: ${Math.round((successCount / totalCount) * 100)}%`);
    
    testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.name}: ${result.success ? result.file : '失败'}`);
      
      if (result.success) {
        if (result.name.includes('无层叠')) {
          console.log(`      AssembleToName: ${(result as any).hasAssembleToName ? '❌ 不应存在' : '✅ 正确为空'}`);
        } else {
          console.log(`      AssembleToName: ${(result as any).hasAssembleToName ? '✅ 存在' : '❌ 缺失'}`);
          if ((result as any).assembleToNameValue) {
            console.log(`      引用层: ${(result as any).assembleToNameValue}`);
          }
        }
      }
      
      if (!result.success && result.issues) {
        result.issues.forEach((issue: any) => {
          console.log(`      ${issue.type}: ${issue.message}`);
        });
      }
    });
    
    // 保存测试报告
    const reportData = {
      timestamp: new Date().toISOString(),
      testType: 'LayerStackup AssembleToName Tests',
      summary: {
        total: totalCount,
        success: successCount,
        successRate: Math.round((successCount / totalCount) * 100)
      },
      results: testResults.map(r => ({
        name: r.name,
        success: r.success,
        file: r.file || null,
        hasAssembleToName: (r as any).hasAssembleToName || false,
        assembleToNameValue: (r as any).assembleToNameValue || null,
        issues: r.issues || null
      }))
    };
    
    const reportPath = path.join('./output', 'stackup-test-report.json');
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output', { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`\n📄 测试报告已保存: ${reportPath}`);
    
    // 验证AssembleToName逻辑
    console.log('\n🔧 AssembleToName逻辑验证:');
    const simpleTest = testResults.find(r => r.name.includes('无层叠'));
    const fourLayerTest = testResults.find(r => r.name.includes('4层板'));
    const sixLayerTest = testResults.find(r => r.name.includes('6层板'));
    
    if (simpleTest) {
      console.log(`   无层叠结构: ${!(simpleTest as any).hasAssembleToName ? '✅ 正确不设置' : '❌ 错误设置了'}`);
    }
    if (fourLayerTest) {
      console.log(`   4层板: ${(fourLayerTest as any).hasAssembleToName ? '✅ 正确设置' : '❌ 未设置'}`);
      if ((fourLayerTest as any).assembleToNameValue) {
        console.log(`   4层板引用: ${(fourLayerTest as any).assembleToNameValue === 'L1_TOP' ? '✅ 正确' : '❌ 错误'}`);
      }
    }
    if (sixLayerTest) {
      console.log(`   6层板: ${(sixLayerTest as any).hasAssembleToName ? '✅ 正确设置' : '❌ 未设置'}`);
      if ((sixLayerTest as any).assembleToNameValue) {
        console.log(`   6层板引用: ${(sixLayerTest as any).assembleToNameValue === 'L1_TOP_SIG' ? '✅ 正确' : '❌ 错误'}`);
      }
    }
    
  } catch (error) {
    console.error('💥 测试运行错误:', error);
  }
}

// 运行层叠结构测试
runStackupTests().catch(console.error);