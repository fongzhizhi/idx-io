# Node.js文件写入器使用指南

## 概述

IDX导出器现在提供了专门的Node.js文件写入器 (`IDXFileWriter`)，用于在服务器端环境中直接将IDX数据导出为文件。这个功能专门为Node.js环境设计，支持本地测试、开发工具和服务器端应用。

## 主要特性

- ✅ **直接文件写入**: 自动创建目录并写入IDX文件到磁盘
- ✅ **批量导出**: 支持一次导出多个设计
- ✅ **灵活配置**: 支持文件名前缀、后缀、编码等配置
- ✅ **错误处理**: 完善的错误处理和恢复机制
- ✅ **便捷函数**: 提供简化的导出函数
- ✅ **完整注释**: 支持所有XML注释功能

## 安装和导入

```typescript
// 导入Node.js专用的文件写入器
import { IDXFileWriter, exportToFile, exportBatch } from '../src/exporter/writers/file-writer';
import { ExtendedExportSourceData } from '../src/types/data-models';
```

**注意**: 文件写入器仅在Node.js环境中可用，不能在浏览器中使用。

## 基础用法

### 1. 创建文件写入器

```typescript
const fileWriter = new IDXFileWriter({
  output: {
    directory: './output',
    designName: 'MyBoard',
    compress: false,
    namingPattern: '{designName}_{type}_{timestamp}.idx'
  },
  collaboration: {
    creatorSystem: 'MyCADSystem',
    creatorCompany: 'My Company',
    includeLayerStackup: true
  }
}, {
  // 注释配置
  enabled: true,
  includeFileHeader: true,
  includeItemComments: true
});
```

### 2. 导出到文件

```typescript
const result = await fileWriter.exportToFile(boardData, {
  outputDirectory: './exports',
  createDirectory: true,
  overwrite: true,
  filePrefix: 'test_',
  fileSuffix: '_v1'
});

if (result.success) {
  console.log(`文件已保存到: ${result.filePath}`);
  console.log(`文件大小: ${result.statistics.fileSize} 字节`);
}
```

## 便捷函数

### 快速导出单个文件

```typescript
import { exportToFile } from '../src/exporter/writers/file-writer';

const result = await exportToFile(
  boardData,
  './output/my_board.idx',
  {
    collaboration: {
      creatorSystem: 'MySystem',
      creatorCompany: 'MyCompany'
    }
  },
  {
    enabled: true,
    includeFileHeader: true
  }
);
```

### 批量导出

```typescript
import { exportBatch } from '../src/exporter/writers/file-writer';

const designs = [
  { name: 'board1', data: boardData1 },
  { name: 'board2', data: boardData2 }
];

const batchResult = await exportBatch(
  designs,
  './output/batch',
  exportConfig,
  commentConfig
);

console.log(`成功导出: ${batchResult.summary.successful}/${batchResult.summary.total}`);
```

## 配置选项

### 文件写入选项 (FileWriterOptions)

```typescript
interface FileWriterOptions {
  /** 输出目录 */
  outputDirectory?: string;
  
  /** 是否创建目录（如果不存在） */
  createDirectory?: boolean;
  
  /** 文件编码 */
  encoding?: BufferEncoding;
  
  /** 是否覆盖现有文件 */
  overwrite?: boolean;
  
  /** 文件名前缀 */
  filePrefix?: string;
  
  /** 文件名后缀 */
  fileSuffix?: string;
}
```

### 使用示例

```typescript
const options: FileWriterOptions = {
  outputDirectory: './exports/production',
  createDirectory: true,
  encoding: 'utf8',
  overwrite: false, // 不覆盖现有文件
  filePrefix: 'prod_',
  fileSuffix: '_final'
};

const result = await fileWriter.exportToFile(boardData, options);
```

## 高级功能

### 1. 动态配置

```typescript
// 运行时修改注释配置
fileWriter.setCommentsEnabled(false);
fileWriter.setCommentConfig({
  enabled: true,
  includeFileHeader: true,
  includeItemComments: false
});

// 获取当前配置
const config = fileWriter.getExporterConfig();
const commentConfig = fileWriter.getCommentConfig();
```

### 2. 文件路径管理

```typescript
// 导出到指定路径
const result = await fileWriter.exportToPath(
  boardData,
  '/absolute/path/to/my_board.idx'
);

// 检查文件是否存在
if (IDXFileWriter.fileExists('./output/board.idx')) {
  console.log('文件已存在');
}

// 生成唯一文件名
const uniqueName = IDXFileWriter.generateUniqueFileName(
  './output',
  'board.idx'
);
```

### 3. 批量导出高级配置

```typescript
const designs = [
  { name: 'design1', data: boardData1 },
  { name: 'design2', data: boardData2 }
];

const fileWriter = new IDXFileWriter(exportConfig, commentConfig);

const batchResult = await fileWriter.exportBatch(designs, {
  outputDirectory: './batch-output',
  createDirectory: true,
  filePrefix: 'batch_',
  fileSuffix: '_processed'
});

// 处理结果
batchResult.results.forEach((result, index) => {
  if (result.success) {
    console.log(`${designs[index].name}: ✅ ${result.filePath}`);
  } else {
    console.log(`${designs[index].name}: ❌ ${result.issues[0]?.message}`);
  }
});
```

## 错误处理

### 常见错误类型

```typescript
if (!result.success) {
  result.issues.forEach(issue => {
    switch (issue.code) {
      case 'FILE_EXISTS':
        console.log('文件已存在，设置 overwrite: true 以覆盖');
        break;
      case 'FILE_WRITE_ERROR':
        console.log('文件写入失败，检查权限和磁盘空间');
        break;
      case 'BATCH_EXPORT_ERROR':
        console.log('批量导出中的单个项目失败');
        break;
      default:
        console.log(`未知错误: ${issue.message}`);
    }
  });
}
```

### 错误恢复

```typescript
try {
  const result = await fileWriter.exportToFile(boardData, {
    overwrite: false
  });
  
  if (!result.success && result.issues[0]?.code === 'FILE_EXISTS') {
    // 生成唯一文件名重试
    const uniqueName = IDXFileWriter.generateUniqueFileName(
      './output',
      'board.idx'
    );
    
    const retryResult = await fileWriter.exportToFile(boardData, {
      outputDirectory: './output',
      filePrefix: '',
      fileSuffix: `_${Date.now()}`
    });
  }
} catch (error) {
  console.error('导出过程发生异常:', error);
}
```

## 性能优化

### 1. 批量导出优化

```typescript
// 对于大量设计，使用批量导出而不是循环单个导出
const designs = generateManyDesigns(); // 假设有很多设计

// ❌ 不推荐：循环单个导出
for (const design of designs) {
  await fileWriter.exportToFile(design.data);
}

// ✅ 推荐：批量导出
const batchResult = await fileWriter.exportBatch(designs);
```

### 2. 配置优化

```typescript
// 对于大文件，禁用详细注释以减少文件大小
const fileWriter = new IDXFileWriter(exportConfig, {
  enabled: false // 禁用注释
});

// 对于高精度要求，调整几何精度
const fileWriter = new IDXFileWriter({
  geometry: {
    precision: 6, // 降低精度以减少文件大小
    useSimplified: true // 使用简化几何
  }
});
```

## 完整示例

```typescript
import { IDXFileWriter } from '../src/exporter/writers/file-writer';
import { ExtendedExportSourceData, LayerType } from '../src/types/data-models';
import { GlobalUnit } from '../src/types/core';

async function completeExample() {
  // 1. 创建文件写入器
  const fileWriter = new IDXFileWriter({
    output: {
      directory: './output',
      designName: 'CompleteExample',
      compress: false
    },
    protocolVersion: '4.5',
    geometry: {
      useSimplified: true,
      defaultUnit: GlobalUnit.UNIT_MM,
      precision: 6
    },
    collaboration: {
      creatorSystem: 'Example-System',
      creatorCompany: 'Example Company',
      includeLayerStackup: true
    }
  }, {
    enabled: true,
    includeFileHeader: true,
    includeItemComments: true
  });

  // 2. 准备数据
  const boardData: ExtendedExportSourceData = {
    board: {
      id: 'EXAMPLE_BOARD',
      name: 'Complete Example Board',
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
    layers: [
      {
        id: 'L1_TOP',
        name: 'Top Layer',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper'
      }
    ],
    components: [
      {
        refDes: 'U1',
        partNumber: 'EXAMPLE_IC',
        packageName: 'QFN-32',
        position: { x: 25, y: 15, z: 1.6, rotation: 0 },
        dimensions: { width: 5, height: 5, thickness: 1 },
        layer: 'TOP'
      }
    ]
  };

  // 3. 导出文件
  try {
    const result = await fileWriter.exportToFile(boardData, {
      outputDirectory: './complete-example',
      createDirectory: true,
      filePrefix: 'example_',
      fileSuffix: '_complete'
    });

    if (result.success) {
      console.log('✅ 导出成功！');
      console.log(`📄 文件: ${result.filePath}`);
      console.log(`📊 大小: ${result.statistics.fileSize} 字节`);
      console.log(`⏱️  耗时: ${result.statistics.exportDuration}ms`);
    } else {
      console.error('❌ 导出失败:', result.issues);
    }
  } catch (error) {
    console.error('💥 导出异常:', error);
  }
}

// 运行示例
completeExample().catch(console.error);
```

## 注意事项

1. **环境限制**: 文件写入器仅在Node.js环境中可用，不能在浏览器中使用
2. **权限要求**: 确保Node.js进程有写入目标目录的权限
3. **磁盘空间**: 大型设计可能生成较大的IDX文件，确保有足够磁盘空间
4. **文件覆盖**: 默认会覆盖现有文件，设置 `overwrite: false` 以避免意外覆盖
5. **编码格式**: 默认使用UTF-8编码，确保与目标系统兼容

## 故障排除

### 常见问题

1. **权限错误**: 确保对输出目录有写权限
2. **路径不存在**: 设置 `createDirectory: true` 自动创建目录
3. **文件被占用**: 确保目标文件没有被其他程序打开
4. **内存不足**: 对于大型设计，考虑分批处理或增加Node.js内存限制

### 调试技巧

```typescript
// 启用详细日志
const result = await fileWriter.exportToFile(boardData);

console.log('导出统计:', result.statistics);
console.log('问题列表:', result.issues);

if (result.success) {
  console.log('文件内容预览:', result.xmlContent.substring(0, 500));
}
```

这个Node.js文件写入器为IDX导出器提供了完整的服务器端文件操作能力，适用于各种自动化和批量处理场景。