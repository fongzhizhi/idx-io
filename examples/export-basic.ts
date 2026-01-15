// ============= 基础导出示例 - 浏览器版本 =============

import { IDXExporter, GlobalUnit, ExportSourceData, BrowserExportResult } from '../src';

async function exportSimpleBoard() {
  // 创建导出器配置
  const exporter = new IDXExporter({
    output: {
      directory: '', // 浏览器环境下不需要目录
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
    },
    validation: {
      enabled: false,
      strictness: 'normal'
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
    const result: BrowserExportResult = await exporter.export(boardData);
    
    if (result.success) {
      console.log('✅ 导出成功！');
      console.log(`📄 生成文件: ${result.fileName}`);
      console.log(`📊 统计信息:`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   文件大小: ${result.statistics.fileSize} 字节`);
      console.log(`   导出耗时: ${result.statistics.exportDuration}ms`);
      
      // 在浏览器中创建下载链接
      if (typeof window !== 'undefined') {
        const downloadUrl = exporter.createDownloadUrl(result.xmlContent);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = result.fileName;
        link.textContent = `下载 ${result.fileName}`;
        document.body.appendChild(link);
        
        console.log('🔗 下载链接已创建，点击下载文件');
        
        // 可选：自动触发下载
        // link.click();
        
        // 清理URL对象（可选，在用户下载后）
        // URL.revokeObjectURL(downloadUrl);
      } else {
        // Node.js环境下输出XML内容
        console.log('📝 XML内容:');
        console.log(result.xmlContent);
      }
      
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

/**
 * 浏览器环境下的使用示例
 */
function createBrowserDownloadExample() {
  if (typeof window === 'undefined') {
    console.log('此示例需要在浏览器环境中运行');
    return;
  }

  // 创建一个按钮来触发导出
  const button = document.createElement('button');
  button.textContent = '导出IDX文件';
  button.onclick = async () => {
    button.disabled = true;
    button.textContent = '导出中...';
    
    try {
      await exportSimpleBoard();
    } finally {
      button.disabled = false;
      button.textContent = '导出IDX文件';
    }
  };
  
  document.body.appendChild(button);
}

// 运行示例
if (typeof window !== 'undefined') {
  // 浏览器环境
  createBrowserDownloadExample();
} else {
  // Node.js环境
  exportSimpleBoard();
}
