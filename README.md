# IDX I/O - 浏览器版本

IDX格式导出工具库，专为浏览器环境设计，用于实现ECAD/MCAD协作的PCB设计数据交换。

## 功能特性

- ✅ 支持IDX v4.5协议（完全合规）
- ✅ 导出PCB板、组件、过孔、禁止区等元素
- ✅ 支持2.5D几何表示
- ✅ 支持简化表示法（geometryType）
- ✅ XML序列化和浏览器下载
- ✅ 协议合规性验证
- ✅ 标准命名空间使用
- ✅ 正确的组件三层结构
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
  },
  validation: {
    enabled: true  // 启用协议合规性验证
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
  // 检查验证结果
  if (result.validation && !result.validation.valid) {
    console.warn('协议合规性警告:', result.validation.warnings);
    if (result.validation.errors.length > 0) {
      console.error('协议合规性错误:', result.validation.errors);
    }
  }
  
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

## 协议合规性修复

本版本包含了全面的IDX v4.5协议合规性修复，确保生成的文件完全符合标准规范：

### 主要修复内容

- **ProcessInstruction类型声明**：使用正确的`computational`命名空间
- **形状引用格式**：使用`<pdm:Shape>ID</pdm:Shape>`而非href属性
- **命名空间规范**：统一使用标准命名空间前缀
- **组件三层结构**：assembly → single → shape的完整结构
- **几何类型标准化**：使用协议表8定义的标准类型
- **变换矩阵格式**：正确的2D/3D变换结构
- **Z轴定位系统**：使用AssembleToName和zOffset

### 验证功能

启用验证功能可以检查生成的IDX文件是否符合协议规范：

```typescript
const exporter = new IDXExporter({
  // ... 其他配置
  validation: {
    enabled: true,           // 启用验证
    strictMode: false,       // 严格模式（可选）
    reportWarnings: true     // 报告警告（可选）
  }
});

const result = await exporter.export(data);

// 检查验证结果
if (result.validation) {
  console.log('验证通过:', result.validation.valid);
  console.log('错误数量:', result.validation.errors.length);
  console.log('警告数量:', result.validation.warnings.length);
  
  // 显示详细错误信息
  result.validation.errors.forEach(error => {
    console.error(`${error.code}: ${error.message} at ${error.location}`);
  });
}
```

### 向后兼容性

所有修复都保持向后兼容，现有代码无需修改即可使用。如果您的代码依赖于旧的输出格式，请参考迁移指南：`docs/migration-guide.md`

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
- `docs/migration-guide.md` - 版本迁移指南
- `.kiro/specs/idx-exporter/` - 完整的技术规范
- `.kiro/specs/idx-protocol-compliance-fixes/` - 协议合规性修复规范

## 许可证

MIT
