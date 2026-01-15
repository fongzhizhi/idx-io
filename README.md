# IDX I/O

IDX格式导入导出工具库，用于实现ECAD/MCAD协作的PCB设计数据交换。

## 功能特性

- ✅ 支持IDX v4.5协议
- ✅ 导出PCB板、组件、过孔、禁止区等元素
- ✅ 支持2.5D几何表示
- ✅ 支持简化表示法（geometryType）
- ✅ XML序列化和压缩（.idz）
- 🚧 导入功能（计划中）

## 安装

```bash
npm install idx-io
```

## 快速开始

```typescript
import { IDXExporter, GlobalUnit } from 'idx-io';

// 创建导出器
const exporter = new IDXExporter({
  output: {
    directory: './output',
    designName: 'MyBoard',
    compress: false
  },
  geometry: {
    useSimplified: true,
    defaultUnit: GlobalUnit.UNIT_MM
  }
});

// 准备PCB数据
const boardData = {
  board: {
    id: 'MAIN_BOARD',
    name: '主板',
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
  components: [],
  holes: [],
  keepouts: []
};

// 执行导出
const result = await exporter.export(boardData);
console.log('导出成功:', result.files);
```

## 文档

详细文档请参考 `docs/` 目录。

## 许可证

MIT
