// ============= IDX v4.5规范合规性验证测试 =============
// 
// 根据IDX协议专家的反馈，验证所有关键修正：
// 1. ✅ 添加Stratum对象 - 完整的板子定义层次结构
// 2. ✅ 简化自定义属性 - 只保留制造相关的重要属性
// 3. ✅ 正确的Item层次结构 - assembly -> single -> Stratum -> ShapeElement
// 4. ✅ 正确的几何厚度表示 - LowerBound=0, UpperBound=厚度值
//

import { IDXExporter, GlobalUnit } from '../src';
import { ExtendedExportSourceData } from '../src/types/data-models';
import * as fs from 'fs';
import * as path from 'path';

/**
 * IDX v4.5规范合规性测试
 */
async function testIDXv45Compliance() {
  console.log('🔍 IDX v4.5规范合规性验证测试...');

  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'IDXv45Compliance',
      compress: false,
      namingPattern: '{designName}_baseline.idx'
    },
    protocolVersion: '4.5',
    geometry: { 
      useSimplified: true, 
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: { 
      creatorSystem: 'IDX-Validator',
      creatorCompany: 'Protocol Expert',
      includeNonCollaborative: false,
      includeLayerStackup: false
    }
  });

  const testBoardData: ExtendedExportSourceData = {
    board: {
      id: 'COMPLIANCE_TEST_001',
      name: 'IDX v4.5 Compliance Test Board',
      outline: {
        // 简单矩形板子用于验证结构
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 50 },
          { x: 30, y: 50 },
          { x: 30, y: 0 }
        ],
        thickness: 1.6
      },
      properties: {
        'MATERIAL': 'FR4',
        'BOARD_TYPE': 'RIGID',
        'SURFACE_FINISH': 'HASL',
        'COPPER_LAYERS': '2',
        'APPLICATION': 'INDUSTRIAL'
      }
    }
  };

  const result = await exporter.export(testBoardData);
  
  if (result.success) {
    console.log('✅ IDX v4.5合规性测试通过');
    console.log(`   文件: ${result.fileName}`);
    
    // 确保输出目录存在
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 保存文件
    const filePath = path.join(outputDir, result.fileName);
    fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
    
    // 验证IDX v4.5规范关键要求
    console.log('\n🔍 IDX v4.5规范合规性检查:');
    
    // 1. 验证Stratum对象存在
    const hasStratum = result.xmlContent.includes('<foundation:Stratum') && 
                      result.xmlContent.includes('xsi:type="pdm:EDMDStratum"');
    console.log(`   1. Stratum对象: ${hasStratum ? '✅' : '❌'} (完整板子定义结构)`);
    
    // 2. 验证正确的Item层次结构
    const hasAssemblyItem = result.xmlContent.includes('pdm:ItemType>assembly</pdm:ItemType>');
    const hasSingleItem = result.xmlContent.includes('pdm:ItemType>single</pdm:ItemType>');
    const hasItemInstance = result.xmlContent.includes('<pdm:ItemInstance');
    console.log(`   2. Item层次结构: ${hasAssemblyItem && hasSingleItem && hasItemInstance ? '✅' : '❌'} (assembly->single->ItemInstance)`);
    
    // 3. 验证single类型Item引用Stratum
    const singleItemReferencesStratum = result.xmlContent.includes('<pdm:Shape>') && 
                                       result.xmlContent.includes('_STRATUM</pdm:Shape>');
    console.log(`   3. Shape引用Stratum: ${singleItemReferencesStratum ? '✅' : '❌'} (single Item -> Stratum)`);
    
    // 4. 验证Stratum引用ShapeElement
    const stratumReferencesShape = result.xmlContent.includes('<pdm:ShapeElement>') && 
                                  result.xmlContent.includes('_SHAPE</pdm:ShapeElement>');
    console.log(`   4. Stratum引用Shape: ${stratumReferencesShape ? '✅' : '❌'} (Stratum -> ShapeElement)`);
    
    // 5. 验证几何厚度表示
    const hasCorrectZBounds = result.xmlContent.includes('<d2:LowerBound>') && 
                             result.xmlContent.includes('<property:Value>0</property:Value>') &&
                             result.xmlContent.includes('<d2:UpperBound>') &&
                             result.xmlContent.includes('<property:Value>1.6</property:Value>');
    console.log(`   5. 几何厚度表示: ${hasCorrectZBounds ? '✅' : '❌'} (LowerBound=0, UpperBound=1.6)`);
    
    // 6. 验证简化的自定义属性
    const propertyCount = (result.xmlContent.match(/<foundation:UserProperty/g) || []).length;
    const hasEssentialProperties = result.xmlContent.includes('THICKNESS') && 
                                  result.xmlContent.includes('MATERIAL') &&
                                  result.xmlContent.includes('BOARD_SHAPE');
    console.log(`   6. 简化属性: ${propertyCount <= 10 && hasEssentialProperties ? '✅' : '❌'} (${propertyCount}个属性，包含必要属性)`);
    
    // 7. 验证正确的BaseLine格式
    const hasCorrectBaseLine = result.xmlContent.includes('<pdm:BaseLine>true</pdm:BaseLine>');
    console.log(`   7. BaseLine格式: ${hasCorrectBaseLine ? '✅' : '❌'} (正确的true值)`);
    
    // 8. 验证完整的标识符结构
    const hasCompleteIdentifier = result.xmlContent.includes('<pdm:Identifier xsi:type="foundation:EDMDIdentifier">') &&
                                  result.xmlContent.includes('<foundation:SystemScope>') &&
                                  result.xmlContent.includes('<foundation:Number>') &&
                                  result.xmlContent.includes('<foundation:Version>') &&
                                  result.xmlContent.includes('<foundation:Revision>');
    console.log(`   8. 完整标识符: ${hasCompleteIdentifier ? '✅' : '❌'} (包含SystemScope, Number, Version, Revision)`);
    
    const complianceChecks = [
      hasStratum,
      hasAssemblyItem && hasSingleItem && hasItemInstance,
      singleItemReferencesStratum,
      stratumReferencesShape,
      hasCorrectZBounds,
      propertyCount <= 10 && hasEssentialProperties,
      hasCorrectBaseLine,
      hasCompleteIdentifier
    ];
    
    const passedChecks = complianceChecks.filter(check => check).length;
    const totalChecks = complianceChecks.length;
    
    console.log(`\n📊 IDX v4.5规范合规性总分: ${passedChecks}/${totalChecks} (${Math.round((passedChecks/totalChecks)*100)}%)`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 完全符合IDX v4.5规范要求！');
    } else {
      console.log(`⚠️  还有 ${totalChecks - passedChecks} 项需要改进`);
    }
    
    return { 
      success: true, 
      file: result.fileName, 
      content: result.xmlContent,
      complianceScore: `${passedChecks}/${totalChecks}`,
      compliancePercentage: Math.round((passedChecks/totalChecks)*100),
      checks: {
        hasStratum,
        hasCorrectItemHierarchy: hasAssemblyItem && hasSingleItem && hasItemInstance,
        singleItemReferencesStratum,
        stratumReferencesShape,
        hasCorrectZBounds,
        hasSimplifiedProperties: propertyCount <= 10 && hasEssentialProperties,
        hasCorrectBaseLine,
        hasCompleteIdentifier
      }
    };
  } else {
    console.error('❌ IDX v4.5合规性测试失败:', result.issues);
    return { success: false, issues: result.issues };
  }
}

// 运行测试
if (require.main === module) {
  testIDXv45Compliance()
    .then(result => {
      if (result.success) {
        console.log('\n🎯 IDX v4.5规范合规性验证完成！');
        console.log(`📈 合规性得分: ${result.complianceScore} (${result.compliancePercentage}%)`);
        
        if (result.compliancePercentage === 100) {
          console.log('🏆 恭喜！完全符合IDX v4.5协议规范！');
        }
      } else {
        console.error('\n💥 合规性验证失败');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 测试运行错误:', error);
      process.exit(1);
    });
}

export { testIDXv45Compliance };