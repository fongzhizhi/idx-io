// ============= 测试导出功能 =============

import { IDXExporter, GlobalUnit, ExportSourceData } from './src';

async function testExport() {
  console.log('🚀 开始测试IDX导出功能...\n');
  
  try {
    // 创建导出器
    const exporter = new IDXExporter({
      output: {
        directory: './output',
        designName: 'TestBoard',
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
        creatorSystem: 'IDX-IO-Test',
        creatorCompany: 'Test Company',
        includeNonCollaborative: false,
        includeLayerStackup: false
      }
    });

    // 准备测试数据
    const testData: ExportSourceData = {
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
          thickness: 1.6,
          material: 'FR4',
          finish: 'HASL'
        }
      },
      components: [],
      holes: [],
      keepouts: []
    };

    console.log('📋 测试数据准备完成');
    console.log(`   板子尺寸: 50mm x 30mm x 1.6mm`);
    console.log(`   轮廓点数: ${testData.board.outline.points.length}`);
    console.log('');

    // 执行导出
    console.log('⚙️  开始导出...');
    const result = await exporter.export(testData);

    if (result.success) {
      console.log('✅ 导出成功！\n');
      
      console.log('📁 生成的文件:');
      result.files.forEach(file => {
        console.log(`   ${file.name}`);
        console.log(`   路径: ${file.path}`);
        console.log(`   大小: ${(result.statistics.fileSize / 1024).toFixed(2)} KB`);
        console.log(`   时间: ${file.timestamp}`);
      });
      
      console.log('\n📊 导出统计:');
      console.log(`   总项目数: ${result.statistics.totalItems}`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   保持区域: ${result.statistics.keepouts}`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);
      
      if (result.issues.length > 0) {
        console.log('\n⚠️  导出问题:');
        result.issues.forEach(issue => {
          const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`   ${icon} ${issue.code}: ${issue.message}`);
        });
      }
      
    } else {
      console.log('❌ 导出失败\n');
      
      console.log('错误信息:');
      result.issues.forEach(issue => {
        console.log(`   ${issue.code}: ${issue.message}`);
      });
    }
    
  } catch (error: any) {
    console.error('💥 测试过程中发生错误:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testExport();