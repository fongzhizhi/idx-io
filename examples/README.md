# IDX 导入导出示例

本目录包含了IDX协议导入导出工具库的使用示例，展示如何将ECAD数据转换为IDX格式。

## 快速开始

### 方式1：使用npm脚本（推荐）

```bash
# 运行案例1：简单板子
npm run example:01

# 或者使用通用脚本
npm run example 01.simple-board
```

### 方式2：直接使用ts-node

```bash
cd examples
npx ts-node 01.simple-board.ts
```

### 方式3：使用Node.js脚本

```bash
node examples/run-example.js 01.simple-board
```

## 输出文件

每个示例都会在 `examples/outputs/` 目录下生成两个IDX文件：

- `{示例名}.trad.idx` - 传统建模方式
- `{示例名}.simp.idx` - 简化建模方式（IDXv4.0+推荐）

## 可用示例

### 案例1：简单板子 (`01.simple-board.ts`)
- **目的**：演示IDX基本结构
- **内容**：100mm x 80mm矩形板，厚度1.6mm
- **特点**：最简单的IDX文件结构，适合初学者

### 案例2：层和层堆叠 (`02.layer-stackup.ts`)
- **目的**：演示多层板和层堆叠
- **内容**：四层板（底层、内层1、内层2、顶层）
- **特点**：展示复杂的层压结构

### 案例3：元件 (`03.components.ts`)
- **目的**：演示元件建模
- **内容**：包含3D模型、封装、电气和机械元件
- **特点**：完整的元件协作数据

### 案例4：过孔 (`04.vias.ts`)
- **目的**：演示过孔和盲埋孔
- **内容**：通孔、盲孔、埋孔
- **特点**：复杂的层间连接

### 案例5：禁止区和保留区 (`05.keepout-keepin.ts`)
- **目的**：演示约束区域
- **内容**：禁布区、保留区
- **特点**：设计规则和约束

### 案例6：完整多层板 (`06.complete-board.ts`)
- **目的**：完整演示
- **内容**：整合所有功能的完整设计
- **特点**：生产级别的IDX文件

## 文件结构

```
examples/
├── README.md                 # 本文件
├── run-example.js           # 运行脚本
├── outputs/                 # 输出目录
│   ├── *.trad.idx          # 传统建模文件
│   └── *.simp.idx          # 简化建模文件
├── utils/                   # 工具函数
│   ├── example-utils.ts    # 示例通用工具
│   ├── geometry-utils.ts   # 几何工具
│   └── layer-utils.ts      # 层工具
└── *.ts                    # 示例文件
```

## 开发说明

### 添加新示例

1. 创建新的 `.ts` 文件，如 `07.new-example.ts`
2. 使用 `createExampleRunner` 工具函数
3. 实现 `createECADData` 函数
4. 更新本README文件

### 示例模板

```typescript
import { ECADData } from '../src/types/ecad/ecad.interface';
import { createBaseMetadata, createExampleRunner } from './utils/example-utils';

function createExampleData(): ECADData {
    // 创建ECAD数据
    return {
        metadata: createBaseMetadata('示例名称', '示例描述'),
        board: { /* 板子定义 */ },
        models: {},
        footprints: {},
        components: [],
        holes: [],
        constraints: [],
    };
}

const runExample = createExampleRunner(
    '07',
    'new-example',
    '新示例的描述',
    createExampleData
);

if (require.main === module) {
    runExample();
}
```

## 技术细节

### 建模方式对比

| 特性 | 传统建模 | 简化建模 |
|------|----------|----------|
| 文件大小 | 较大 | 较小 |
| 结构复杂度 | 深层嵌套 | 扁平化 |
| 兼容性 | 所有版本 | IDXv4.0+ |
| 推荐程度 | 兼容性需求 | 新项目推荐 |

### IDX协议版本

本工具库实现了 **IDXv4.5** 协议，支持：
- prostep ivip 国际标准
- ECAD/MCAD 协作
- 2.5D几何建模
- 变更追踪和版本控制

## 故障排除

### 常见问题

1. **TypeScript编译错误**
   ```bash
   npm run ts-check
   ```

2. **输出目录不存在**
   - 自动创建，无需手动创建

3. **文件权限问题**
   - 确保对 `examples/outputs/` 目录有写权限

### 获取帮助

- 查看源码注释
- 参考 `docs/` 目录下的文档
- 检查生成的IDX文件结构