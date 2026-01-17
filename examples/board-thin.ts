// ============= 超薄板子测试案例 =============
// 
// 测试超薄PCB板子的IDX导出功能
// - 20mm x 15mm x 0.1mm LCP板子
// - 验证高精度几何处理
// - 确保IDX v4.5规范合规性
//

import { IDXExporter, GlobalUnit } from '../src';
import { ExtendedExportSourceData } from '../src/types/data-models';
import * as fs from 'fs';
import * as path from 'path';

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
    
    // 验证高精度几何处理
    const hasCorrectThickness = result.xmlContent.includes('<property:Value>0.1</property:Value>');
    const hasHighPrecision = result.xmlContent.includes('0.0000'); // 检查是否有4位小数精度
    const hasLCPMaterial = result.xmlContent.includes('LCP');
    const hasWearableApp = result.xmlContent.includes('WEARABLE');
    const hasRigidFlexType = result.xmlContent.includes('RIGID_FLEX');
    
    console.log('\n🔍 高精度几何处理检查:');
    console.log(`   正确厚度: ${hasCorrectThickness ? '✅' : '❌'} (0.1mm)`);
    console.log(`   高精度坐标: ${hasHighPrecision ? '✅' : '❌'} (4位小数)`);
    console.log(`   LCP材质: ${hasLCPMaterial ? '✅' : '❌'}`);
    console.log(`   可穿戴应用: ${hasWearableApp ? '✅' : '❌'}`);
    console.log(`   刚柔结合类型: ${hasRigidFlexType ? '✅' : '❌'}`);
    
    // 验证IDX v4.5规范合规性
    const hasAssembleToName = result.xmlContent.includes('<pdm:AssembleToName>');
    const hasCorrectGeometryType = result.xmlContent.includes('geometryType="BOARD_OUTLINE"');
    const hasCorrectShapeType = result.xmlContent.includes('<pdm:ShapeElementType>FeatureShapeElement</pdm:ShapeElementType>');
    const hasCorrectZBounds = result.xmlContent.includes('<d2:LowerBound>') && 
                             result.xmlContent.includes('<d2:UpperBound>');
    
    console.log('\n🔧 IDX v4.5规范合规性检查:');
    console.log(`   无AssembleToName: ${!hasAssembleToName ? '✅' : '❌'} (简单板子应该没有)`);
    console.log(`   正确geometryType: ${hasCorrectGeometryType ? '✅' : '❌'}`);
    console.log(`   正确ShapeElementType: ${hasCorrectShapeType ? '✅' : '❌'}`);
    console.log(`   正确Z边界: ${hasCorrectZBounds ? '✅' : '❌'} (2.5D几何)`);
    
    // 验证超薄板特殊要求
    const thicknessValue = result.xmlContent.match(/<property:Value>0\.1<\/property:Value>/);
    const upperBoundValue = result.xmlContent.match(/<d2:UpperBound>\s*<property:Value>0\.1<\/property:Value>/);
    
    console.log('\n🎯 超薄板特殊验证:');
    console.log(`   厚度值正确: ${thicknessValue ? '✅' : '❌'}`);
    console.log(`   Z上界正确: ${upperBoundValue ? '✅' : '❌'}`);
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent,
      precision: {
        correctThickness: hasCorrectThickness,
        highPrecision: hasHighPrecision,
        hasLCPMaterial: hasLCPMaterial,
        hasWearableApp: hasWearableApp,
        hasRigidFlexType: hasRigidFlexType
      },
      compliance: {
        noAssembleToName: !hasAssembleToName,
        correctGeometryType: hasCorrectGeometryType,
        correctShapeType: hasCorrectShapeType,
        correctZBounds: hasCorrectZBounds
      },
      thinBoardSpecial: {
        thicknessValueCorrect: !!thicknessValue,
        upperBoundCorrect: !!upperBoundValue
      }
    };
  } else {
    console.error('❌ 超薄板子测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

// 运行测试
if (require.main === module) {
  testThinBoard()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 超薄板子测试完成！');
        
        const precisionCount = result.precision ? 
          Object.values(result.precision).filter(v => v === true).length : 0;
        console.log(`🎯 精度处理: ${precisionCount}/5 项检查通过`);
        
        const complianceCount = result.compliance ? 
          Object.values(result.compliance).filter(v => v === true).length : 0;
        console.log(`📊 规范合规性: ${complianceCount}/4 项检查通过`);
        
        const specialCount = result.thinBoardSpecial ? 
          Object.values(result.thinBoardSpecial).filter(v => v === true).length : 0;
        console.log(`⚡ 超薄板特殊: ${specialCount}/2 项检查通过`);
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

export { testThinBoard };