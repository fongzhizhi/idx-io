// ============= 复杂形状板子测试案例 =============
// 
// 测试复杂形状PCB板子的IDX导出功能
// - L形状柔性板子
// - 验证多边形几何处理
// - 确保IDX v4.5规范合规性
//

import { IDXExporter, GlobalUnit } from '../src';
import { ExtendedExportSourceData } from '../src/types/export/exporter';
import * as fs from 'fs';
import * as path from 'path';

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
    console.log(`   轮廓点数: 6`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    // 验证多边形几何处理
    const hasPolyLine = result.xmlContent.includes('PolyLine');
    const hasCorrectPointCount = result.xmlContent.includes('<property:Value>6</property:Value>');
    const hasPolygonShape = result.xmlContent.includes('POLYGON');
    const hasCounterClockwise = result.xmlContent.includes('COUNTERCLOCKWISE');
    const hasBoardDimensions = result.xmlContent.includes('BOARD_DIMENSIONS');
    const hasBoardArea = result.xmlContent.includes('BOARD_AREA');
    
    console.log('\n🔍 多边形几何处理检查:');
    console.log(`   使用PolyLine: ${hasPolyLine ? '✅' : '❌'} (复杂形状应该使用)`);
    console.log(`   正确点数: ${hasCorrectPointCount ? '✅' : '❌'} (应该是6个点)`);
    console.log(`   标识为多边形: ${hasPolygonShape ? '✅' : '❌'}`);
    console.log(`   逆时针方向: ${hasCounterClockwise ? '✅' : '❌'} (外轮廓标准)`);
    console.log(`   包含尺寸信息: ${hasBoardDimensions ? '✅' : '❌'}`);
    console.log(`   包含面积信息: ${hasBoardArea ? '✅' : '❌'}`);
    
    // 验证IDX v4.5规范合规性
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    const hasCorrectGeometryType = result.xmlContent.includes('geometryType="BOARD_OUTLINE"');
    const hasCorrectShapeType = result.xmlContent.includes('<pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>');
    const hasCorrectInverted = result.xmlContent.includes('<pdm:Inverted>false</pdm:Inverted>');
    
    console.log('\n🔧 IDX v4.5规范合规性检查:');
    console.log(`   无AssembleToName: ${!hasAssembleToName ? '✅' : '❌'} (简单板子应该没有)`);
    console.log(`   正确geometryType: ${hasCorrectGeometryType ? '✅' : '❌'}`);
    console.log(`   正确ShapeElementType: ${hasCorrectShapeType ? '✅' : '❌'}`);
    console.log(`   正确Inverted属性: ${hasCorrectInverted ? '✅' : '❌'} (板子应该是false)`);
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent,
      geometry: {
        usesPolyLine: hasPolyLine,
        correctPointCount: hasCorrectPointCount,
        markedAsPolygon: hasPolygonShape,
        counterClockwise: hasCounterClockwise,
        hasBoardDimensions: hasBoardDimensions,
        hasBoardArea: hasBoardArea
      },
      compliance: {
        noAssembleToName: !hasAssembleToName,
        correctGeometryType: hasCorrectGeometryType,
        correctShapeType: hasCorrectShapeType,
        correctInverted: hasCorrectInverted
      }
    };
  } else {
    console.error('❌ 复杂形状板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

// 运行测试
if (require.main === module) {
  testComplexShapeBoard()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 复杂形状板子测试完成！');
        
        const geometryCount = result.geometry ? 
          Object.values(result.geometry).filter(v => v === true).length : 0;
        console.log(`🔷 几何处理: ${geometryCount}/6 项检查通过`);
        
        const complianceCount = result.compliance ? 
          Object.values(result.compliance).filter(v => v === true).length : 0;
        console.log(`📊 规范合规性: ${complianceCount}/4 项检查通过`);
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

export { testComplexShapeBoard };