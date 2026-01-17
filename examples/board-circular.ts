// ============= 圆形板子测试案例 =============
// 
// 测试圆形PCB板子的IDX导出功能
// - 半径25mm Rogers4350B板子
// - 验证圆形几何优化（自动检测并使用CircleCenter）
// - 确保IDX v4.5规范合规性
//

import { IDXExporter, GlobalUnit } from '../src';
import { ExtendedExportSourceData } from '../src/types/data-models';
import * as fs from 'fs';
import * as path from 'path';

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
    
    // 验证圆形几何优化
    const hasCircleCenter = result.xmlContent.includes('EDMDCircleCenter');
    const hasPolyLine = result.xmlContent.includes('PolyLine');
    const hasDiameterProperty = result.xmlContent.includes('DIAMETER');
    const hasRadiusProperty = result.xmlContent.includes('RADIUS');
    const hasBoardShapeProperty = result.xmlContent.includes('BOARD_SHAPE');
    const hasCircularValue = result.xmlContent.includes('<property:Value>CIRCULAR</property:Value>');
    
    console.log('\n🔍 圆形几何优化检查:');
    console.log(`   使用CircleCenter: ${hasCircleCenter ? '✅' : '❌'} (高效圆形表示)`);
    console.log(`   避免PolyLine: ${!hasPolyLine ? '✅' : '❌'} (应该没有多段线)`);
    console.log(`   包含直径属性: ${hasDiameterProperty ? '✅' : '❌'}`);
    console.log(`   包含半径属性: ${hasRadiusProperty ? '✅' : '❌'}`);
    console.log(`   标识为圆形: ${hasBoardShapeProperty && hasCircularValue ? '✅' : '❌'}`);
    
    // 验证IDX v4.5规范合规性
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    const hasCorrectGeometryType = result.xmlContent.includes('geometryType="BOARD_OUTLINE"');
    const hasCorrectBaseLine = result.xmlContent.includes('<pdm:BaseLine>true</pdm:BaseLine>');
    
    console.log('\n🔧 IDX v4.5规范合规性检查:');
    console.log(`   无AssembleToName: ${!hasAssembleToName ? '✅' : '❌'} (简单板子应该没有)`);
    console.log(`   正确geometryType: ${hasCorrectGeometryType ? '✅' : '❌'}`);
    console.log(`   正确BaseLine: ${hasCorrectBaseLine ? '✅' : '❌'}`);
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent,
      optimization: {
        usesCircleCenter: hasCircleCenter,
        avoidsPolyLine: !hasPolyLine,
        hasDiameterProperty: hasDiameterProperty,
        hasRadiusProperty: hasRadiusProperty,
        markedAsCircular: hasBoardShapeProperty && hasCircularValue
      },
      compliance: {
        noAssembleToName: !hasAssembleToName,
        correctGeometryType: hasCorrectGeometryType,
        correctBaseLine: hasCorrectBaseLine
      }
    };
  } else {
    console.error('❌ 圆形板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

// 运行测试
if (require.main === module) {
  testCircularBoard()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 圆形板子测试完成！');
        
        const optimizationCount = result.optimization ? 
          Object.values(result.optimization).filter(v => v === true).length : 0;
        console.log(`🚀 几何优化: ${optimizationCount}/5 项检查通过`);
        
        const complianceCount = result.compliance ? 
          Object.values(result.compliance).filter(v => v === true).length : 0;
        console.log(`📊 规范合规性: ${complianceCount}/3 项检查通过`);
      } else {
        console.error('\n💥 测试失败');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 测试运行错误:', error);
      process.exit(1);
    });
}

export { testCircularBoard };