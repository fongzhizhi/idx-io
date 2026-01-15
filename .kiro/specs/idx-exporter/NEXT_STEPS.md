# IDX导出器 - 下一步行动计划

## 📊 当前状态总结

### ✅ 已完成（约25%）
1. **完整的类型系统** - 所有IDX v4.5核心类型已定义
2. **基础构建器框架** - BaseBuilder抽象类和工具类
3. **板构建器** - 完整的PCB板导出功能
4. **主导出器框架** - IDXExporter类基础结构
5. **基础示例** - 简单的导出示例代码

### ⚠️ 部分完成
- **IDXExporter** - 框架完成，但缺少XML写入和文件输出集成

### ❌ 未开始（约75%）
- 组件构建器
- 孔构建器
- 保持区域构建器
- 层构建器
- XML序列化器
- 文件写入器
- 数据组装器
- 测试代码

## 🎯 立即行动项（按优先级）

### 第一优先级：完成核心导出功能

#### 1. 实现XMLWriter（预计4-6小时）
**文件**: `src/exporter/writers/xml-writer.ts`

**任务**:
- [ ] 创建XMLWriter类
- [ ] 实现根元素和命名空间处理
- [ ] 实现Header序列化
- [ ] 实现Body序列化（Items）
- [ ] 实现ProcessInstruction序列化
- [ ] 实现EDMDItem序列化
- [ ] 实现几何形状序列化（PolyLine, CircleCenter等）
- [ ] 实现CartesianPoint序列化
- [ ] 实现UserProperty序列化
- [ ] 实现Transformation序列化

**依赖**: xmlbuilder2库（已在package.json中）

**验收标准**:
- 能够将EDMDDataSet转换为符合IDX规范的XML字符串
- 生成的XML包含正确的命名空间
- 支持pretty print格式化

#### 2. 实现FileWriter（预计2-3小时）
**文件**: `src/exporter/writers/file-writer.ts`

**任务**:
- [ ] 创建FileWriter类
- [ ] 实现文件路径验证
- [ ] 实现目录创建
- [ ] 实现UTF-8文件写入
- [ ] 实现文件命名模式支持
- [ ] 实现错误处理

**依赖**: Node.js fs模块

**验收标准**:
- 能够将XML字符串写入文件
- 支持自定义输出目录
- 支持文件命名模式（如：{designName}_{type}.idx）

#### 3. 集成XMLWriter和FileWriter到IDXExporter（预计1-2小时）
**文件**: `src/exporter/index.ts`

**任务**:
- [ ] 在export方法中调用XMLWriter
- [ ] 在export方法中调用FileWriter
- [ ] 更新ExportResult返回实际文件信息
- [ ] 添加文件大小统计

**验收标准**:
- 运行examples/export-basic.ts能够生成实际的.idx文件
- 生成的文件可以用文本编辑器打开查看
- 文件内容符合IDX XML格式

### 第二优先级：实现核心构建器

#### 4. 实现ComponentBuilder（预计6-8小时）
**文件**: `src/exporter/builders/component-builder.ts`

**任务**:
- [ ] 定义ComponentData接口
- [ ] 实现validateInput
- [ ] 实现preProcess
- [ ] 实现construct（电气组件）
- [ ] 实现construct（机械组件）
- [ ] 实现组件形状生成
- [ ] 实现组件属性映射
- [ ] 实现3D模型引用支持
- [ ] 实现postProcess

**参考**: 设计文档中的ComponentBuilder示例

**验收标准**:
- 能够构建电气组件（COMPONENT）
- 能够构建机械组件（COMPONENT_MECHANICAL）
- 支持2D变换（位置和旋转）
- 支持用户属性（RefDes, PartNumber等）

#### 5. 实现HoleBuilder（预计4-6小时）
**文件**: `src/exporter/builders/hole-builder.ts`

**任务**:
- [ ] 定义HoleData接口
- [ ] 实现validateInput
- [ ] 实现preProcess
- [ ] 实现construct（圆形孔）
- [ ] 实现construct（椭圆形孔）
- [ ] 实现镀孔和非镀孔区分
- [ ] 实现孔几何形状生成
- [ ] 实现postProcess

**验收标准**:
- 能够构建镀孔（HOLE_PLATED）
- 能够构建非镀孔（HOLE_NON_PLATED）
- 支持圆形和椭圆形孔
- 正确设置Inverted属性（孔是切除材料）

#### 6. 实现KeepoutBuilder（预计4-6小时）
**文件**: `src/exporter/builders/keepout-builder.ts`

**任务**:
- [ ] 定义KeepoutData接口
- [ ] 实现validateInput
- [ ] 实现preProcess
- [ ] 实现construct（组件禁布区）
- [ ] 实现construct（布线禁布区）
- [ ] 实现Z轴范围处理
- [ ] 实现保持区域形状处理
- [ ] 实现postProcess

**验收标准**:
- 能够构建各种类型的保持区域
- 正确设置geometryType
- 支持Z轴范围定义
- 支持AssembleToName层关联

### 第三优先级：实现数据组装

#### 7. 实现DatasetAssembler（预计4-6小时）
**文件**: `src/exporter/assemblers/dataset-assembler.ts`

**任务**:
- [ ] 创建DatasetAssembler类
- [ ] 实现assembleBaselineBody方法
- [ ] 实现组件集合组装
- [ ] 实现孔集合组装
- [ ] 实现保持区域集合组装
- [ ] 实现形状收集
- [ ] 实现依赖关系处理

**验收标准**:
- 能够组装包含板、组件、孔、保持区域的完整Body
- 正确收集所有形状元素
- 处理项目之间的引用关系

#### 8. 集成DatasetAssembler到IDXExporter（预计1-2小时）
**文件**: `src/exporter/index.ts`

**任务**:
- [ ] 在buildDataset中使用DatasetAssembler
- [ ] 处理组件数据
- [ ] 处理孔数据
- [ ] 处理保持区域数据

**验收标准**:
- 能够导出包含多种元素的完整PCB设计

## 📅 时间估算

### 第一阶段：基础导出功能（1周）
- XMLWriter: 6小时
- FileWriter: 3小时
- 集成: 2小时
- 测试和调试: 4小时
- **总计**: 15小时

### 第二阶段：核心构建器（2周）
- ComponentBuilder: 8小时
- HoleBuilder: 6小时
- KeepoutBuilder: 6小时
- 测试和调试: 10小时
- **总计**: 30小时

### 第三阶段：数据组装（1周）
- DatasetAssembler: 6小时
- 集成: 2小时
- 端到端测试: 7小时
- **总计**: 15小时

### MVP版本总计
**预计工作量**: 60小时（约1.5-2周全职开发）

## 🚀 快速启动指南

### 如果你想立即看到结果

**最小可行路径**（约10小时）:
1. 实现XMLWriter基础功能（4小时）
   - 只实现Header和Body的基本序列化
   - 只支持板和简单形状
2. 实现FileWriter（2小时）
3. 集成到IDXExporter（1小时）
4. 测试和调试（3小时）

完成后，你将能够：
- 运行examples/export-basic.ts
- 生成实际的.idx文件
- 用文本编辑器查看生成的XML

### 推荐的开发顺序

```
Day 1-2: XMLWriter基础实现
Day 3: FileWriter + 集成
Day 4: 测试和完善XMLWriter
Day 5-6: ComponentBuilder
Day 7-8: HoleBuilder
Day 9-10: KeepoutBuilder
Day 11-12: DatasetAssembler + 集成测试
```

## 📝 开发检查清单

### 开始新模块前
- [ ] 阅读相关的IDX规范章节
- [ ] 查看design.md中的设计说明
- [ ] 查看已有的类似实现（如BoardBuilder）
- [ ] 定义清晰的接口和数据结构

### 完成模块后
- [ ] 编写单元测试
- [ ] 更新tasks.md标记完成
- [ ] 更新implementation-status.md
- [ ] 添加JSDoc注释
- [ ] 运行示例验证功能

### 提交代码前
- [ ] 运行TypeScript编译检查
- [ ] 运行所有测试
- [ ] 检查代码格式
- [ ] 更新CHANGELOG（如果有）

## 🐛 已知问题和注意事项

### 当前限制
1. **IDXExporter.export** 目前只返回模拟结果，不生成实际文件
2. **GeometryUtils** 只支持基础几何，需要扩展
3. **没有数据验证** - 需要实现ValidationUtils
4. **没有测试** - 需要编写单元测试和集成测试

### 技术债务
1. 需要实现流式XML写入（处理大文件）
2. 需要实现XSD Schema验证
3. 需要优化ID生成算法
4. 需要实现更完善的错误恢复机制

## 💡 开发建议

### 代码风格
- 遵循已有代码的风格
- 使用详细的JSDoc注释
- 参考`resources/docs/TypeScript代码注释规范指南.md`
- 使用有意义的变量名

### 测试策略
- 每个构建器都应该有单元测试
- 使用真实的IDX示例数据进行测试
- 测试边界条件和错误情况
- 编写property-based tests验证correctness properties

### 调试技巧
- 使用`console.log`输出中间结果
- 将生成的XML保存到文件查看
- 使用XML验证工具检查格式
- 参考`resources/idx/01-4层板多图元-example.idx`作为参考

## 📚 参考资源

### 内部文档
- `resources/idx/IDXv4.5建模与输出简明指南.md` - IDX协议详解
- `resources/docs/IDX导入导出项目规划与设计.md` - 项目设计文档
- `.kiro/specs/idx-exporter/design.md` - 详细设计文档
- `.kiro/specs/idx-exporter/requirements.md` - 需求文档

### 外部资源
- IDX v4.5 XSD Schema: `resources/idx/PSI5_IDXv4.5_Schema/`
- xmlbuilder2文档: https://oozcitak.github.io/xmlbuilder2/
- TypeScript文档: https://www.typescriptlang.org/docs/

## 🎯 成功标准

### MVP版本完成标准
- [ ] 能够导出包含板、组件、孔、保持区域的完整PCB设计
- [ ] 生成的.idx文件符合IDX v4.5规范
- [ ] 生成的XML可以被MCAD软件读取
- [ ] 包含基本的错误处理和验证
- [ ] 有至少一个完整的端到端示例
- [ ] 核心功能有单元测试覆盖

### 质量标准
- [ ] 代码通过TypeScript编译
- [ ] 所有公共API有JSDoc注释
- [ ] 测试覆盖率达到60%以上
- [ ] 没有明显的性能问题
- [ ] 错误信息清晰有用

## 🤝 需要帮助？

如果在实现过程中遇到问题：
1. 查看已实现的BoardBuilder作为参考
2. 查看design.md中的详细设计
3. 参考IDX规范文档
4. 查看示例IDX文件

祝开发顺利！🚀
