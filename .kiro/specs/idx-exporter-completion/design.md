# Design Document: IDX导出器完善功能

## Overview

本设计文档专注于完善IDX导出器的剩余核心功能，以实现100%验证通过率和完整的功能支持。当前IDX导出器已经实现了大部分核心功能，验证通过率达到96.2%（25/26）。本设计将解决以下关键问题：

1. **类型系统完善**：修复ExportSourceData接口，支持components、holes、keepouts等属性
2. **层支持功能**：实现LayerBuilder和完整的多层板支持
3. **XML结构优化**：修复ItemType问题，实现100%验证通过
4. **错误处理增强**：完善验证机制和错误恢复
5. **XML可读性**：添加注释支持，提高调试体验

## Architecture

### 系统架构概览

```mermaid
graph TB
    subgraph "数据接口层"
        A[ExportSourceData] --> B[BoardData]
        A --> C[ComponentData[]]
        A --> D[HoleData[]]
        A --> E[KeepoutData[]]
    end
    
    subgraph "构建器层"
        F[BoardBuilder] --> G[LayerBuilder]
        H[ComponentBuilder]
        I[ViaBuilder]
        J[KeepoutBuilder]
    end
    
    subgraph "验证层"
        K[ValidationEngine] --> L[DataValidator]
        K --> M[StructureValidator]
        K --> N[XMLValidator]
    end
    
    subgraph "输出层"
        O[XMLWriter] --> P[CommentGenerator]
        O --> Q[StructureOptimizer]
    end
    
    A --> F
    A --> H
    A --> I
    A --> J
    
    F --> K
    H --> K
    I --> K
    J --> K
    
    K --> O
```

### 核心组件关系

1. **数据接口扩展**：ExportSourceData接口将支持所有必需的数据类型
2. **LayerBuilder集成**：新增LayerBuilder处理多层板数据
3. **验证引擎增强**：ValidationEngine提供全面的数据验证
4. **XML写入器优化**：XMLWriter支持注释生成和结构优化

## Components and Interfaces

### 1. 数据接口完善

#### ExportSourceData接口扩展

```typescript
export interface ExportSourceData {
  board: BoardData;
  components?: ComponentData[];
  holes?: HoleData[];
  keepouts?: KeepoutData[];
  layers?: LayerData[];
  layerStackup?: LayerStackupData;
}

export interface ComponentData {
  refDes: string;
  partNumber: string;
  packageName: string;
  position: {
    x: number;
    y: number;
    z?: number;
    rotation: number;
  };
  dimensions: {
    width: number;
    height: number;
    thickness: number;
  };
  properties?: Record<string, any>;
}

export interface HoleData {
  id: string;
  type: 'plated' | 'non-plated';
  position: { x: number; y: number };
  diameter: number;
  platingThickness?: number;
  drillDepth?: number;
}

export interface KeepoutData {
  id: string;
  type: 'component' | 'via' | 'trace';
  geometry: {
    type: 'rectangle' | 'circle' | 'polygon';
    points?: Array<{ x: number; y: number }>;
    center?: { x: number; y: number };
    width?: number;
    height?: number;
    radius?: number;
  };
  layers: string[];
}

export interface LayerData {
  id: string;
  name: string;
  type: 'SIGNAL' | 'PLANE' | 'SOLDERMASK' | 'SILKSCREEN' | 'DIELECTRIC' | 'OTHERSIGNAL';
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
}

export interface LayerStackupData {
  id: string;
  name: string;
  layers: Array<{
    layerId: string;
    position: number;
    thickness: number;
  }>;
}
```

### 2. LayerBuilder实现

```typescript
export class LayerBuilder extends BaseBuilder<LayerData[], EDMDItem[]> {
  protected validateInput(input: LayerData[]): ValidationResult<LayerData[]> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证层数据完整性
    for (const layer of input) {
      if (!layer.id || !layer.name) {
        errors.push(`层数据缺少必需字段: ${layer.id || 'unknown'}`);
      }
      
      if (layer.thickness <= 0) {
        errors.push(`层厚度必须大于0: ${layer.id}`);
      }
      
      if (!['SIGNAL', 'PLANE', 'SOLDERMASK', 'SILKSCREEN', 'DIELECTRIC', 'OTHERSIGNAL'].includes(layer.type)) {
        warnings.push(`未知的层类型: ${layer.type} in ${layer.id}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      data: input,
      errors,
      warnings
    };
  }
  
  protected async preProcess(input: LayerData[]): Promise<ProcessedLayerData[]> {
    return input.map(layer => ({
      ...layer,
      processedId: this.generateItemId('LAYER', layer.id),
      normalizedType: this.normalizeLayerType(layer.type)
    }));
  }
  
  protected async construct(processedData: ProcessedLayerData[]): Promise<EDMDItem[]> {
    const items: EDMDItem[] = [];
    
    for (const layer of processedData) {
      const item = this.createLayerItem(layer);
      items.push(item);
    }
    
    return items;
  }
  
  private createLayerItem(layer: ProcessedLayerData): EDMDItem {
    const baseItem = this.createBaseItem(
      ItemType.SINGLE,
      GeometryType.LAYER,
      layer.name,
      `Layer: ${layer.name} (${layer.type})`
    );
    
    return {
      ...baseItem,
      id: layer.processedId,
      Identifier: this.createIdentifier('LAYER', layer.id),
      UserProperties: this.createLayerProperties(layer)
    } as EDMDItem;
  }
  
  private createLayerProperties(layer: ProcessedLayerData): any[] {
    const properties = [
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'LayerType'
        },
        Value: layer.type
      },
      {
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'Thickness'
        },
        Value: layer.thickness.toString()
      }
    ];
    
    if (layer.material) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'Material'
        },
        Value: layer.material
      });
    }
    
    if (layer.copperWeight) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'CopperWeight'
        },
        Value: layer.copperWeight.toString()
      });
    }
    
    if (layer.dielectricConstant) {
      properties.push({
        Key: {
          SystemScope: this.config.creatorSystem,
          ObjectName: 'DielectricConstant'
        },
        Value: layer.dielectricConstant.toString()
      });
    }
    
    return properties;
  }
  
  private normalizeLayerType(type: string): string {
    const typeMap: Record<string, string> = {
      'SIGNAL': 'OTHERSIGNAL',
      'PLANE': 'OTHERSIGNAL',
      'SOLDERMASK': 'SOLDERMASK',
      'SILKSCREEN': 'SILKSCREEN',
      'DIELECTRIC': 'DIELECTRIC',
      'OTHERSIGNAL': 'OTHERSIGNAL'
    };
    
    return typeMap[type] || 'OTHERSIGNAL';
  }
}

interface ProcessedLayerData extends LayerData {
  processedId: string;
  normalizedType: string;
}
```

### 3. ValidationEngine增强

```typescript
export class ValidationEngine {
  private validators: Map<string, DataValidator> = new Map();
  
  constructor(private config: ValidationConfig) {
    this.initializeValidators();
  }
  
  private initializeValidators(): void {
    this.validators.set('board', new BoardDataValidator());
    this.validators.set('component', new ComponentDataValidator());
    this.validators.set('hole', new HoleDataValidator());
    this.validators.set('keepout', new KeepoutDataValidator());
    this.validators.set('layer', new LayerDataValidator());
  }
  
  validateExportData(data: ExportSourceData): ValidationResult<ExportSourceData> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 验证板数据
    const boardValidation = this.validators.get('board')!.validate(data.board);
    errors.push(...boardValidation.errors);
    warnings.push(...boardValidation.warnings);
    
    // 验证组件数据
    if (data.components) {
      for (const component of data.components) {
        const componentValidation = this.validators.get('component')!.validate(component);
        errors.push(...componentValidation.errors.map(e => `Component ${component.refDes}: ${e}`));
        warnings.push(...componentValidation.warnings.map(w => `Component ${component.refDes}: ${w}`));
      }
    }
    
    // 验证孔数据
    if (data.holes) {
      for (const hole of data.holes) {
        const holeValidation = this.validators.get('hole')!.validate(hole);
        errors.push(...holeValidation.errors.map(e => `Hole ${hole.id}: ${e}`));
        warnings.push(...holeValidation.warnings.map(w => `Hole ${hole.id}: ${w}`));
      }
    }
    
    // 验证禁止区数据
    if (data.keepouts) {
      for (const keepout of data.keepouts) {
        const keepoutValidation = this.validators.get('keepout')!.validate(keepout);
        errors.push(...keepoutValidation.errors.map(e => `Keepout ${keepout.id}: ${e}`));
        warnings.push(...keepoutValidation.warnings.map(w => `Keepout ${keepout.id}: ${w}`));
      }
    }
    
    // 验证层数据
    if (data.layers) {
      for (const layer of data.layers) {
        const layerValidation = this.validators.get('layer')!.validate(layer);
        errors.push(...layerValidation.errors.map(e => `Layer ${layer.id}: ${e}`));
        warnings.push(...layerValidation.warnings.map(w => `Layer ${layer.id}: ${w}`));
      }
    }
    
    // 交叉验证
    this.performCrossValidation(data, errors, warnings);
    
    return {
      valid: errors.length === 0,
      data,
      errors,
      warnings
    };
  }
  
  private performCrossValidation(data: ExportSourceData, errors: string[], warnings: string[]): void {
    // 验证组件是否在板边界内
    if (data.components && data.board.outline) {
      for (const component of data.components) {
        if (!this.isPointInBounds(component.position, data.board.outline)) {
          warnings.push(`Component ${component.refDes} is outside board outline`);
        }
      }
    }
    
    // 验证孔是否在板边界内
    if (data.holes && data.board.outline) {
      for (const hole of data.holes) {
        if (!this.isPointInBounds(hole.position, data.board.outline)) {
          warnings.push(`Hole ${hole.id} is outside board outline`);
        }
      }
    }
    
    // 验证层叠结构一致性
    if (data.layers && data.layerStackup) {
      const layerIds = new Set(data.layers.map(l => l.id));
      for (const stackupLayer of data.layerStackup.layers) {
        if (!layerIds.has(stackupLayer.layerId)) {
          errors.push(`Layer stackup references undefined layer: ${stackupLayer.layerId}`);
        }
      }
    }
  }
  
  private isPointInBounds(point: { x: number; y: number }, outline: any): boolean {
    // 简化的边界检查实现
    if (!outline.points || outline.points.length < 3) return true;
    
    const minX = Math.min(...outline.points.map((p: any) => p.x));
    const maxX = Math.max(...outline.points.map((p: any) => p.x));
    const minY = Math.min(...outline.points.map((p: any) => p.y));
    const maxY = Math.max(...outline.points.map((p: any) => p.y));
    
    return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
  }
}

export interface ValidationConfig {
  strictMode: boolean;
  enableCrossValidation: boolean;
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  name: string;
  validate: (data: any) => ValidationResult<any>;
}

export abstract class DataValidator {
  abstract validate(data: any): ValidationResult<any>;
}
```

### 4. XMLWriter注释支持

```typescript
export class XMLWriterWithComments extends XMLWriter {
  private commentGenerator: CommentGenerator;
  
  constructor(options: XMLWriterOptions = {}) {
    super(options);
    this.commentGenerator = new CommentGenerator();
  }
  
  serialize(dataset: EDMDDataSet): string {
    const doc = create({ version: '1.0', encoding: this.encoding });
    
    // 添加文件头注释
    doc.com(this.commentGenerator.generateFileHeader(dataset));
    
    // 创建根元素
    const root = doc.ele('foundation:EDMDDataSet', this.namespaces);
    
    // 添加数据集注释
    root.com(this.commentGenerator.generateDatasetComment(dataset));
    
    // 构建Header（带注释）
    this.buildHeaderWithComments(root, dataset.Header);
    
    // 构建Body（带注释）
    this.buildBodyWithComments(root, dataset.Body);
    
    // 构建ProcessInstruction（带注释）
    this.buildProcessInstructionWithComments(root, dataset.ProcessInstruction);
    
    return doc.end({
      prettyPrint: this.prettyPrint,
      indent: '  ',
      newline: '\n'
    });
  }
  
  private buildHeaderWithComments(root: any, header: EDMDHeader): void {
    root.com('Header section - Contains metadata about the IDX file');
    
    const headerElement = root.ele('foundation:Header', { 'xsi:type': 'foundation:EDMDHeader' });
    
    if (header.Description) {
      headerElement.com('Design description');
      headerElement.ele('foundation:Description').txt(header.Description);
    }
    
    if (header.CreatorSystem) {
      headerElement.com('System that created this file');
      headerElement.ele('foundation:CreatorSystem').txt(header.CreatorSystem);
    }
    
    if (header.CreatorCompany) {
      headerElement.com('Company information');
      headerElement.ele('foundation:CreatorCompany').txt(header.CreatorCompany);
    }
    
    headerElement.com('Global units and timestamps');
    headerElement.ele('foundation:GlobalUnitLength').txt(header.GlobalUnitLength);
    headerElement.ele('foundation:CreationDateTime').txt(header.CreationDateTime);
    headerElement.ele('foundation:ModifiedDateTime').txt(header.ModifiedDateTime);
  }
  
  private buildBodyWithComments(root: any, body: EDMDDataSetBody): void {
    root.com('Body section - Contains all design data');
    
    const bodyElement = root.ele('foundation:Body', { 'xsi:type': 'foundation:EDMDDataSetBody' });
    
    // 几何元素注释
    if (body.GeometricElements && body.GeometricElements.length > 0) {
      bodyElement.com(`Geometric elements (${body.GeometricElements.length} items)`);
      for (const element of body.GeometricElements) {
        this.buildGeometricElementWithComments(bodyElement, element);
      }
    }
    
    // 曲线集注释
    if (body.CurveSet2Ds && body.CurveSet2Ds.length > 0) {
      bodyElement.com(`2D Curve sets (${body.CurveSet2Ds.length} items)`);
      for (const curveSet of body.CurveSet2Ds) {
        this.buildCurveSet2DWithComments(bodyElement, curveSet);
      }
    }
    
    // 项目注释
    bodyElement.com(`Design items (${body.Items.length} items)`);
    for (const item of body.Items) {
      this.buildItemWithComments(bodyElement, item);
    }
  }
  
  private buildItemWithComments(parent: any, item: EDMDItem): void {
    const itemComment = this.commentGenerator.generateItemComment(item);
    parent.com(itemComment);
    
    // 调用原有的buildItem方法
    this.buildItem(parent, item);
  }
  
  private buildGeometricElementWithComments(parent: any, element: any): void {
    const elementComment = this.commentGenerator.generateGeometricElementComment(element);
    parent.com(elementComment);
    
    // 调用原有的buildGeometricElement方法
    this.buildGeometricElement(parent, element);
  }
  
  private buildCurveSet2DWithComments(parent: any, curveSet: any): void {
    const curveSetComment = this.commentGenerator.generateCurveSetComment(curveSet);
    parent.com(curveSetComment);
    
    // 调用原有的buildCurveSet2D方法
    this.buildCurveSet2D(parent, curveSet);
  }
  
  private buildProcessInstructionWithComments(root: any, instruction: EDMDProcessInstruction): void {
    root.com('Process instruction - Defines what to do with this data');
    
    // 调用原有的buildProcessInstruction方法
    this.buildProcessInstruction(root, instruction);
  }
}

export class CommentGenerator {
  generateFileHeader(dataset: EDMDDataSet): string {
    const timestamp = new Date().toISOString();
    const itemCount = dataset.Body.Items.length;
    
    return [
      'IDX Export File',
      `Generated: ${timestamp}`,
      `Total Items: ${itemCount}`,
      `Creator: ${dataset.Header.CreatorSystem || 'Unknown'}`,
      'Format: IDX v4.5 with simplified geometry representation'
    ].join('\n');
  }
  
  generateDatasetComment(dataset: EDMDDataSet): string {
    return `Dataset contains ${dataset.Body.Items.length} items`;
  }
  
  generateItemComment(item: EDMDItem): string {
    const parts = [`Item: ${item.Name || item.id}`];
    
    if (item.geometryType) {
      parts.push(`Type: ${item.geometryType}`);
    }
    
    if (item.Description) {
      parts.push(`Description: ${item.Description}`);
    }
    
    return parts.join(' | ');
  }
  
  generateGeometricElementComment(element: any): string {
    if (element['xsi:type'] === 'd2:EDMDCartesianPoint') {
      return `Point at (${element.X['property:Value']}, ${element.Y['property:Value']})`;
    } else if (element.type === 'PolyLine') {
      return `PolyLine with ${element.Point?.length || 0} points`;
    } else if (element.type === 'CircleCenter') {
      return `Circle with diameter ${element.Diameter['property:Value']}`;
    }
    
    return `Geometric element: ${element.type || 'Unknown'}`;
  }
  
  generateCurveSetComment(curveSet: any): string {
    const lowerBound = curveSet['d2:LowerBound']['property:Value'];
    const upperBound = curveSet['d2:UpperBound']['property:Value'];
    
    return `2.5D Curve set: Z-range [${lowerBound}, ${upperBound}]`;
  }
}
```

## Data Models

### 核心数据模型扩展

```typescript
// 扩展现有的BoardData接口
export interface BoardData {
  id: string;
  name: string;
  outline: {
    points: Array<{ x: number; y: number }>;
    thickness: number;
  };
  layers?: LayerData[];
  layerStackup?: LayerStackupData;
  components?: ComponentData[];
  holes?: HoleData[];
  keepouts?: KeepoutData[];
  properties?: Record<string, any>;
}

// 新增的数据模型
export interface LayerData {
  id: string;
  name: string;
  type: LayerType;
  thickness: number;
  material?: string;
  copperWeight?: number;
  dielectricConstant?: number;
  properties?: Record<string, any>;
}

export enum LayerType {
  SIGNAL = 'SIGNAL',
  PLANE = 'PLANE',
  SOLDERMASK = 'SOLDERMASK',
  SILKSCREEN = 'SILKSCREEN',
  DIELECTRIC = 'DIELECTRIC',
  OTHERSIGNAL = 'OTHERSIGNAL'
}

export interface LayerStackupData {
  id: string;
  name: string;
  totalThickness: number;
  layers: Array<{
    layerId: string;
    position: number;
    thickness: number;
  }>;
}

export interface ComponentData {
  refDes: string;
  partNumber: string;
  packageName: string;
  position: Position3D;
  dimensions: Dimensions3D;
  properties?: Record<string, any>;
  pins?: PinData[];
}

export interface Position3D {
  x: number;
  y: number;
  z?: number;
  rotation: number;
}

export interface Dimensions3D {
  width: number;
  height: number;
  thickness: number;
}

export interface PinData {
  number: string;
  position: { x: number; y: number };
  diameter?: number;
  shape?: 'round' | 'square' | 'oval';
}

export interface HoleData {
  id: string;
  type: 'plated' | 'non-plated';
  position: { x: number; y: number };
  diameter: number;
  platingThickness?: number;
  drillDepth?: number;
  properties?: Record<string, any>;
}

export interface KeepoutData {
  id: string;
  type: 'component' | 'via' | 'trace';
  geometry: GeometryData;
  layers: string[];
  properties?: Record<string, any>;
}

export interface GeometryData {
  type: 'rectangle' | 'circle' | 'polygon';
  points?: Array<{ x: number; y: number }>;
  center?: { x: number; y: number };
  width?: number;
  height?: number;
  radius?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Extended interface support
*For any* ExportSourceData object containing components, holes, or keepouts arrays, the IDX_Exporter should successfully process all data types without type errors
**Validates: Requirements 1.1**

### Property 2: Layer builder compliance
*For any* valid LayerData array, the LayerBuilder should generate EDMDItem objects that conform to IDX v4.5 specification
**Validates: Requirements 2.1**

### Property 3: Layer stackup processing
*For any* board data with layers and layerStackup, the IDX_Exporter should correctly represent the layer hierarchy in the output XML
**Validates: Requirements 2.2**

### Property 4: Layer attribute preservation
*For any* layer data with thickness and material information, the XMLWriter should include all layer attributes in the generated XML
**Validates: Requirements 2.3, 2.4**

### Property 5: Configuration-driven layer stackup inclusion
*For any* export configuration with includeLayerStackup set to true, the output should contain complete layer stackup information
**Validates: Requirements 2.5**

### Property 6: Component ItemType correctness
*For any* component data being exported, the XMLWriter should assign ItemType as "single" rather than "assembly"
**Validates: Requirements 3.1**

### Property 7: XML structure validation
*For any* generated XML structure, all required IDX v4.5 attributes should be present and valid
**Validates: Requirements 3.2, 3.4**

### Property 8: Comprehensive type definition support
*For any* usage of ExportSourceData, BoardData, ComponentData, HoleData, or KeepoutData interfaces, the TypeScript compiler should not produce type errors
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 9: Validation error reporting quality
*For any* invalid input data, the ValidationEngine should return specific error messages indicating the problem location and suggested fixes
**Validates: Requirements 5.1, 5.2, 5.4**

### Property 10: Error recovery and warning handling
*For any* export process encountering warnings, the IDX_Exporter should log warnings but continue processing successfully
**Validates: Requirements 5.3, 5.5**

### Property 11: XML output quality and formatting
*For any* export operation, the XMLWriter should generate valid, well-formatted XML with appropriate precision and readability
**Validates: Requirements 6.1, 6.2, 6.3**

### Property 12: Serialization round-trip consistency
*For any* valid BoardData object, serializing to XML and then deserializing should produce an equivalent object
**Validates: Requirements 6.4**

### Property 13: Comprehensive XML comment generation
*For any* XML export operation, the XMLWriter should include descriptive comments in the file header and all major sections (components, layers, geometry)
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

## Error Handling

### Error Classification

1. **Validation Errors**: Input data that doesn't meet IDX specification requirements
   - Missing required fields
   - Invalid data types or ranges
   - Inconsistent cross-references

2. **Build Errors**: Failures during the construction process
   - Memory allocation issues
   - Geometric calculation failures
   - Builder initialization problems

3. **Serialization Errors**: Issues during XML generation
   - Invalid XML characters
   - Namespace conflicts
   - Structure validation failures

### Error Recovery Strategies

1. **Graceful Degradation**: When non-critical data is invalid, continue processing with warnings
2. **Default Value Substitution**: Use sensible defaults for missing optional parameters
3. **Partial Export**: Allow export of valid portions when some data is corrupted
4. **Detailed Logging**: Provide comprehensive error context for debugging

### Validation Engine Architecture

```typescript
export interface ErrorContext {
  location: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  suggestion?: string;
  data?: any;
}

export class ValidationEngine {
  validateWithRecovery(data: ExportSourceData): {
    result: ExportSourceData;
    errors: ErrorContext[];
    recovered: boolean;
  } {
    // Implementation with error recovery logic
  }
}
```

## Testing Strategy

### Dual Testing Approach

This system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Example file compilation and execution
- Specific IDX validation scenarios
- Error condition handling
- Integration between builders and assemblers

**Property Tests**: Verify universal properties across all inputs using property-based testing library (fast-check for TypeScript)
- Each property test runs minimum 100 iterations
- Comprehensive input coverage through randomization
- Universal correctness properties validation

### Property-Based Testing Configuration

Each property test will be implemented using fast-check and tagged with comments referencing the design document property:

```typescript
// Feature: idx-exporter-completion, Property 1: Extended interface support
fc.assert(fc.property(
  fc.record({
    board: boardDataArbitrary,
    components: fc.array(componentDataArbitrary),
    holes: fc.array(holeDataArbitrary),
    keepouts: fc.array(keepoutDataArbitrary)
  }),
  (data) => {
    const exporter = new IDXExporter();
    const result = exporter.export(data);
    return result.success || result.issues.every(issue => issue.type === 'warning');
  }
), { numRuns: 100 });
```

### Testing Coverage Areas

1. **Interface Compatibility**: Verify all new interfaces work correctly
2. **Layer Processing**: Test LayerBuilder with various layer configurations
3. **XML Generation**: Validate XML structure and comments
4. **Error Handling**: Test validation and recovery mechanisms
5. **Performance**: Ensure no regression in export performance
6. **Compliance**: Verify 100% IDX v4.5 validation pass rate