# IDX I/O - 浏览器版本

IDX格式导出工具库，专为浏览器环境设计，用于实现ECAD/MCAD协作的PCB设计数据交换。

## 功能特性

- ✅ 支持IDX v4.5协议
- ✅ 导出PCB板、组件、过孔、禁止区等元素
- ✅ 支持2.5D几何表示
- ✅ 支持简化表示法（geometryType）
- ✅ XML序列化和浏览器下载
- 🌐 专为浏览器环境优化
- 📱 支持现代浏览器（Chrome 80+, Firefox 75+, Safari 13+, Edge 80+）

## 安装

```bash
npm install idx-io
```

## 快速开始

### 浏览器环境

```typescript
import { IDXExporter, GlobalUnit } from 'idx-io';

// 创建导出器
const exporter = new IDXExporter({
  output: {
    designName: 'MyBoard'
  },
  geometry: {
    useSimplified: true,
    defaultUnit: GlobalUnit.UNIT_MM
  },
  collaboration: {
    creatorSystem: 'MyECADSystem',
    creatorCompany: 'MyCompany'
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

if (result.success) {
  // 创建下载链接
  const downloadUrl = exporter.createDownloadUrl(result.xmlContent);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = result.fileName;
  link.click();
  
  // 清理URL对象
  URL.revokeObjectURL(downloadUrl);
}
```

### HTML示例

查看 `examples/browser-example.html` 获取完整的浏览器使用示例。

## 浏览器兼容性

本库使用以下浏览器API：
- Blob API（用于创建文件对象）
- URL.createObjectURL（用于创建下载链接）
- 现代JavaScript特性（ES2020+）

支持的浏览器版本：
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 与Node.js版本的区别

此版本专为浏览器环境设计，主要区别：
- ❌ 不支持文件系统写入
- ❌ 不支持ZIP压缩（.idz格式）
- ✅ 支持浏览器下载
- ✅ 返回XML字符串内容
- ✅ 更小的打包体积

## 文档

详细文档请参考：
- `examples/export-basic.ts` - TypeScript使用示例
- `examples/browser-example.html` - HTML使用示例
- `.kiro/specs/idx-exporter/` - 完整的技术规范

## 许可证

MIT
