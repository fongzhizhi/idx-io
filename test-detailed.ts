// ============= 详细的导出测试 =============

import { IDXExporter, GlobalUnit } from './src/exporter';
import * as fs from 'fs';
import * as path from 'path';

async function testDetailedExport() {
  console.log('🚀 开始详细测试IDX导出器...');
  
  try {
    // 创建导出器配置
    const exporter = new IDXExporter({
      output: {
        directory: './output',
        designName: 'DetailedTestBoard',
        compress: false,
        namingPattern: '{designName}_{type}.idx'
      },
      protocolVersion: '4.5',
      geometry: {
        useSimplified: true,
        defaultUnit: GlobalUnit.UNIT_MM,
        precision: 6
      },
      collaboration: {
        creatorSystem: 'IDX-IO-DetailedTest',
        creatorCompany: 'TestCompany',
        includeNonCollaborative: false,
        includeLayerStackup: false
      },
      validation: {
        enabled: false,
        strictness: 'normal'
      }
    });

    // 准备更复杂的PCB数据
    const boardData = {
      board: {
        id: 'DETAILED_BOARD_001',
        name: 'DetailedTestBoard',
        outline: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 80 },
            { x: 80, y: 80 },
            { x: 80, y: 60 },
            { x: 20, y: 60 },
            { x: 20, y: 80 },
            { x: 0, y: 80 }
          ],
          thickness: 1.6
        },
        cutouts: [
          {
            id: 'CUTOUT_001',
            shape: 'circle' as const,
            parameters: {
              centerX: 50,
              centerY: 40,
              diameter: 10
            },
            depth: 1.6
          },
          {
            id: 'CUTOUT_002',
            shape: 'rectangle' as const,
            parameters: {
              x: 10,
              y: 10,
              width: 15,
              height: 10
            },
            depth: 1.6
          }
        ],
        stiffeners: [
          {
            id: 'STIFFENER_001',
            name: 'Main Stiffener',
            shape: {
              points: [
                { x: 70, y: 10 },
                { x: 90, y: 10 },
                { x: 90, y: 30 },
                { x: 70, y: 30 }
              ]
            },
            thickness: 0.2
          }
        ]
      },
      components: [],
      holes: [],
      keepouts: []
    };

    console.log('📋 复杂测试数据准备完成');

    // 执行导出
    const result = await exporter.export(boardData);
    
    if (result.success) {
      console.log('✅ 导出成功！');
      console.log(`📊 统计信息:`);
      console.log(`   项目总数: ${result.statistics.totalItems}`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);
      
      if (result.issues.length > 0) {
        console.log('⚠️  导出问题:');
        result.issues.forEach(issue => {
          console.log(`   ${issue.type}: ${issue.message}`);
        });
      }
      
      // 保存XML到文件
      if ('xmlContent' in result) {
        const outputDir = './output';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filePath = path.join(outputDir, result.fileName);
        fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
        console.log(`💾 XML文件已保存到: ${filePath}`);
        
        // 验证XML结构
        console.log('🔍 验证XML结构...');
        validateXMLStructure(result.xmlContent);
      }
      
    } else {
      console.error('❌ 导出失败:');
      result.issues.forEach(issue => {
        console.error(`   ${issue.type}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.error('💥 测试过程中发生错误:', error);
  }
}

function validateXMLStructure(xmlContent: string) {
  const checks = [
    { name: 'XML声明', pattern: /<\?xml version="1\.0" encoding="UTF-8"\?>/ },
    { name: 'EDMDDataSet根元素', pattern: /<foundation:EDMDDataSet/ },
    { name: 'Header元素', pattern: /<foundation:Header/ },
    { name: 'Body元素', pattern: /<foundation:Body/ },
    { name: 'ProcessInstruction元素', pattern: /<foundation:ProcessInstruction/ },
    { name: 'Item元素', pattern: /<foundation:Item/ },
    { name: 'CreatorSystem', pattern: /<foundation:CreatorSystem>IDX-IO-DetailedTest<\/foundation:CreatorSystem>/ },
    { name: 'GlobalUnitLength', pattern: /<foundation:GlobalUnitLength>UNIT_MM<\/foundation:GlobalUnitLength>/ },
    { name: 'ItemType', pattern: /<pdm:ItemType>assembly<\/pdm:ItemType>/ }
  ];
  
  let passedChecks = 0;
  
  checks.forEach(check => {
    if (check.pattern.test(xmlContent)) {
      console.log(`   ✅ ${check.name}`);
      passedChecks++;
    } else {
      console.log(`   ❌ ${check.name}`);
    }
  });
  
  console.log(`📈 验证结果: ${passedChecks}/${checks.length} 项检查通过`);
  
  if (passedChecks === checks.length) {
    console.log('🎉 XML结构验证完全通过！');
  } else {
    console.log('⚠️  XML结构验证部分通过，请检查失败项');
  }
}

// 运行测试
testDetailedExport().then(() => {
  console.log('🎉 详细测试完成');
}).catch(error => {
  console.error('💥 详细测试失败:', error);
  process.exit(1);
});