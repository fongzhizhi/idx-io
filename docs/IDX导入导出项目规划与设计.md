## IDX背景知识

**IDX** 是一种由 **prostep ivip** 国际协会制定的、基于XML的**开放数据交换标准**，全称为 **“ECAD/MCAD Collaboration”**。它的核心使命是**在电子设计自动化（ECAD）系统和机械设计自动化（MCAD）系统之间，实现印刷电路板（PCB）设计数据的无缝、精确和双向协作**。

具体可参考文档：`resources\idx\IDXv4.5建模与输出简明指南.md`。

IDX协议的本质是XML，目录`resources\idx\PSI5_IDXv4.5_Schema`是`IDX`的`XSD`规范，可参考。

## 需求说明

我现在要使用TypeScript实现IDX格式导入导出项目，目前只需要完成导出模块，导入是后期计划。我的设计是这样的：

目录结构（参考）：

```txt
idx-io/
├── src/
│   ├── core/                    # 核心协议实现
│   │   ├── types/               # TypeScript类型定义
│   │   │   ├── idx/            # IDX协议特定类型
│   │   │   │   ├── messages.ts  # IDX消息类型
│   │   │   │   ├── items.ts     # PCB项目类型
│   │   │   │   ├── geometry.ts  # 几何类型
│   │   │   │   └── enums.ts     # 枚举和常量
│   │   │   └── shared/         # 共享基础类型
│   │   ├── schemas/             # XSD/JSON Schema验证
│   │   │   ├── idx-v4.5.xsd
│   │   │   └── validators.ts
│   │   ├── xml/                 # XML处理工具
│   │   │   ├── builder.ts      # XML构建器
│   │   │   ├── parser.ts       # XML解析器
│   │   │   └── utils.ts        # XML工具函数
│   │   └── utils/               # 通用工具函数
│   ├── exporter/                # 导出模块
│   │   ├── index.ts            # 主导出入口
│   │   ├── idx-exporter.ts     # IDX导出器主类
│   │   ├── builders/           # 各类构建器
│   │   │   ├── board-builder.ts    # PCB板构建
│   │   │   ├── component-builder.ts # 组件构建
│   │   │   ├── layer-builder.ts     # 层构建
│   │   │   └── change-builder.ts    # 变更构建
│   │   ├── writers/            # 各种写入器
│   │   │   ├── idx-writer.ts   # IDX文件写入
│   │   │   ├── xml-writer.ts   # XML格式写入
│   │   │   └── compression.ts  # 压缩处理
│   │   └── adapters/           # 适配器（连接外部数据源）
│   │       ├── ecad-adapter.ts # ECAD系统适配
│   │       └── generic-adapter.ts
│   ├── importer/                # 导入模块（未来）
│   └── models/                  # 业务模型
│       ├── pcb-board.ts
│       ├── component.ts
│       └── ...
├── examples/                    # 示例代码
│   ├── export-basic.ts         # 基础导出示例
│   ├── export-with-layers.ts   # 多层板示例
│   ├── export-flex-board.ts    # 柔性板示例
│   └── test-data/              # 测试数据
├── test/                       # 测试
│   ├── unit/
│   ├── integration/
│   └── fixtures/               # 测试固件
├── docs/                       # 文档
│   ├── api/                    # API文档
│   ├── usage/                  # 使用指南
│   └── protocol/               # IDX协议文档
├── scripts/                    # 构建/部署脚本
├── package.json
├── tsconfig.json
├── tsconfig.build.json         # 生产构建配置
└── README.md
```

我的工具选择如下：

```json
{
  "dependencies": {
    "xmlbuilder2": "^3.0.0",      // XML构建
    "fast-xml-parser": "^4.3.0",  // XML解析
    "jszip": "^3.10.0",          // .idz压缩
    "ajv": "^8.12.0",            // JSON Schema验证
    "@types/..."                 // 相应类型定义
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "jest": "^29.0.0",           // 测试框架
    "@types/jest": "^29.0.0"
  }
}
```

另外：代码注释需要遵循注释指南，参考文档：`resources\docs\TypeScript代码注释规范指南.md`。

## 我的实现思路

## 📋 一、Exporter 整体架构设计

### 1.1 架构模式：构建器模式 + 管道模式

```
数据源 → 适配器 → 构建器 → 组装器 → 写入器 → 输出文件
(ECAD)  (Adapter)  (Builder) (Assembler) (Writer)  (.idx/.idz)
```

### 1.2 核心组件职责划分

| 组件       | 职责                 | 关键技术              |
| ---------- | -------------------- | --------------------- |
| **适配器** | 数据源转换，统一接口 | 适配器模式，数据映射  |
| **构建器** | 创建IDX对象树        | 构建器模式，类型转换  |
| **组装器** | 组织完整IDX结构      | 组合模式，验证        |
| **写入器** | XML序列化与输出      | xmlbuilder2，流式写入 |
| **管理器** | 流程控制，配置管理   | 策略模式，状态管理    |

## 🔧 二、核心类实现规划

### 2.1 主入口类：`IDXExporter`

```typescript
// src/exporter/idx-exporter.ts
export class IDXExporter {
  private config: IDXExportConfig;
  private builders: Map<string, BaseBuilder>;
  private assembler: DatasetAssembler;
  private writer: IDXWriter;
  private validators: ValidatorChain;

  constructor(config: Partial<IDXExportConfig> = {}) {
    this.config = this.mergeConfig(config);
    this.initializeComponents();
  }

  /**
   * 主要导出方法
   */
  async export(data: ExportSourceData): Promise<ExportResult> {
    const context = new ExportContext(this.config);
    
    try {
      // 1. 验证和转换输入数据
      const validatedData = await this.validators.validate(data);
      
      // 2. 通过适配器转换数据
      const idxData = await this.adapter.adapt(validatedData);
      
      // 3. 构建IDX数据结构
      const dataset = await this.buildDataset(idxData, context);
      
      // 4. 写入文件
      const files = await this.writer.write(dataset, context);
      
      return {
        success: true,
        files,
        statistics: context.getStatistics(),
        issues: context.getIssues()
      };
    } catch (error) {
      return this.handleExportError(error, context);
    }
  }

  /**
   * 创建基线消息
   */
  createBaseline(boardData: BoardData): SendInformationMessage {
    // 构建Header
    const header = this.buildHeader('Baseline');
    
    // 构建Body
    const body = this.assembler.assembleBaselineBody(boardData);
    
    // 构建ProcessInstruction
    const instruction: EDMDProcessInstructionSendInformation = {
      id: this.generateId('INSTRUCTION'),
      instructionType: 'SendInformation'
    };

    return {
      Header: header,
      Body: body,
      ProcessInstruction: instruction
    };
  }

  /**
   * 创建变更消息
   */
  createChangeMessage(changeData: ChangeData): SendChangesMessage {
    // 实现变更消息构建逻辑
  }
}
```

### 2.2 构建器基类：`BaseBuilder`

```typescript
// src/exporter/builders/base-builder.ts
export abstract class BaseBuilder<TInput, TOutput> {
  protected config: BuilderConfig;
  protected context: ExportContext;
  protected utils: GeometryUtils;

  constructor(config: BuilderConfig, context: ExportContext) {
    this.config = config;
    this.context = context;
    this.utils = new GeometryUtils(config.geometry);
  }

  /**
   * 构建方法 - 模板方法模式
   */
  async build(input: TInput): Promise<TOutput> {
    this.validateInput(input);
    const processed = await this.preProcess(input);
    const result = await this.construct(processed);
    const validated = await this.postProcess(result);
    return validated;
  }

  protected abstract validateInput(input: TInput): void;
  protected abstract preProcess(input: TInput): Promise<any>;
  protected abstract construct(processed: any): Promise<TOutput>;
  protected abstract postProcess(output: TOutput): Promise<TOutput>;

  /**
   * 通用ID生成
   */
  protected generateItemId(type: string, identifier?: string): string {
    const prefix = this.getItemTypePrefix(type);
    const seq = this.context.incrementSequence(type);
    return identifier 
      ? `${prefix}_${identifier}_${seq}`
      : `${prefix}_${Date.now()}_${seq}`;
  }

  /**
   * 构建EDMDItem基础结构
   */
  protected createBaseItem(
    itemType: ItemType,
    geometryType?: GeometryType
  ): Partial<EDMDItem> {
    const base: Partial<EDMDItem> = {
      ItemType: itemType,
      IsAttributeChanged: false,
      BaseLine: true
    };

    if (this.config.useSimplified && geometryType) {
      base.geometryType = geometryType;
    }

    return base;
  }
}
```

### 2.3 具体构建器示例：`ComponentBuilder`

```typescript
// src/exporter/builders/component-builder.ts
export class ComponentBuilder extends BaseBuilder<ComponentData, EDMDItem> {
  async construct(component: ProcessedComponentData): Promise<EDMDItem> {
    const itemId = this.generateItemId('COMPONENT', component.refDes);
    
    // 创建顶层装配体项目
    const assemblyItem: EDMDItem = {
      id: itemId,
      ...this.createBaseItem(ItemType.ASSEMBLY, GeometryType.COMPONENT),
      Name: component.refDes,
      Description: component.description || `${component.partNumber} - ${component.packageName}`,
      Identifier: this.createIdentifier('COMPONENT', component.refDes)
    };

    // 创建组件实例
    const instance = this.createComponentInstance(component, itemId);
    
    // 创建组件定义项目
    const componentItem = this.createComponentDefinition(component, itemId);

    // 根据配置选择传统或简化表示法
    if (this.config.useSimplified) {
      return this.buildSimplifiedComponent(assemblyItem, instance, componentItem, component);
    } else {
      return this.buildTraditionalComponent(assemblyItem, instance, componentItem, component);
    }
  }

  /**
   * 简化表示法（使用geometryType）
   */
  private buildSimplifiedComponent(
    assemblyItem: EDMDItem,
    instance: EDMDItemInstance,
    componentItem: EDMDItem,
    component: ComponentData
  ): EDMDItem {
    // 设置几何类型
    if (component.isMechanical) {
      assemblyItem.geometryType = GeometryType.COMPONENT_MECHANICAL;
    } else {
      assemblyItem.geometryType = GeometryType.COMPONENT;
    }

    // 添加用户属性
    assemblyItem.UserProperties = this.createComponentProperties(component);

    // 添加3D模型引用（如果有）
    if (component.model3D) {
      componentItem.EDMD3DModel = this.create3DModelReference(component.model3D);
    }

    // 添加引脚定义（如果有）
    if (component.pins && component.pins.length > 0) {
      componentItem.PackagePins = this.createPackagePins(component.pins);
    }

    assemblyItem.ItemInstances = [instance];
    componentItem.Shape = this.createComponentShape(component);

    // 返回装配体项目，组件定义项目将添加到Body的Items数组中
    return assemblyItem;
  }

  /**
   * 创建组件形状
   */
  private createComponentShape(component: ComponentData): EDMDShapeElement {
    const shapeId = this.generateItemId('SHAPE', component.refDes);
    
    // 如果有外部文件，使用隐式形状
    if (component.externalShapeFile) {
      const extShape: EDMDExtShape = {
        id: `${shapeId}_EXT`,
        Location: component.externalShapeFile.path,
        Format: component.externalShapeFile.format,
        FormatVersion: component.externalShapeFile.version
      };
      return extShape;
    }

    // 否则使用显式2.5D几何
    return this.createExplicitComponentShape(component, shapeId);
  }

  /**
   * 创建显式2.5D组件形状
   */
  private createExplicitComponentShape(
    component: ComponentData, 
    shapeId: string
  ): EDMDShapeElement {
    // 根据组件尺寸创建曲线集
    const curveSet = this.utils.createBoundingBoxCurveSet(
      component.dimensions.width,
      component.dimensions.height,
      component.dimensions.thickness,
      component.position.z
    );

    const shapeElement: EDMDShapeElement = {
      id: shapeId,
      ShapeElementType: ShapeElementType.FEATURE_SHAPE_ELEMENT,
      DefiningShape: curveSet,
      Inverted: false
    };

    return shapeElement;
  }
}
```

### 2.4 数据组装器：`DatasetAssembler`

```typescript
// src/exporter/assemblers/dataset-assembler.ts
export class DatasetAssembler {
  private builders: BuilderRegistry;
  private config: AssemblerConfig;

  /**
   * 组装基线消息的Body
   */
  async assembleBaselineBody(boardData: BoardData): Promise<EDMDDataSetBody> {
    const body: EDMDDataSetBody = {
      Items: [],
      Shapes: [],
      Models3D: []
    };

    // 1. 构建板轮廓
    const boardBuilder = this.builders.get('board');
    const boardItem = await boardBuilder.build(boardData);
    body.Items.push(boardItem);

    // 2. 构建层系统（如果有多层）
    if (boardData.layers && boardData.layers.length > 0) {
      const layerSystem = await this.assembleLayerSystem(boardData);
      body.Items.push(...layerSystem.items);
      body.Shapes.push(...layerSystem.shapes);
    }

    // 3. 构建组件
    const componentBuilder = this.builders.get('component');
    for (const component of boardData.components) {
      const componentItem = await componentBuilder.build(component);
      body.Items.push(componentItem);
      
      // 收集组件的形状和模型
      this.collectComponentArtifacts(componentItem, body);
    }

    // 4. 构建孔和切口
    for (const hole of boardData.holes) {
      const holeBuilder = this.builders.get(hole.plated ? 'plated-hole' : 'non-plated-hole');
      const holeItem = await holeBuilder.build(hole);
      body.Items.push(holeItem);
    }

    // 5. 构建保持区域
    for (const keepout of boardData.keepouts) {
      const keepoutBuilder = this.builders.get('keepout');
      const keepoutItem = await keepoutBuilder.build(keepout);
      body.Items.push(keepoutItem);
    }

    return body;
  }

  /**
   * 组装层系统
   */
  private async assembleLayerSystem(boardData: BoardData): Promise<LayerSystemAssembly> {
    const result: LayerSystemAssembly = {
      items: [],
      shapes: []
    };

    // 构建物理层
    for (const layer of boardData.layers) {
      const layerBuilder = this.builders.get('layer');
      const layerItem = await layerBuilder.build(layer);
      result.items.push(layerItem);
    }

    // 构建层堆叠
    if (boardData.layerStackup) {
      const stackupBuilder = this.builders.get('stackup');
      const stackupItem = await stackupBuilder.build(boardData.layerStackup);
      result.items.push(stackupItem);
    }

    // 构建层区域（用于柔性板）
    if (boardData.layerZones && boardData.layerZones.length > 0) {
      for (const zone of boardData.layerZones) {
        const zoneBuilder = this.builders.get('layer-zone');
        const zoneItem = await zoneBuilder.build(zone);
        result.items.push(zoneItem);
      }
    }

    return result;
  }
}
```

### 2.5 XML写入器：`XMLWriter`

```typescript
// src/exporter/writers/xml-writer.ts
export class XMLWriter {
  private namespaces: Record<string, string>;
  private prettyPrint: boolean;
  private encoding: string;

  constructor(options: XMLWriterOptions = {}) {
    this.namespaces = {
      'xmlns:foundation': 'http://www.prostep.org/EDMD/Foundation',
      'xmlns:pdm': 'http://www.prostep.org/EDMD/PDM',
      'xmlns:d2': 'http://www.prostep.org/EDMD/2D',
      'xmlns:property': 'http://www.prostep.org/EDMD/Property',
      'xmlns:computational': 'http://www.prostep.org/EDMD/Computational',
      'xmlns:administration': 'http://www.prostep.org/EDMD/Administration',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.prostep.org/EDMD/Foundation ../schemas/EDMDSchema.foundation.xsd'
    };
    
    this.prettyPrint = options.prettyPrint ?? true;
    this.encoding = options.encoding ?? 'UTF-8';
  }

  /**
   * 将EDMDDataSet转换为XML字符串
   */
  serialize(dataset: EDMDDataSet): string {
    const root = this.createRootElement(dataset);
    
    // 构建Header
    this.buildHeader(root, dataset.Header);
    
    // 构建Body
    this.buildBody(root, dataset.Body);
    
    // 构建ProcessInstruction
    this.buildProcessInstruction(root, dataset.ProcessInstruction);
    
    // 构建历史记录（如果有）
    if (dataset.History && dataset.History.length > 0) {
      this.buildHistory(root, dataset.History);
    }

    const xml = root.end({
      prettyPrint: this.prettyPrint,
      indent: '  ',
      newline: '\n'
    });

    return `<?xml version="1.0" encoding="${this.encoding}"?>\n${xml}`;
  }

  /**
   * 构建根元素
   */
  private createRootElement(dataset: EDMDDataSet): XMLBuilder {
    const root = create({ version: '1.0', encoding: this.encoding })
      .ele('foundation:EDMDDataSet', this.namespaces);

    // 添加自定义命名空间
    if (dataset.namespaces) {
      Object.entries(dataset.namespaces).forEach(([key, value]) => {
        root.att(key, value);
      });
    }

    return root;
  }

  /**
   * 构建Header
   */
  private buildHeader(root: XMLBuilder, header: EDMDHeader): void {
    const headerElement = root.ele('foundation:Header', { 'xsi:type': 'foundation:EDMDHeader' });
    
    if (header.Description) headerElement.ele('foundation:Description').txt(header.Description);
    if (header.CreatorName) headerElement.ele('foundation:CreatorName').txt(header.CreatorName);
    if (header.CreatorCompany) headerElement.ele('foundation:CreatorCompany').txt(header.CreatorCompany);
    if (header.CreatorSystem) headerElement.ele('foundation:CreatorSystem').txt(header.CreatorSystem);
    
    headerElement.ele('foundation:GlobalUnitLength').txt(header.GlobalUnitLength);
    headerElement.ele('foundation:CreationDateTime').txt(header.CreationDateTime);
    headerElement.ele('foundation:ModifiedDateTime').txt(header.ModifiedDateTime);
  }

  /**
   * 构建Body
   */
  private buildBody(root: XMLBuilder, body: EDMDDataSetBody): void {
    const bodyElement = root.ele('foundation:Body', { 'xsi:type': 'foundation:EDMDDataSetBody' });
    
    // 构建所有项目
    for (const item of body.Items) {
      this.buildItem(bodyElement, item);
    }
    
    // 构建所有形状（如果独立存储）
    if (body.Shapes && body.Shapes.length > 0) {
      for (const shape of body.Shapes) {
        this.buildShape(bodyElement, shape);
      }
    }
    
    // 构建3D模型
    if (body.Models3D && body.Models3D.length > 0) {
      for (const model of body.Models3D) {
        this.build3DModel(bodyElement, model);
      }
    }
  }

  /**
   * 构建EDMDItem
   */
  private buildItem(parent: XMLBuilder, item: EDMDItem): void {
    const itemAttrs: Record<string, any> = { id: item.id };
    
    if (item.IsAttributeChanged !== undefined) {
      itemAttrs.IsAttributeChanged = item.IsAttributeChanged.toString();
    }
    
    if (item.geometryType) {
      itemAttrs.geometryType = item.geometryType;
    }
    
    const itemElement = parent.ele('foundation:Item', itemAttrs);
    
    if (item.Name) itemElement.ele('foundation:Name').txt(item.Name);
    if (item.Description) itemElement.ele('foundation:Description').txt(item.Description);
    
    itemElement.ele('pdm:ItemType').txt(item.ItemType);
    
    // 构建标识符
    if (item.Identifier) {
      this.buildIdentifier(itemElement, item.Identifier);
    }
    
    // 构建包名称
    if (item.PackageName) {
      const packageElement = itemElement.ele('pdm:PackageName');
      packageElement.ele('foundation:SystemScope').txt(item.PackageName.SystemScope);
      packageElement.ele('foundation:ObjectName').txt(item.PackageName.ObjectName);
    }
    
    // 构建用户属性
    if (item.UserProperties && item.UserProperties.length > 0) {
      for (const prop of item.UserProperties) {
        this.buildUserProperty(itemElement, prop);
      }
    }
    
    // 构建项目实例（仅装配体）
    if (item.ItemType === ItemType.ASSEMBLY && item.ItemInstances) {
      for (const instance of item.ItemInstances) {
        this.buildItemInstance(itemElement, instance);
      }
    }
    
    // 构建形状引用
    if (item.Shape) {
      if (typeof item.Shape === 'string') {
        itemElement.ele('pdm:Shape').att('href', `#${item.Shape}`);
      } else {
        // 内联形状 - 实际中可能复杂，这里简化处理
        itemElement.ele('pdm:Shape').txt('INLINE_SHAPE');
      }
    }
  }

  /**
   * 构建EDMDIdentifier
   */
  private buildIdentifier(parent: XMLBuilder, identifier: EDMDIdentifier): void {
    const idElement = parent.ele('pdm:Identifier', { 'xsi:type': 'foundation:EDMDIdentifier' });
    
    idElement.ele('foundation:SystemScope').txt(identifier.SystemScope);
    idElement.ele('foundation:Number').txt(identifier.Number);
    idElement.ele('foundation:Version').txt(identifier.Version.toString());
    idElement.ele('foundation:Revision').txt(identifier.Revision.toString());
    idElement.ele('foundation:Sequence').txt(identifier.Sequence.toString());
  }
}
```

### 2.6 适配器示例：`ECADAdapter`

```typescript
// src/exporter/adapters/ecad-adapter.ts
export class ECADAdapter {
  private mappingConfig: MappingConfig;
  private unitConverter: UnitConverter;

  constructor(config: MappingConfig) {
    this.mappingConfig = config;
    this.unitConverter = new UnitConverter(config.baseUnit);
  }

  /**
   * 将ECAD数据适配为IDX数据模型
   */
  async adapt(ecadData: ECADData): Promise<IDXData> {
    const result: IDXData = {
      board: await this.adaptBoard(ecadData.board),
      components: await Promise.all(ecadData.components.map(c => this.adaptComponent(c))),
      holes: await Promise.all(ecadData.holes.map(h => this.adaptHole(h))),
      keepouts: await Promise.all(ecadData.keepouts.map(k => this.adaptKeepout(k))),
      layers: ecadData.layers ? await this.adaptLayers(ecadData.layers) : undefined
    };

    return result;
  }

  /**
   * 适配PCB板数据
   */
  private async adaptBoard(ecadBoard: ECADBoard): Promise<BoardData> {
    return {
      id: ecadBoard.id,
      name: ecadBoard.name,
      outline: {
        points: ecadBoard.outline.points.map(p => ({
          x: this.unitConverter.convert(p.x, ecadBoard.units),
          y: this.unitConverter.convert(p.y, ecadBoard.units)
        })),
        thickness: this.unitConverter.convert(ecadBoard.thickness, ecadBoard.units)
      },
      material: ecadBoard.material,
      finish: ecadBoard.finish,
      // 其他属性...
    };
  }

  /**
   * 适配组件数据
   */
  private async adaptComponent(ecadComponent: ECADComponent): Promise<ComponentData> {
    const component: ComponentData = {
      refDes: ecadComponent.refDes,
      partNumber: ecadComponent.partNumber,
      packageName: ecadComponent.packageName,
      position: {
        x: this.unitConverter.convert(ecadComponent.x, ecadComponent.units),
        y: this.unitConverter.convert(ecadComponent.y, ecadComponent.units),
        z: this.unitConverter.convert(ecadComponent.z || 0, ecadComponent.units),
        rotation: ecadComponent.rotation || 0
      },
      dimensions: {
        width: this.unitConverter.convert(ecadComponent.width, ecadComponent.units),
        height: this.unitConverter.convert(ecadComponent.height, ecadComponent.units),
        thickness: this.unitConverter.convert(ecadComponent.thickness, ecadComponent.units)
      },
      layer: ecadComponent.layer,
      isMechanical: ecadComponent.type === 'MECHANICAL'
    };

    // 添加热属性（如果有）
    if (ecadComponent.thermal) {
      component.thermal = {
        powerRating: this.unitConverter.convertPower(ecadComponent.thermal.powerRating),
        maxPower: this.unitConverter.convertPower(ecadComponent.thermal.maxPower),
        thermalResistance: ecadComponent.thermal.thermalResistance
      };
    }

    // 添加电气属性（如果有）
    if (ecadComponent.electrical) {
      component.electrical = {
        capacitance: this.unitConverter.convertCapacitance(ecadComponent.electrical.capacitance),
        resistance: ecadComponent.electrical.resistance,
        tolerance: ecadComponent.electrical.tolerance
      };
    }

    // 添加3D模型信息（如果有）
    if (ecadComponent.model3D) {
      component.model3D = {
        path: ecadComponent.model3D.path,
        format: ecadComponent.model3D.format,
        offset: ecadComponent.model3D.offset
      };
    }

    return component;
  }
}
```

## 📝 三、使用示例

### 3.1 基础导出示例

```typescript
// examples/export-basic.ts
import { IDXExporter, GlobalUnit } from '../src/exporter';

async function exportSimpleBoard() {
  // 创建导出器配置
  const config = {
    output: {
      directory: './output',
      designName: 'SimpleBoard',
      compress: false,
      namingPattern: '{designName}_{type}_{timestamp}.idx'
    },
    protocolVersion: '4.5' as const,
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
    }
  };

  // 创建导出器实例
  const exporter = new IDXExporter(config);

  // 准备PCB数据（简化示例）
  const boardData = {
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
      },
      cutouts: [
        {
          id: 'CUTOUT_001',
          shape: 'circle',
          center: { x: 20, y: 20 },
          diameter: 5,
          depth: 1.6
        }
      ]
    },
    components: [
      {
        refDes: 'C1',
        partNumber: 'CAP-0805-1uF',
        packageName: '0805',
        position: { x: 30, y: 30, z: 1.6, rotation: 0 },
        dimensions: { width: 2.0, height: 1.2, thickness: 0.8 },
        layer: 'TOP',
        electrical: {
          capacitance: 0.000001,
          tolerance: 10
        }
      },
      {
        refDes: 'R1',
        partNumber: 'RES-0603-10K',
        packageName: '0603',
        position: { x: 50, y: 30, z: 1.6, rotation: 0 },
        dimensions: { width: 1.6, height: 0.8, thickness: 0.6 },
        layer: 'TOP',
        electrical: {
          resistance: 10000,
          tolerance: 5
        }
      }
    ],
    holes: [
      {
        id: 'H1',
        type: 'mounting',
        position: { x: 10, y: 10 },
        diameter: 3.2,
        plated: true,
        depth: 1.6
      }
    ],
    keepouts: [
      {
        id: 'KO1',
        type: 'component',
        purpose: 'ComponentPlacement',
        shape: {
          type: 'rectangle',
          points: [
            { x: 70, y: 10 },
            { x: 90, y: 10 },
            { x: 90, y: 30 },
            { x: 70, y: 30 }
          ]
        },
        layer: 'TOP'
      }
    ]
  };

  try {
    // 执行导出
    const result = await exporter.export(boardData);
    
    if (result.success) {
      console.log('✅ 导出成功！');
      console.log(`📁 生成文件: ${result.files.map(f => f.path).join(', ')}`);
      console.log(`📊 统计信息:`);
      console.log(`   组件数量: ${result.statistics.components}`);
      console.log(`   孔数量: ${result.statistics.holes}`);
      console.log(`   文件大小: ${result.statistics.fileSize} bytes`);
      
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

exportSimpleBoard();
```

### 3.2 多层板导出示例

```typescript
// examples/export-with-layers.ts
import { IDXExporter, LayerPurpose } from '../src/exporter';

async function exportMultiLayerBoard() {
  const exporter = new IDXExporter({
    geometry: { useSimplified: true, defaultUnit: GlobalUnit.UNIT_MM },
    collaboration: { includeLayerStackup: true }
  });

  const boardData = {
    board: {
      // ... 板轮廓数据
    },
    layers: [
      {
        id: 'TOP_SOLDERMASK',
        name: 'Top Soldermask',
        type: LayerPurpose.SOLDERMASK,
        thickness: 0.02,
        material: 'LPI'
      },
      {
        id: 'TOP_COPPER',
        name: 'Top Copper',
        type: LayerPurpose.OTHERSIGNAL,
        thickness: 0.035,
        copperWeight: 1
      },
      {
        id: 'DIEL_1',
        name: 'Dielectric 1',
        type: LayerPurpose.DIELECTRIC,
        thickness: 0.1,
        dielectricConstant: 4.3,
        material: 'FR4'
      }
      // ... 更多层
    ],
    layerStackup: {
      id: 'MAIN_STACKUP',
      name: '4-Layer Stackup',
      layers: [
        { layerId: 'TOP_SOLDERMASK', position: 1, thickness: 0.02 },
        { layerId: 'TOP_COPPER', position: 2, thickness: 0.035 },
        { layerId: 'DIEL_1', position: 3, thickness: 0.1 },
        // ... 更多层
      ]
    },
    // ... 组件、孔等数据
  };

  const result = await exporter.export(boardData);
  // 处理结果...
}
```

## 📊 四、开发路线图

### 阶段1：基础导出功能 (MVP)

1. **核心类型系统** ✅ 已完成
2. **基础构建器** (板、组件、孔)
3. **XML写入器** (基础序列化)
4. **基本验证** (数据类型验证)

### 阶段2：高级功能

1. **层系统支持** (多层板、柔性板)
2. **变更消息支持** (SendChanges)
3. **压缩功能** (.idz文件)
4. **性能优化** (流式写入、大文件处理)

### 阶段3：生产就绪

1. **完整验证** (XSD Schema验证)
2. **错误恢复** (优雅的错误处理)
3. **性能基准测试**
4. **文档和示例**

### 阶段4：扩展功能

1. **导入功能** (Importer模块)
2. **Web服务** (REST API)
3. **可视化工具** (IDX文件查看器)
4. **插件系统** (自定义适配器)

## 🔍 五、关键考虑事项

### 5.1 性能优化

- **增量构建**: 对于大PCB设计，使用增量构建避免内存溢出
- **流式写入**: 使用流式XML写入器处理大文件
- **缓存机制**: 缓存常用形状和模板

### 5.2 错误处理

- **详细错误报告**: 包含位置信息和修复建议
- **验证分级**: 严格/普通/宽松模式
- **恢复机制**: 尝试从错误中恢复并继续导出

### 5.3 扩展性

- **插件架构**: 支持自定义构建器和适配器
- **配置驱动**: 通过配置控制导出行为
- **钩子系统**: 允许在导出过程中注入自定义逻辑

## 🧪 六、测试策略

```typescript
// 示例测试用例
describe('IDXExporter', () => {
  it('应该能导出简单的PCB板基线', async () => {
    const exporter = new IDXExporter();
    const boardData = createTestBoardData();
    
    const result = await exporter.export(boardData);
    
    expect(result.success).toBe(true);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].type).toBe('baseline');
    
    // 验证生成的XML符合IDX规范
    const xml = readFile(result.files[0].path);
    expect(isValidIDX(xml)).toBe(true);
  });
  
  it('应该支持几何简化表示法', async () => {
    const exporter = new IDXExporter({
      geometry: { useSimplified: true }
    });
    
    const result = await exporter.export(testData);
    const xml = readFile(result.files[0].path);
    
    // 验证使用了geometryType属性
    expect(xml).toContain('geometryType="BOARD_OUTLINE"');
  });
});
```

这个实现方案为您提供了一个完整的IDX导出器框架。建议从MVP开始，逐步实现各个模块，每完成一个模块都进行充分测试。

我将按照下面的顺序进行实现：

1. 类型定义(根据IDXv4.5规范)、构建器接口和基类
2. 具体构建器（Builder）(板、组件、孔、层叠结构等)
3. 组装器(将各个部分组装成完整的EDMDDataSet)
4. 序列化器(将EDMDDataSet转换为XML字
   符串)
5. 压缩和文件写入

