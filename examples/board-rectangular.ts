// ============= 矩形板子测试案例 =============
// 
// 测试标准矩形PCB板子的IDX导出功能
// - 100mm x 80mm x 1.6mm FR4板子
// - 验证基本几何和属性
// - 确保IDX v4.5规范合规性
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
    
    // 验证IDX v4.5规范合规性
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    const hasCorrectGeometryType = result.xmlContent.includes('geometryType="BOARD_OUTLINE"');
    const hasCorrectShapeType = result.xmlContent.includes('<pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>');
    const hasCorrectItemHierarchy = result.xmlContent.includes('<pdm:ItemType>single</pdm:ItemType>') && 
                                   result.xmlContent.includes('<pdm:ItemType>assembly</pdm:ItemType>');
    
    console.log('\n🔧 IDX v4.5规范合规性检查:');
    console.log(`   无AssembleToName: ${!hasAssembleToName ? '✅' : '❌'} (简单板子应该没有)`);
    console.log(`   正确geometryType: ${hasCorrectGeometryType ? '✅' : '❌'}`);
    console.log(`   正确ShapeElementType: ${hasCorrectShapeType ? '✅' : '❌'}`);
    console.log(`   正确Item层次结构: ${hasCorrectItemHierarchy ? '✅' : '❌'}`);
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent,
      compliance: {
        noAssembleToName: !hasAssembleToName,
        correctGeometryType: hasCorrectGeometryType,
        correctShapeType: hasCorrectShapeType,
        correctItemHierarchy: hasCorrectItemHierarchy
      }
    };
  } else {
    console.error('❌ 矩形板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

// 运行测试
if (require.main === module) {
  testRectangularBoard()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 矩形板子测试完成！');
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

export { testRectangularBoard };