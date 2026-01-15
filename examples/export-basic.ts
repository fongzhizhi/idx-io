// ============= 基础导出示例 =============

import { IDXExporter, GlobalUnit, ExportSourceData } from '../src';

async function exportSimpleBoard() {
  // 创建导出器配置
  const exporter = new IDXExporter({
    output: {
      directory: './output',
      designName: 'SimpleBoard',
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
      includeLayerStackup: false
    }
  });

  // 准备PCB数据（简化示例）
  const boardData: ExportSourceData = {
    board: {
      id: 'BOARD_001',
      name: 'MainBoard',
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 100, y: 80 },
          { x: 0, y: 80 }
        ],
        thickness: 1.6,
        material: 'FR4',
        finish: 'HASL'
      }
    },
    components: [],
    holes: [],
    keepouts: []
  };

  try {
    // 执行导出
    const result = await exporter.export(boardData);
    
    if (result.success) {
      console.log('✅ 导出成功！');
      console.log(`📁 生成文件: ${result.files.map(f => f.path).join(', ')}`);
      console.log(`📊 统计信息:`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);
      
      if (result.issues.length > 0) {
        console.log('⚠️  导出警告:');
        result.issues.forEach(issue => {
          console.log(`   ${issue.type}: ${issue.message}`);
        });
      }
    } else {
      console.error('❌ 导出失败:', result.issues);
    }
  } catch (error) {
    console.error('💥 导出过程中发生错误:', error);
  }
}

// 运行示例
exportSimpleBoard();
