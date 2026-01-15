// ============= 简单的导出测试 =============

import { IDXExporter, GlobalUnit } from './src/exporter';

async function testExport() {
  console.log('🚀 开始测试IDX导出器...');
  
  try {
    // 创建导出器配置
    const exporter = new IDXExporter({
      output: {
        directory: './output',
        designName: 'TestBoard',
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
        creatorSystem: 'IDX-IO-Test',
        creatorCompany: 'TestCompany',
        includeNonCollaborative: false,
        includeLayerStackup: false
      },
      validation: {
        enabled: false,
        strictness: 'normal'
      }
    });

    console.log('✅ 导出器创建成功');

    // 准备简单的PCB数据
    const boardData = {
      board: {
        id: 'TEST_BOARD_001',
        name: 'TestBoard',
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
      components: [],
      holes: [],
      keepouts: []
    };

    console.log('📋 测试数据准备完成');

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
        console.log('⚠️  导出警告:');
        result.issues.forEach(issue => {
          console.log(`   ${issue.type}: ${issue.message}`);
        });
      }
      
      // 如果是浏览器版本，显示XML内容的前几行
      if ('xmlContent' in result) {
        console.log('📝 生成的XML内容（前500字符）:');
        console.log(result.xmlContent.substring(0, 500) + '...');
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

// 运行测试
testExport().then(() => {
  console.log('🎉 测试完成');
}).catch(error => {
  console.error('💥 测试失败:', error);
  process.exit(1);
});