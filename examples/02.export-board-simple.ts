// ============= 板子专项测试案例（修正版） =============
// 
// 本案例专门测试PCB板子的各种特性，包括：
// - 不同形状的板子轮廓（矩形、圆形、复杂多边形）
// - 板子材质和厚度属性
// - 板子属性和标识符
// - 几何精度和方向验证
// 
// 修正内容（根据IDX v4.5规范）：
// 1. 移除错误的AssembleToName引用
// 2. 根据板子复杂程度决定BaseLine属性
// 3. 确保完全符合IDX v4.5协议规范
//

import { IDXExporter, GlobalUnit } from '../src';
import { ExtendedExportSourceData } from '../src/types/data-models';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 测试矩形板子
 */
async function testRectangularBoard() {
  console.log('📐 测试矩形板子...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'RectangularBoard',
      compress: false,
      namingPattern: '{designName}_test.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'Board-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: false
    },
    validation: {
      enabled: true,
      strictness: 'normal'
    }
  });

  const rectangularBoardData: ExtendedExportSourceData = {
    board: {
      id: 'RECT_BOARD_001',
      name: 'Standard Rectangular PCB',
      outline: {
        // 标准矩形：100mm x 80mm
        points: [
          { x: 0, y: 0 },     // 左下角
          { x: 0, y: 80 },    // 左上角
          { x: 100, y: 80 },  // 右上角
          { x: 100, y: 0 }    // 右下角
        ],
        thickness: 1.6
      },
      properties: {
        'BOARD_TYPE': 'RIGID',
        'COPPER_LAYERS': '2',
        'SURFACE_FINISH': 'HASL',
        'MATERIAL': 'FR4',
        'DIELECTRIC_CONSTANT': '4.5'
      }
    }
  };

  const result = await exporter.export(rectangularBoardData);
  
  if (result.success) {
    console.log('✅ 矩形板子测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   尺寸: 100mm x 80mm x 1.6mm`);
    console.log(`   材质: FR4`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    return { success: true, file: result.fileName, content: result.xmlContent };
  } else {
    console.error('❌ 矩形板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 测试圆形板子
 */
async function testCircularBoard() {
  console.log('🔵 测试圆形板子...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'CircularBoard',
      compress: false,
      namingPattern: '{designName}_test.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'Board-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: false
    }
  });

  // 生成圆形轮廓点（半径25mm，32个点）
  const radius = 25;
  const centerX = 25;
  const centerY = 25;
  const numPoints = 32;
  const circularPoints: Array<{ x: number; y: number }> = [];
  
  // 从0度开始，顺时针生成点
  for (let i = 0; i < numPoints; i++) {
    const angle = (i * 2 * Math.PI) / numPoints;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    circularPoints.push({ 
      x: Math.round(x * 1000) / 1000, // 保留3位小数
      y: Math.round(y * 1000) / 1000 
    });
  }

  const circularBoardData: ExtendedExportSourceData = {
    board: {
      id: 'CIRCULAR_BOARD_001',
      name: 'Circular PCB Board',
      outline: {
        points: circularPoints,
        thickness: 0.8
      },
      properties: {
        'BOARD_TYPE': 'RIGID',
        'SHAPE': 'CIRCULAR',
        'RADIUS': '25',
        'COPPER_LAYERS': '4',
        'MATERIAL': 'Rogers4350B',
        'SURFACE_FINISH': 'ENIG',
        'DIELECTRIC_CONSTANT': '3.48'
      }
    }
  };

  const result = await exporter.export(circularBoardData);
  
  if (result.success) {
    console.log('✅ 圆形板子测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   半径: 25mm, 厚度: 0.8mm`);
    console.log(`   材质: Rogers4350B`);
    console.log(`   轮廓点数: ${numPoints}`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    return { success: true, file: result.fileName, content: result.xmlContent };
  } else {
    console.error('❌ 圆形板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 测试复杂形状板子
 */
async function testComplexShapeBoard() {
  console.log('🔶 测试复杂形状板子...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'ComplexBoard',
      compress: false,
      namingPattern: '{designName}_test.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'Board-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: false
    }
  });

  const complexBoardData: ExtendedExportSourceData = {
    board: {
      id: 'COMPLEX_BOARD_001',
      name: 'Complex Shape PCB',
      outline: {
        // L形状板子
        points: [
          { x: 0, y: 0 },      // 起点
          { x: 0, y: 60 },     // 向上
          { x: 40, y: 60 },    // 向右
          { x: 40, y: 40 },    // 向下
          { x: 80, y: 40 },    // 向右
          { x: 80, y: 0 }      // 向下到底
        ],
        thickness: 2.0
      },
      properties: {
        'BOARD_TYPE': 'FLEXIBLE',
        'SHAPE': 'L_SHAPE',
        'COPPER_LAYERS': '2',
        'MATERIAL': 'Polyimide',
        'SURFACE_FINISH': 'OSP',
        'BEND_RADIUS': '5',
        'FLEXIBILITY': 'DYNAMIC'
      }
    }
  };

  const result = await exporter.export(complexBoardData);
  
  if (result.success) {
    console.log('✅ 复杂形状板子测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   形状: L形`);
    console.log(`   材质: Polyimide (柔性)`);
    console.log(`   厚度: 2.0mm`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    return { success: true, file: result.fileName, content: result.xmlContent };
  } else {
    console.error('❌ 复杂形状板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 测试超薄板子
 */
async function testThinBoard() {
  console.log('📏 测试超薄板子...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'ThinBoard',
      compress: false,
      namingPattern: '{designName}_test.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 4  // 更高精度用于薄板
    },
    collaboration: { 
      creatorSystem: 'Board-Tester',
      creatorCompany: 'Test Lab',
      includeNonCollaborative: false,
      includeLayerStackup: false
    }
  });

  const thinBoardData: ExtendedExportSourceData = {
    board: {
      id: 'THIN_BOARD_001',
      name: 'Ultra-Thin PCB',
      outline: {
        // 小尺寸矩形：20mm x 15mm
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 15 },
          { x: 20, y: 15 },
          { x: 20, y: 0 }
        ],
        thickness: 0.1  // 超薄：0.1mm
      },
      properties: {
        'BOARD_TYPE': 'RIGID_FLEX',
        'THICKNESS_TOLERANCE': '±0.01',
        'COPPER_LAYERS': '1',
        'MATERIAL': 'LCP',
        'SURFACE_FINISH': 'ENEPIG',
        'DIELECTRIC_CONSTANT': '3.16',
        'APPLICATION': 'WEARABLE'
      }
    }
  };

  const result = await exporter.export(thinBoardData);
  
  if (result.success) {
    console.log('✅ 超薄板子测试通过');
    console.log(`   文件: ${result.fileName}`);
    console.log(`   尺寸: 20mm x 15mm x 0.1mm`);
    console.log(`   材质: LCP`);
    console.log(`   应用: 可穿戴设备`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    return { success: true, file: result.fileName, content: result.xmlContent };
  } else {
    console.error('❌ 超薄板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

/**
 * 验证IDX v4.5规范修正点
 */
function validateIDXCorrections(xmlContent: string) {
  return {
    // 1. 确认移除了错误的AssembleToName引用
    noAssembleToName: !xmlContent.includes('<pdm:AssembleToName>BOTTOM</pdm:AssembleToName>'),
    
    // 2. 确认移除了不必要的BaseLine（在assembly级别）
    noUnnecessaryBaseLine: !xmlContent.includes('<pdm:BaseLine>true</pdm:BaseLine>'),
    
    // 3. 确认使用了正确的geometryType
    correctGeometryType: xmlContent.includes('geometryType="BOARD_OUTLINE"'),
    
    // 4. 确认使用了正确的ShapeElementType
    correctShapeElementType: xmlContent.includes('<pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>'),
    
    // 5. 确认变换矩阵使用正确的命名空间
    correctTransformNamespace: xmlContent.includes('<property:Value>0.000000</property:Value>'),
    
    // 6. 确认正确的Item层次结构
    correctItemHierarchy: xmlContent.includes('<pdm:ItemType>single</pdm:ItemType>') && 
                         xmlContent.includes('<pdm:ItemType>assembly</pdm:ItemType>') &&
                         xmlContent.includes('<pdm:ItemInstance')
  };
}

/**
 * 分析生成的IDX文件结构
 */
function analyzeIDXStructure(xmlContent: string) {
  console.log('\n📋 IDX文件结构分析:');
  
  const lines = xmlContent.split('\n');
  let analysisResults = {
    totalLines: lines.length,
    hasXMLDeclaration: xmlContent.includes('<?xml'),
    hasCorrectRootElement: xmlContent.includes('<foundation:EDMDDataSet'),
    hasNamespaces: xmlContent.includes('xmlns:foundation='),
    hasHeader: xmlContent.includes('<foundation:Header>'),
    hasBody: xmlContent.includes('<foundation:Body>'),
    hasProcessInstruction: xmlContent.includes('<foundation:ProcessInstruction'),
    geometricElementsCount: (xmlContent.match(/<foundation:CartesianPoint/g) || []).length,
    itemsCount: (xmlContent.match(/<foundation:Item/g) || []).length
  };
  
  console.log(`   文件总行数: ${analysisResults.totalLines}`);
  console.log(`   XML声明: ${analysisResults.hasXMLDeclaration ? '✅' : '❌'}`);
  console.log(`   根元素: ${analysisResults.hasCorrectRootElement ? '✅' : '❌'}`);
  console.log(`   命名空间: ${analysisResults.hasNamespaces ? '✅' : '❌'}`);
  console.log(`   Header部分: ${analysisResults.hasHeader ? '✅' : '❌'}`);
  console.log(`   Body部分: ${analysisResults.hasBody ? '✅' : '❌'}`);
  console.log(`   ProcessInstruction: ${analysisResults.hasProcessInstruction ? '✅' : '❌'}`);
  console.log(`   几何元素数量: ${analysisResults.geometricElementsCount}`);
  console.log(`   项目数量: ${analysisResults.itemsCount}`);
  
  return analysisResults;
}

/**
 * 主测试函数 - 运行所有板子测试
 */
async function runAllBoardTests() {
  console.log('🚀 开始板子专项测试...\n');
  
  const testResults: any[] = [];
  
  try {
    // 1. 测试矩形板子
    const rectResult = await testRectangularBoard();
    testResults.push({ name: '矩形板子', ...rectResult });
    
    // 2. 测试圆形板子
    const circResult = await testCircularBoard();
    testResults.push({ name: '圆形板子', ...circResult });
    
    // 3. 测试复杂形状板子
    const complexResult = await testComplexShapeBoard();
    testResults.push({ name: '复杂形状板子', ...complexResult });
    
    // 4. 测试超薄板子
    const thinResult = await testThinBoard();
    testResults.push({ name: '超薄板子', ...thinResult });
    
    // 生成测试报告
    console.log('\n📊 测试总结:');
    console.log('='.repeat(60));
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    
    console.log(`✅ 成功: ${successCount}/${totalCount} 个测试通过`);
    console.log(`📈 成功率: ${Math.round((successCount / totalCount) * 100)}%`);
    
    testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.name}: ${result.success ? result.file : '失败'}`);
      
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
      analyzeIDXStructure(firstSuccess.content);
      
      // 验证IDX v4.5规范修正
      const corrections = validateIDXCorrections(firstSuccess.content);
      console.log('\n🔧 IDX v4.5规范合规性检查:');
      console.log(`   移除AssembleToName: ${corrections.noAssembleToName ? '✅' : '❌'}`);
      console.log(`   移除不必要BaseLine: ${corrections.noUnnecessaryBaseLine ? '✅' : '❌'}`);
      console.log(`   正确geometryType: ${corrections.correctGeometryType ? '✅' : '❌'}`);
      console.log(`   正确ShapeElementType: ${corrections.correctShapeElementType ? '✅' : '❌'}`);
      console.log(`   正确变换命名空间: ${corrections.correctTransformNamespace ? '✅' : '❌'}`);
      console.log(`   正确Item层次结构: ${corrections.correctItemHierarchy ? '✅' : '❌'}`);
      
      const correctionCount = Object.values(corrections).filter(v => v === true).length;
      console.log(`\n🎯 规范合规性: ${correctionCount}/6 项检查通过`);
    }
    
    // 保存测试报告
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalCount,
        success: successCount,
        successRate: Math.round((successCount / totalCount) * 100)
      },
      results: testResults.map(r => ({
        name: r.name,
        success: r.success,
        file: r.file || null,
        issues: r.issues || null
      })),
      corrections: (firstSuccess && firstSuccess.content) ? validateIDXCorrections(firstSuccess.content) : null
    };
    
    const reportPath = path.join('./output', 'board-test-report.json');
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output', { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
    console.log(`\n📄 测试报告已保存: ${reportPath}`);
    
  } catch (error) {
    console.error('💥 测试运行错误:', error);
  }
}

// 运行所有板子测试
runAllBoardTests().catch(console.error);