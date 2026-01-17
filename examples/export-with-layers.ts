// ============= 多层板导出示例 =============
// 
// 本示例展示了IDX导出器的多层板导出功能，包括：
// - 完整的层叠结构定义
// - 协议合规性验证
// - 标准几何类型使用
// - 正确的组件三层结构
// - 规范的命名空间使用
// 
// 协议合规性修复包括：
// - ProcessInstruction使用computational命名空间
// - 形状引用使用正确格式（非href）
// - 几何类型使用IDX v4.5标准值
// - 变换矩阵使用正确的XML结构
// - 用户属性使用规范的命名空间
//

import { IDXExporter, GlobalUnit, BrowserExportResult } from '../src';
import { ExtendedExportSourceData, LayerType, createDefault4LayerStackup } from '../src/types/data-models';
import * as fs from 'fs';
import * as path from 'path';

async function exportMultiLayerBoard() {
  // 创建导出器配置，启用层叠结构支持
  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'MultiLayerBoard',
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
      creatorSystem: 'MyECADSystem',
      creatorCompany: 'MyCompany',
      includeNonCollaborative: false,
      includeLayerStackup: true  // 启用层叠结构导出
    },
    validation: {
      enabled: true,           // 启用协议合规性验证
      strictness: 'normal'     // 验证严格程度：'lenient' | 'normal' | 'strict'
    }
  }, {
    // 启用XML注释以便更好地理解层结构
    enabled: true,
    includeFileHeader: true,
    includeItemComments: true,
    includeGeometryComments: true,
    includeSectionComments: true
  });

  // 准备多层板数据（使用新的ExtendedExportSourceData接口）
  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'MULTILAYER_BOARD_001',
      name: 'Multi-Layer Demo Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 0, y: 80 }
        ],
        thickness: 1.6
      }
    },
    // 定义完整的4层板层结构
    layers: [
      {
        id: 'L1_TOP',
        name: 'Top Signal Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1,
        color: '#FF0000'
      },
      {
        id: 'L2_GND',
        name: 'Ground Plane',
        type: LayerType.PLANE,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1,
        color: '#00FF00'
      },
      {
        id: 'L3_PWR',
        name: 'Power Plane',
        type: LayerType.PLANE,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1,
        color: '#0000FF'
      },
      {
        id: 'L4_BOTTOM',
        name: 'Bottom Signal Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1,
        color: '#FFFF00'
      },
      {
        id: 'TOP_SOLDERMASK',
        name: 'Top Soldermask',
        type: LayerType.SOLDERMASK,
        thickness: 0.02,
        material: 'LPI Green',
        color: '#008000'
      },
      {
        id: 'BOTTOM_SOLDERMASK',
        name: 'Bottom Soldermask',
        type: LayerType.SOLDERMASK,
        thickness: 0.02,
        material: 'LPI Green',
        color: '#008000'
      },
      {
        id: 'TOP_SILKSCREEN',
        name: 'Top Silkscreen',
        type: LayerType.SILKSCREEN,
        thickness: 0.01,
        material: 'White Ink',
        color: '#FFFFFF'
      },
      {
        id: 'BOTTOM_SILKSCREEN',
        name: 'Bottom Silkscreen',
        type: LayerType.SILKSCREEN,
        thickness: 0.01,
        material: 'White Ink',
        color: '#FFFFFF'
      },
      {
        id: 'D1_PREPREG',
        name: 'Prepreg 1',
        type: LayerType.DIELECTRIC,
        thickness: 0.2,
        material: 'FR4',
        dielectricConstant: 4.5,
        lossTangent: 0.02
      },
      {
        id: 'CORE',
        name: 'Core',
        type: LayerType.DIELECTRIC,
        thickness: 1.065,
        material: 'FR4',
        dielectricConstant: 4.5,
        lossTangent: 0.02
      },
      {
        id: 'D2_PREPREG',
        name: 'Prepreg 2',
        type: LayerType.DIELECTRIC,
        thickness: 0.2,
        material: 'FR4',
        dielectricConstant: 4.5,
        lossTangent: 0.02
      }
    ],
    // 定义层叠结构（从底到顶）
    layerStackup: {
      id: 'STACKUP_4L_DEMO',
      name: '4-Layer Demo Stackup',
      description: 'Standard 4-layer PCB with soldermask and silkscreen',
      totalThickness: 1.6,
      boardType: 'rigid',
      layers: [
        { layerId: 'BOTTOM_SILKSCREEN', position: 1, thickness: 0.01 },
        { layerId: 'BOTTOM_SOLDERMASK', position: 2, thickness: 0.02 },
        { layerId: 'L4_BOTTOM', position: 3, thickness: 0.035 },
        { layerId: 'D2_PREPREG', position: 4, thickness: 0.2 },
        { layerId: 'L3_PWR', position: 5, thickness: 0.035 },
        { layerId: 'CORE', position: 6, thickness: 1.065 },
        { layerId: 'L2_GND', position: 7, thickness: 0.035 },
        { layerId: 'D1_PREPREG', position: 8, thickness: 0.2 },
        { layerId: 'L1_TOP', position: 9, thickness: 0.035 },
        { layerId: 'TOP_SOLDERMASK', position: 10, thickness: 0.02 },
        { layerId: 'TOP_SILKSCREEN', position: 11, thickness: 0.01 }
      ],
      impedanceControl: {
        singleEnded: 50,
        differential: 100,
        tolerance: 10
      }
    },
    // 添加一些组件来展示多层板功能
    components: [
      {
        refDes: 'U1',
        partNumber: 'STM32F407VGT6',
        packageName: 'LQFP-100',
        position: { x: 50, y: 40, z: 1.6, rotation: 0 },
        dimensions: { width: 14, height: 14, thickness: 1.6 },
        layer: 'L1_TOP',
        pins: [
          { number: '1', position: { x: -6.5, y: 6.5 }, diameter: 0.3, shape: 'round', netName: 'VCC' },
          { number: '2', position: { x: -6.5, y: 6.0 }, diameter: 0.3, shape: 'round', netName: 'GND' }
        ]
      },
      {
        refDes: 'C1',
        partNumber: 'CAP_100nF_0603',
        packageName: '0603',
        position: { x: 30, y: 30, z: 1.6, rotation: 90 },
        dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
        layer: 'L1_TOP'
      },
      {
        refDes: 'R1',
        partNumber: 'RES_10K_0603',
        packageName: '0603',
        position: { x: 70, y: 50, z: 0, rotation: 180 },
        dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
        layer: 'L4_BOTTOM'
      }
    ],
    // 添加过孔来连接不同层
    holes: [
      {
        id: 'VIA_VCC_001',
        type: 'plated',
        viaType: 'through',
        position: { x: 45, y: 35 },
        diameter: 0.2,
        platingThickness: 0.025,
        startLayer: 'L1_TOP',
        endLayer: 'L3_PWR',
        netName: 'VCC',
        purpose: 'via'
      },
      {
        id: 'VIA_GND_001',
        type: 'plated',
        viaType: 'through',
        position: { x: 55, y: 45 },
        diameter: 0.2,
        platingThickness: 0.025,
        startLayer: 'L1_TOP',
        endLayer: 'L2_GND',
        netName: 'GND',
        purpose: 'via'
      },
      {
        id: 'MOUNTING_HOLE_001',
        type: 'non-plated',
        position: { x: 10, y: 10 },
        diameter: 3.2,
        purpose: 'mounting'
      }
    ],
    // 添加禁止区来展示层约束
    keepouts: [
      {
        id: 'KEEPOUT_MOUNTING',
        type: 'component',
        geometry: {
          type: 'circle',
          center: { x: 10, y: 10 },
          radius: 5
        },
        layers: ['L1_TOP', 'L4_BOTTOM'],
        purpose: 'mechanical',
        height: { min: 0, max: 'infinity' }
      },
      {
        id: 'KEEPOUT_HIGH_SPEED',
        type: 'trace',
        geometry: {
          type: 'rectangle',
          center: { x: 50, y: 40 },
          width: 20,
          height: 20
        },
        layers: ['L1_TOP', 'L2_GND'],
        purpose: 'routing',
        severity: 'warning'
      }
    ]
  };

  try {
    // 执行导出
    const result: BrowserExportResult = await exporter.export(boardData);
    
    if (result.success) {
      console.log('✅ 多层板导出成功！');
      console.log(`📄 生成文件: ${result.fileName}`);
      
      // 检查协议合规性验证结果
      if (result.validation) {
        console.log('\n🔍 协议合规性验证结果:');
        console.log(`   验证通过: ${result.validation.passed ? '✅' : '❌'}`);
        console.log(`   错误数量: ${result.validation.errors.length}`);
        console.log(`   警告数量: ${result.validation.warnings.length}`);
        
        if (result.validation.errors.length > 0) {
          console.log('\n❌ 协议合规性错误:');
          result.validation.errors.forEach((error, index) => {
            console.error(`   ${index + 1}. ${error}`);
          });
        }
        
        if (result.validation.warnings.length > 0) {
          console.log('\n⚠️  协议合规性警告:');
          result.validation.warnings.forEach((warning, index) => {
            console.warn(`   ${index + 1}. ${warning}`);
          });
        }
        
        if (result.validation.passed) {
          console.log('\n🎉 生成的IDX文件完全符合IDX v4.5协议规范！');
        }
      }
      
      console.log(`\n📊 统计信息:`);
      console.log(`   总项目数: ${result.statistics.totalItems}`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   禁止区数量: ${result.statistics.keepouts}`);
      console.log(`   层数量: ${result.statistics.layers}`);
      console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);
      
      // 显示层叠结构信息
      console.log('\n📋 层叠结构信息:');
      if (boardData.layerStackup) {
        console.log(`   层叠名称: ${boardData.layerStackup.name}`);
        console.log(`   总厚度: ${boardData.layerStackup.totalThickness}mm`);
        console.log(`   层数: ${boardData.layerStackup.layers.length}`);
        console.log('   层序列 (从底到顶):');
        boardData.layerStackup.layers.forEach((layer, index) => {
          const layerData = boardData.layers?.find(l => l.id === layer.layerId);
          console.log(`     ${index + 1}. ${layerData?.name || layer.layerId} (${layer.thickness}mm)`);
        });
      }
      
      // 在浏览器中创建下载链接
      // 注意：此示例在Node.js环境中运行，浏览器相关代码已注释
      /*
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const downloadUrl = exporter.createDownloadUrl(result.xmlContent);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = result.fileName;
        link.textContent = `下载 ${result.fileName}`;
        link.style.display = 'block';
        link.style.margin = '10px';
        link.style.padding = '10px';
        link.style.backgroundColor = '#4CAF50';
        link.style.color = 'white';
        link.style.textDecoration = 'none';
        link.style.borderRadius = '4px';
        document.body.appendChild(link);
        
        console.log('🔗 下载链接已创建');
      } else {
      */
        // Node.js环境下保存文件
        const outputDir = './output';
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        const filePath = path.join(outputDir, result.fileName);
        fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
        console.log(`\n💾 文件已保存: ${filePath}`);
        console.log(`📝 XML内容预览 (前500字符):`);
        console.log(result.xmlContent.substring(0, 500) + '...');
      // }
      
      if (result.issues.length > 0) {
        console.log('\n⚠️  导出问题:');
        result.issues.forEach(issue => {
          console.log(`   [${issue.type.toUpperCase()}] ${issue.message}`);
        });
      }
    } else {
      console.error('❌ 多层板导出失败:');
      result.issues.forEach(issue => {
        console.error(`   [${issue.type.toUpperCase()}] ${issue.code}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.error('💥 导出过程中发生错误:', error);
  }
}

/**
 * 创建简化的4层板示例（使用默认层叠结构）
 */
async function exportSimple4LayerBoard() {
  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'Simple4Layer',
      compress: false,
      namingPattern: '{designName}_{type}.idx'
    },
    collaboration: {
      creatorSystem: 'IDX-IO',
      creatorCompany: 'Demo Company',
      includeNonCollaborative: false,
      includeLayerStackup: true
    },
    validation: {
      enabled: true,           // 启用验证功能
      strictness: 'normal'     // 验证严格程度
    }
  });

  // 使用预定义的4层板层叠结构
  const defaultStackup = createDefault4LayerStackup();
  
  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'SIMPLE_4L_BOARD',
      name: 'Simple 4-Layer Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 }
        ],
        thickness: 1.6
      }
    },
    layerStackup: defaultStackup
  };

  const result = await exporter.export(boardData);
  
  if (result.success) {
    console.log('\n✅ 简化4层板导出成功！');
    console.log(`📄 文件: ${result.fileName}`);
    console.log(`📊 项目数: ${result.statistics.totalItems}`);
    
    // 显示验证结果
    if (result.validation) {
      console.log(`🔍 验证结果: ${result.validation.passed ? '通过' : '失败'}`);
      if (result.validation.errors.length > 0) {
        console.log(`❌ 错误: ${result.validation.errors.length}个`);
      }
      if (result.validation.warnings.length > 0) {
        console.log(`⚠️  警告: ${result.validation.warnings.length}个`);
      }
    }
    
    // Node.js环境下保存文件
    // if (typeof window === 'undefined') {
      const outputDir = './output';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const filePath = path.join(outputDir, result.fileName);
      fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
      console.log(`💾 文件已保存: ${filePath}`);
    // }
  } else {
    console.error('❌ 简化4层板导出失败:', result.issues);
  }
}

/**
 * 浏览器环境下的多层板导出示例
 */
function createMultiLayerBrowserExample() {
  // 类型守卫：确保在浏览器环境中
  // if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('此示例需要在浏览器环境中运行');
    return;
  // }

  /*
  // 创建控制面板
  const panel = document.createElement('div');
  panel.style.padding = '20px';
  panel.style.fontFamily = 'Arial, sans-serif';
  
  const title = document.createElement('h2');
  title.textContent = 'IDX多层板导出示例';
  panel.appendChild(title);
  
  // 完整多层板导出按钮
  const fullButton = document.createElement('button');
  fullButton.textContent = '导出完整多层板';
  fullButton.style.margin = '10px';
  fullButton.style.padding = '10px 20px';
  fullButton.style.fontSize = '16px';
  fullButton.onclick = async () => {
    fullButton.disabled = true;
    fullButton.textContent = '导出中...';
    try {
      await exportMultiLayerBoard();
    } finally {
      fullButton.disabled = false;
      fullButton.textContent = '导出完整多层板';
    }
  };
  panel.appendChild(fullButton);
  
  // 简化4层板导出按钮
  const simpleButton = document.createElement('button');
  simpleButton.textContent = '导出简化4层板';
  simpleButton.style.margin = '10px';
  simpleButton.style.padding = '10px 20px';
  simpleButton.style.fontSize = '16px';
  simpleButton.onclick = async () => {
    simpleButton.disabled = true;
    simpleButton.textContent = '导出中...';
    try {
      await exportSimple4LayerBoard();
    } finally {
      simpleButton.disabled = false;
      simpleButton.textContent = '导出简化4层板';
    }
  };
  panel.appendChild(simpleButton);
  
  document.body.appendChild(panel);
  */
}

// 运行示例
// if (typeof window !== 'undefined') {
  // 浏览器环境
  // createMultiLayerBrowserExample();
// } else {
  // Node.js环境 - 运行两个示例
  console.log('🚀 开始多层板导出示例...\n');
  
  exportMultiLayerBoard()
    .then(() => exportSimple4LayerBoard())
    .catch(console.error);
// }