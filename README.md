# IDX-IO

IDX协议导入导出器工具库

## 功能特性

- 🚀 现代化的TypeScript实现
- 📦 支持多种导出格式（JSON、XML、YAML）
- 🔧 完整的类型定义
- ✅ 全面的测试覆盖
- 📖 详细的文档说明
- 🛠️ 开发工具完备（ESLint、Prettier、Vitest）

## 安装

```bash
npm install idx-io
```

## 快速开始

```typescript
import { IdxExporter, createIdxData } from 'idx-io'

// 创建IDX数据
const data = createIdxData({
  name: 'example',
  value: 123
})

// 导出为JSON
const jsonOutput = IdxExporter.export(data, {
  format: 'json',
  pretty: true,
  includeMetadata: true
})

console.log(jsonOutput)
```

## API文档

### IdxExporter

主要的导出器类，提供静态方法来导出IDX数据。

#### `IdxExporter.export(data, options)`

导出IDX数据到指定格式。

**参数：**
- `data: IdxData` - 要导出的IDX数据
- `options: ExportOptions` - 导出选项

**返回：**
- `string` - 导出的字符串

### 工具函数

#### `createIdxData(content)`

创建标准的IDX数据结构。

#### `validateIdxData(data)`

验证数据是否符合IDX格式。

## 开发

### 环境要求

- Node.js >= 16
- npm >= 7

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm test

# 运行测试（单次）
npm run test:run

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run type-check
```

### 项目结构

```
src/
├── index.ts          # 主入口文件
├── types/            # 类型定义
├── exporter/         # 导出器实现
└── utils/            # 工具函数

test/                 # 测试文件
├── exporter.test.ts
└── utils.test.ts
```

## 许可证

MIT