// ============= 简单矩形板子案例 =============
// DESIGN: 验证IDX基本结构的最小化案例
// BUSINESS: 创建一个50x30mm的矩形板子，厚度1.6mm，无其他元素

import { IDXExporter } from '../../src/exporter/IDXExporter';
import { ExtendedExportSourceData, createRectangularBoardOutline } from '../../src/types/exporter/idx-exporter';
import { GlobalUnit } from '../../src/types/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 创建简单矩形板子数据
 * 
 * @remarks
 * 最小化的板子定义，只包含基本的板框轮廓
 * 用于验证IDX导出器的基本功能
 */
function createSimpleRectangleBoard(): ExtendedExportSourceData {
  return {
    board: {
      id: 'SIMPLE_RECT_BOARD',
      name: 'Simple Rectangle Board',
      outline: createRectangularBoardOutline(50, 30, 1.6), // 50x30mm, 1.6mm厚
      properties: {
        description: 'Simple rectangular board for IDX structure validation',
        designRule: 'Basic',
        material: 'FR4'
      }
    }
  };
}

/**
 * 导出简单矩形板子到IDX文件
 */
async function exportSimpleRectangleBoard() {
  console.log('开始导出简单矩形板子...');
  
  // 创建输出目录
  const outputDir = path.join(__dirname, '../../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 创建IDX导出器
  const exporter = new IDXExporter({
    output: {
      directory: outputDir,
      designName: 'simple-rectangle-board',
      compress: false,
      namingPattern: '{designName}_{type}.idx'
    },
    geometry: {
      useSimplified: true,
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 3
    },
    collaboration: {
      creatorSystem: 'IDX-IO-Example',
      creatorCompany: 'Test Company',
      includeNonCollaborative: false,
      includeLayerStackup: false
    }
  }, {
    enabled: true,
    includeFileHeader: true,
    includeItemComments: true,
    includeGeometryComments: true,
    includeSectionComments: true
  });
  
  // 创建板子数据
  const boardData = createSimpleRectangleBoard();
  
  try {
    // 导出IDX文件
    const result = await exporter.export(boardData);
    
    if (result.success) {
      // 写入文件
      const filePath = path.join(outputDir, result.fileName);
      fs.writeFileSync(filePath, result.xmlContent, 'utf-8');
      
      console.log('✅ 导出成功!');
      console.log(`📁 文件路径: ${filePath}`);
      console.log(`📊 统计信息:`);
      console.log(`   - 总项目数: ${result.statistics.totalItems}`);
      console.log(`   - 文件大小: ${(result.statistics.fileSize / 1024).toFixed(2)} KB`);
      console.log(`   - 导出耗时: ${result.statistics.exportDuration} ms`);
      
      if (result.issues.length > 0) {
        console.log(`⚠️  问题和警告:`);
        result.issues.forEach(issue => {
          console.log(`   - ${issue.type.toUpperCase()}: ${issue.message}`);
        });
      }
    } else {
      console.error('❌ 导出失败!');
      result.issues.forEach(issue => {
        console.error(`   - ${issue.type.toUpperCase()}: ${issue.message}`);
      });
    }
  } catch (error) {
    console.error('❌ 导出过程中发生错误:', error);
  }
}

// 如果直接运行此文件，则执行导出
if (require.main === module) {
  exportSimpleRectangleBoard().catch(console.error);
}

export { createSimpleRectangleBoard, exportSimpleRectangleBoard };