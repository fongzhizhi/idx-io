// ============= 集成测试：包含组件、过孔和禁止区 =============

import { IDXExporter, GlobalUnit } from './src/exporter';
import * as fs from 'fs';
import * as path from 'path';

async function testIntegratedExport() {
  console.log('🚀 开始集成测试IDX导出器（包含组件、过孔、禁止区）...');
  
  try {
    // 创建导出器配置
    const exporter = new IDXExporter({
      output: {
        directory: './output',
        designName: 'IntegratedTestBoard',
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
        creatorSystem: 'IDX-IO-IntegratedTest',
        creatorCompany: 'TestCompany',
        includeNonCollaborative: false,
        includeLayerStackup: false
      },
      validation: {
        enabled: false,
        strictness: 'normal'
      }
    });

    // 准备包含组件、过孔和禁止区的完整PCB数据
    const boardData = {
      board: {
        id: 'INTEGRATED_BOARD_001',
        name: 'IntegratedTestBoard',
        outline: {
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 100, y: 80 },
            { x: 0, y: 80 }
          ],
          thickness: 1.6
        },
        // 添加组件
        components: [
          {
            refDes: 'C1',
            partNumber: 'CAP-0805-1uF',
            packageName: '0805',
            position: { x: 30, y: 30, rotation: 0 },
            dimensions: { width: 2.0, height: 1.2, thickness: 0.8 },
            layer: 'TOP',
            electrical: {
              capacitance: 0.000001,
              tolerance: 10
            }
          },
          {
            refDes: 'R1',
            partNumber: 'RES-0603-10K',
            packageName: '0603',
            position: { x: 50, y: 30, rotation: 90 },
            dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
            layer: 'TOP',
            electrical: {
              resistance: 10000,
              tolerance: 5
            }
          },
          {
            refDes: 'U1',
            partNumber: 'MCU-QFN32',
            packageName: 'QFN32',
            position: { x: 70, y: 50, rotation: 0 },
            dimensions: { width: 5.0, height: 5.0, thickness: 1.0 },
            layer: 'TOP',
            isMechanical: false,
            pins: [
              { number: '1', isPrimary: true, position: { x: -2, y: -2 } },
              { number: '2', isPrimary: false, position: { x: -1.5, y: -2 } },
              { number: '3', isPrimary: false, position: { x: -1, y: -2 } }
            ]
          }
        ],
        // 添加过孔
        holes: [
          {
            id: 'VIA1',
            name: '过孔1',
            position: { x: 25, y: 25 },
            diameter: 0.3,
            viaType: 'plated' as const,
            startLayer: 'TOP',
            endLayer: 'BOTTOM',
            padDiameter: 0.6,
            netName: 'GND'
          },
          {
            id: 'VIA2',
            position: { x: 75, y: 25 },
            diameter: 0.2,
            viaType: 'micro' as const,
            startLayer: 'TOP',
            endLayer: 'L2',
            padDiameter: 0.4,
            netName: 'VCC'
          },
          {
            id: 'HOLE1',
            name: '安装孔',
            position: { x: 10, y: 10 },
            diameter: 3.0,
            viaType: 'non-plated' as const,
            startLayer: 'TOP',
            endLayer: 'BOTTOM'
          }
        ],
        // 添加禁止区
        keepouts: [
          {
            id: 'KO1',
            name: '散热器下方禁止区',
            constraintType: 'component' as const,
            purpose: 'ComponentPlacement',
            shape: {
              type: 'rectangle' as const,
              points: [
                { x: 60, y: 40 },
                { x: 80, y: 40 },
                { x: 80, y: 60 },
                { x: 60, y: 60 }
              ]
            },
            height: {
              min: 0,
              max: 5
            },
            layer: 'TOP',
            enabled: true,
            properties: {
              reason: '散热器安装区域',
              priority: 'high'
            }
          },
          {
            id: 'KO2',
            name: '布线禁止区',
            constraintType: 'route' as const,
            purpose: 'RouteKeepout',
            shape: {
              type: 'circle' as const,
              points: [{ x: 20, y: 60 }],
              radius: 8
            },
            layer: 'TOP',
            enabled: true
          },
          {
            id: 'KO3',
            name: '过孔禁止区',
            constraintType: 'via' as const,
            purpose: 'ViaKeepout',
            shape: {
              type: 'polygon' as const,
              points: [
                { x: 85, y: 10 },
                { x: 95, y: 10 },
                { x: 95, y: 25 },
                { x: 90, y: 30 },
                { x: 85, y: 25 }
              ]
            },
            layer: 'ALL',
            enabled: true
          }
        ]
      }
    };

    console.log('📋 集成测试数据准备完成');
    console.log(`   - 组件数量: ${boardData.board.components?.length || 0}`);
    console.log(`   - 过孔数量: ${boardData.board.holes?.length || 0}`);
    console.log(`   - 禁止区数量: ${boardData.board.keepouts?.length || 0}`);

    // 执行导出
    const result = await exporter.export(boardData);
    
    if (result.success) {
      console.log('✅ 集成导出成功！');
      console.log(`📊 统计信息:`);
      console.log(`   项目总数: ${result.statistics.totalItems}`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   禁止区数量: ${result.statistics.keepouts}`);
      console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);
      
      if (result.issues.length > 0) {
        console.log('⚠️  导出问题:');
        result.issues.forEach(issue => {
          const prefix = issue.type === 'error' ? '❌' : '⚠️';
          console.log(`   ${prefix} ${issue.message}`);
        });
      }
      
      // 保存XML到文件
      if ('xmlContent' in result) {
        const outputDir = './output';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filePath = path.join(outputDir, 'integrated-test.idx');
        fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
        console.log(`💾 XML文件已保存到: ${filePath}`);
        
        // 验证XML结构
        console.log('🔍 验证XML结构...');
        validateIntegratedXMLStructure(result.xmlContent);
      }
      
    } else {
      console.error('❌ 集成导出失败:');
      result.issues.forEach(issue => {
        console.error(`   ${issue.type}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.error('💥 集成测试过程中发生错误:', error);
  }
}

function validateIntegratedXMLStructure(xmlContent: string) {
  const checks = [
    // 基础结构检查
    { name: 'XML声明', pattern: /<\?xml version="1\.0" encoding="UTF-8"\?>/ },
    { name: 'EDMDDataSet根元素', pattern: /<foundation:EDMDDataSet/ },
    { name: 'Header元素', pattern: /<foundation:Header/ },
    { name: 'Body元素', pattern: /<foundation:Body/ },
    { name: 'ProcessInstruction元素', pattern: /<foundation:ProcessInstruction/ },
    
    // 系统信息检查
    { name: 'CreatorSystem', pattern: /<foundation:CreatorSystem>IDX-IO-IntegratedTest<\/foundation:CreatorSystem>/ },
    { name: 'GlobalUnitLength', pattern: /<foundation:GlobalUnitLength>UNIT_MM<\/foundation:GlobalUnitLength>/ },
    
    // 项目类型检查
    { name: 'Assembly ItemType', pattern: /<pdm:ItemType>assembly<\/pdm:ItemType>/ },
    { name: 'Single ItemType', pattern: /<pdm:ItemType>single<\/pdm:ItemType>/ },
    
    // 几何类型检查
    { name: 'Board几何类型', pattern: /geometryType="BOARD_OUTLINE"/ },
    { name: 'Component几何类型', pattern: /geometryType="COMPONENT"/ },
    { name: 'Via几何类型', pattern: /geometryType="VIA"/ },
    { name: 'Keepout几何类型', pattern: /geometryType="KEEPOUT_AREA/ },
    
    // 基线标记检查
    { name: 'Baseline标记', pattern: /<pdm:Baseline>/ },
    { name: 'Baseline值', pattern: /<property:Value>true<\/property:Value>/ },
    
    // 组件相关检查
    { name: '组件位号C1', pattern: /<foundation:Name>C1<\/foundation:Name>/ },
    { name: '组件位号R1', pattern: /<foundation:Name>R1<\/foundation:Name>/ },
    { name: '组件位号U1', pattern: /<foundation:Name>U1<\/foundation:Name>/ },
    
    // 过孔相关检查
    { name: '过孔VIA1', pattern: /VIA1/ },
    { name: '过孔直径属性', pattern: /DIAMETER/ },
    
    // 禁止区相关检查
    { name: '禁止区KO1', pattern: /KO1/ },
    { name: '约束类型属性', pattern: /CONSTRAINT_TYPE/ },
    
    // 形状元素检查
    { name: 'ShapeElement', pattern: /<foundation:ShapeElement/ },
    { name: 'CurveSet2D', pattern: /<foundation:CurveSet2d/ },
    { name: 'Circle', pattern: /<foundation:CircleCenter/ },
    { name: 'PolyLine', pattern: /<foundation:PolyLine/ }
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
  
  // 统计各类型项目数量
  const itemCounts = {
    total: (xmlContent.match(/<foundation:Item /g) || []).length,
    components: (xmlContent.match(/geometryType="COMPONENT"/g) || []).length,
    vias: (xmlContent.match(/geometryType="VIA"/g) || []).length + (xmlContent.match(/geometryType="HOLE_NON_PLATED"/g) || []).length,
    keepouts: (xmlContent.match(/geometryType="KEEPOUT_AREA/g) || []).length,
    shapes: (xmlContent.match(/<foundation:ShapeElement/g) || []).length
  };
  
  console.log('📊 XML内容统计:');
  console.log(`   总项目数: ${itemCounts.total}`);
  console.log(`   组件数: ${itemCounts.components}`);
  console.log(`   过孔数: ${itemCounts.vias}`);
  console.log(`   禁止区数: ${itemCounts.keepouts}`);
  console.log(`   形状元素数: ${itemCounts.shapes}`);
  
  if (passedChecks >= checks.length * 0.8) {
    console.log('🎉 XML结构验证基本通过！');
  } else {
    console.log('⚠️  XML结构验证部分通过，请检查失败项');
  }
}

// 运行集成测试
testIntegratedExport().then(() => {
  console.log('🎉 集成测试完成');
}).catch(error => {
  console.error('💥 集成测试失败:', error);
  process.exit(1);
});