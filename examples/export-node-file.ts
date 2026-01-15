// ============= Node.js文件导出示例 =============
// DESIGN: 展示如何在Node.js环境中使用IDXFileWriter
// NOTE: 此示例仅适用于Node.js环境，不能在浏览器中运行

import { IDXFileWriter, exportToFile, exportBatch } from '../src/exporter/writers/file-writer';
import { ExtendedExportSourceData, LayerType } from '../src/types/data-models';
import { GlobalUnit } from '../src/types/core';

/**
 * 基础文件导出示例
 */
async function basicFileExport() {
  console.log('🚀 Node.js基础文件导出示例...\n');

  // 创建文件写入器
  const fileWriter = new IDXFileWriter({
    output: {
      directory: './output',
      designName: 'NodeTestBoard',
      compress: false,
      namingPattern: '{designName}_{type}_{timestamp}.idx'
    },
    protocolVersion: '4.5',
    geometry: {
      useSimplified: true,
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 6
    },
    collaboration: {
      creatorSystem: 'IDX-IO-Node',
      creatorCompany: 'Node.js Test Company',
      includeNonCollaborative: false,
      includeLayerStackup: true
    }
  }, {
    // 启用详细注释
    enabled: true,
    includeFileHeader: true,
    includeItemComments: true,
    includeGeometryComments: true,
    includeSectionComments: true
  });

  // 准备测试数据
  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'NODE_TEST_BOARD',
      name: 'Node.js Test Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 60, y: 0 },
          { x: 60, y: 40 },
          { x: 0, y: 40 }
        ],
        thickness: 1.6
      }
    },
    layers: [
      {
        id: 'L1_TOP',
        name: 'Top Signal Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      },
      {
        id: 'L2_BOTTOM',
        name: 'Bottom Signal Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      }
    ],
    components: [
      {
        refDes: 'U1',
        partNumber: 'MCU_TEST',
        packageName: 'QFN-32',
        position: { x: 30, y: 20, z: 1.6, rotation: 0 },
        dimensions: { width: 5, height: 5, thickness: 1 },
        layer: 'TOP'
      },
      {
        refDes: 'C1',
        partNumber: 'CAP_10uF_0805',
        packageName: '0805',
        position: { x: 20, y: 15, z: 1.6, rotation: 90 },
        dimensions: { width: 2, height: 1.25, thickness: 0.6 },
        layer: 'TOP'
      }
    ],
    holes: [
      {
        id: 'VIA_001',
        type: 'plated',
        position: { x: 25, y: 25 },
        diameter: 0.2,
        platingThickness: 0.025,
        startLayer: 'L1_TOP',
        endLayer: 'L2_BOTTOM',
        netName: 'VCC'
      }
    ]
  };

  try {
    // 导出到文件
    const result = await fileWriter.exportToFile(boardData, {
      outputDirectory: './output/node-test',
      createDirectory: true,
      overwrite: true,
      filePrefix: 'test_',
      fileSuffix: '_v1'
    });

    if (result.success) {
      console.log('✅ 文件导出成功！');
      console.log(`📄 文件路径: ${result.filePath}`);
      console.log(`📊 统计信息:`);
      console.log(`   总项目数: ${result.statistics.totalItems}`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   层数量: ${result.statistics.layers}`);
      console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);

      if (result.issues.length > 0) {
        console.log('\n⚠️  导出问题:');
        result.issues.forEach(issue => {
          console.log(`   [${issue.type.toUpperCase()}] ${issue.message}`);
        });
      }
    } else {
      console.error('❌ 文件导出失败:');
      result.issues.forEach(issue => {
        console.error(`   [${issue.type.toUpperCase()}] ${issue.code}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.error('💥 导出过程中发生错误:', error);
  }
}

/**
 * 便捷函数导出示例
 */
async function convenientExport() {
  console.log('\n🎯 便捷函数导出示例...\n');

  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'CONVENIENT_BOARD',
      name: 'Convenient Export Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 30, y: 0 },
          { x: 30, y: 20 },
          { x: 0, y: 20 }
        ],
        thickness: 1.6
      }
    },
    components: [
      {
        refDes: 'R1',
        partNumber: 'RES_1K_0603',
        packageName: '0603',
        position: { x: 15, y: 10, z: 1.6, rotation: 0 },
        dimensions: { width: 1.6, height: 0.8, thickness: 0.5 },
        layer: 'TOP'
      }
    ]
  };

  try {
    // 使用便捷函数导出
    const result = await exportToFile(
      boardData,
      './output/convenient/convenient_export.idx',
      {
        collaboration: {
          creatorSystem: 'Convenient-Export',
          creatorCompany: 'Test Company',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      },
      {
        enabled: true,
        includeFileHeader: true
      }
    );

    if (result.success) {
      console.log('✅ 便捷导出成功！');
      console.log(`📄 文件路径: ${result.filePath}`);
      console.log(`📊 文件大小: ${result.statistics.fileSize} 字节`);
    } else {
      console.error('❌ 便捷导出失败:', result.issues);
    }
  } catch (error) {
    console.error('💥 便捷导出错误:', error);
  }
}

/**
 * 批量导出示例
 */
async function batchExport() {
  console.log('\n📦 批量导出示例...\n');

  // 准备多个设计
  const designs = [
    {
      name: 'design1',
      data: {
        board: {
          id: 'BATCH_BOARD_1',
          name: 'Batch Design 1',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 25, y: 0 },
              { x: 25, y: 15 },
              { x: 0, y: 15 }
            ],
            thickness: 1.6
          }
        },
        components: [
          {
            refDes: 'U1',
            partNumber: 'IC_BATCH_1',
            packageName: 'SOIC-8',
            position: { x: 12.5, y: 7.5, z: 1.6, rotation: 0 },
            dimensions: { width: 4, height: 5, thickness: 1.5 },
            layer: 'TOP'
          }
        ]
      } as ExtendedExportSourceData
    },
    {
      name: 'design2',
      data: {
        board: {
          id: 'BATCH_BOARD_2',
          name: 'Batch Design 2',
          outline: {
            points: [
              { x: 0, y: 0 },
              { x: 35, y: 0 },
              { x: 35, y: 25 },
              { x: 0, y: 25 }
            ],
            thickness: 1.6
          }
        },
        components: [
          {
            refDes: 'R1',
            partNumber: 'RES_BATCH_2',
            packageName: '0805',
            position: { x: 17.5, y: 12.5, z: 1.6, rotation: 45 },
            dimensions: { width: 2, height: 1.25, thickness: 0.6 },
            layer: 'TOP'
          }
        ]
      } as ExtendedExportSourceData
    }
  ];

  try {
    // 批量导出
    const batchResult = await exportBatch(
      designs,
      './output/batch',
      {
        collaboration: {
          creatorSystem: 'Batch-Export',
          creatorCompany: 'Batch Test Company',
          includeNonCollaborative: false,
          includeLayerStackup: false
        }
      },
      {
        enabled: true,
        includeFileHeader: true,
        includeItemComments: true
      }
    );

    console.log('📊 批量导出结果:');
    console.log(`   总数: ${batchResult.summary.total}`);
    console.log(`   成功: ${batchResult.summary.successful}`);
    console.log(`   失败: ${batchResult.summary.failed}`);
    console.log(`   总大小: ${batchResult.summary.totalSize} 字节`);

    if (batchResult.success) {
      console.log('✅ 批量导出全部成功！');
      
      batchResult.results.forEach((result, index) => {
        if (result.success) {
          console.log(`   ${designs[index].name}: ${result.filePath}`);
        }
      });
    } else {
      console.log('⚠️  批量导出部分失败:');
      
      batchResult.results.forEach((result, index) => {
        if (!result.success) {
          console.log(`   ${designs[index].name}: ${result.issues[0]?.message}`);
        }
      });
    }
  } catch (error) {
    console.error('💥 批量导出错误:', error);
  }
}

/**
 * 高级配置示例
 */
async function advancedConfigExample() {
  console.log('\n⚙️  高级配置示例...\n');

  const fileWriter = new IDXFileWriter({
    output: {
      directory: './output/advanced',
      designName: 'AdvancedBoard',
      compress: false,
      namingPattern: '{designName}_{type}_{timestamp}.idx'
    },
    protocolVersion: '4.5',
    geometry: {
      useSimplified: false, // 使用完整几何表示
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 8 // 高精度
    },
    collaboration: {
      creatorSystem: 'Advanced-IDX-IO',
      creatorCompany: 'Advanced Test Company',
      includeNonCollaborative: true,
      includeLayerStackup: true
    },
    validation: {
      enabled: true,
      strictness: 'strict'
    }
  }, {
    // 详细注释配置
    enabled: true,
    includeFileHeader: true,
    includeItemComments: true,
    includeGeometryComments: true,
    includeSectionComments: true
  }, {
    // 文件写入配置
    createDirectory: true,
    encoding: 'utf8',
    overwrite: false, // 不覆盖现有文件
    filePrefix: 'advanced_',
    fileSuffix: '_final'
  });

  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'ADVANCED_BOARD',
      name: 'Advanced Configuration Board',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 80, y: 0 },
          { x: 80, y: 60 },
          { x: 0, y: 60 }
        ],
        thickness: 1.6
      }
    },
    layers: [
      {
        id: 'L1_TOP',
        name: 'Top Signal Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      },
      {
        id: 'L2_GND',
        name: 'Ground Plane',
        type: LayerType.PLANE,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      },
      {
        id: 'L3_PWR',
        name: 'Power Plane',
        type: LayerType.PLANE,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      },
      {
        id: 'L4_BOTTOM',
        name: 'Bottom Signal Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      }
    ],
    layerStackup: {
      id: 'ADVANCED_STACKUP',
      name: 'Advanced 4-Layer Stackup',
      totalThickness: 1.6,
      layers: [
        { layerId: 'L4_BOTTOM', position: 1, thickness: 0.035 },
        { layerId: 'L3_PWR', position: 2, thickness: 0.035 },
        { layerId: 'L2_GND', position: 3, thickness: 0.035 },
        { layerId: 'L1_TOP', position: 4, thickness: 0.035 }
      ]
    },
    components: [
      {
        refDes: 'U1',
        partNumber: 'ADVANCED_MCU',
        packageName: 'BGA-144',
        position: { x: 40, y: 30, z: 1.6, rotation: 0 },
        dimensions: { width: 10, height: 10, thickness: 1.2 },
        layer: 'TOP'
      }
    ]
  };

  try {
    const result = await fileWriter.exportToFile(boardData);

    if (result.success) {
      console.log('✅ 高级配置导出成功！');
      console.log(`📄 文件路径: ${result.filePath}`);
      console.log(`📊 详细统计:`);
      console.log(`   总项目数: ${result.statistics.totalItems}`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   层数量: ${result.statistics.layers}`);
      console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);

      // 显示配置信息
      const config = fileWriter.getExporterConfig();
      const commentConfig = fileWriter.getCommentConfig();
      
      console.log('\n⚙️  使用的配置:');
      console.log(`   精度: ${config.geometry.precision} 位小数`);
      console.log(`   验证: ${config.validation.enabled ? '启用' : '禁用'}`);
      console.log(`   注释: ${commentConfig.enabled ? '启用' : '禁用'}`);
      console.log(`   层叠结构: ${config.collaboration.includeLayerStackup ? '包含' : '不包含'}`);
    } else {
      console.error('❌ 高级配置导出失败:', result.issues);
    }
  } catch (error) {
    console.error('💥 高级配置导出错误:', error);
  }
}

/**
 * 运行所有示例
 */
async function runAllExamples() {
  console.log('🎬 Node.js文件导出示例集合\n');
  console.log('=' .repeat(60));

  try {
    await basicFileExport();
    await convenientExport();
    await batchExport();
    await advancedConfigExample();
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有示例运行完成！');
    console.log('📁 请检查 ./output 目录中的生成文件');
  } catch (error) {
    console.error('💥 示例运行失败:', error);
  }
}

// 检查运行环境
if (typeof window !== 'undefined') {
  console.error('❌ 此示例仅适用于Node.js环境，不能在浏览器中运行');
  console.log('💡 请在Node.js环境中运行: npx tsx examples/export-node-file.ts');
} else {
  // Node.js环境，运行示例
  runAllExamples().catch(console.error);
}