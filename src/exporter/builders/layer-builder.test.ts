// ============= src/exporter/builders/layer-builder.test.ts =============

import { LayerBuilder } from './layer-builder';
import { LayerData, LayerType } from '../../types/data-models';
import { BuilderConfig, BuilderContext } from './base-builder';
import { GlobalUnit, ItemType, GeometryType } from '../../types/core';

// Simple mock implementation
class MockBuilderContext implements BuilderContext {
  private sequences = new Map<string, number>();
  private warnings: Array<{ code: string; message: string; itemId?: string }> = [];
  private errors: Array<{ code: string; message: string; itemId?: string }> = [];
  
  getNextSequence(type: string): number {
    const current = this.sequences.get(type) || 0;
    const next = current + 1;
    this.sequences.set(type, next);
    return next;
  }
  
  addWarning(code: string, message: string, itemId?: string): void {
    this.warnings.push({ code, message, itemId });
  }
  
  addError(code: string, message: string, itemId?: string): void {
    this.errors.push({ code, message, itemId });
  }
  
  generateId(type: string, identifier?: string): string {
    const seq = this.getNextSequence(`${type}_ID`);
    return identifier ? `${type}_${identifier}_${seq}` : `${type}_${seq}`;
  }
  
  getWarnings() { return this.warnings; }
  getErrors() { return this.errors; }
}

const mockContext = new MockBuilderContext();

const config: BuilderConfig = {
  useSimplified: true,
  defaultUnit: GlobalUnit.UNIT_MM,
  creatorSystem: 'TestSystem',
  idPrefix: 'TEST',
  precision: 6
};

describe('LayerBuilder', () => {
  let builder: LayerBuilder;
  let mockContext: MockBuilderContext;
  let config: BuilderConfig;

  beforeEach(() => {
    mockContext = new MockBuilderContext();
    config = {
      useSimplified: true,
      defaultUnit: GlobalUnit.UNIT_MM,
      creatorSystem: 'TestSystem',
      idPrefix: 'TEST',
      precision: 6
    };
    builder = new LayerBuilder(config, mockContext);
  });

  test('should validate empty array', () => {
    const result = (builder as any).validateInput([]);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test('should validate valid layer data', () => {
    const validLayerData: LayerData[] = [
      {
        id: 'L1',
        name: 'Top Signal',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      }
    ];
    
    const result = (builder as any).validateInput(validLayerData);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('should reject invalid thickness', () => {
    const invalidThicknessData: LayerData[] = [
      {
        id: 'L1',
        name: 'Top Signal',
        type: LayerType.SIGNAL,
        thickness: -0.1 // 无效的负厚度
      }
    ];
    
    const result = (builder as any).validateInput(invalidThicknessData);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should normalize layer types correctly', () => {
    const signalType = (builder as any).normalizeLayerType(LayerType.SIGNAL);
    expect(signalType).toBe(GeometryType.LAYER_OTHERSIGNAL);
    
    const soldermaskType = (builder as any).normalizeLayerType(LayerType.SOLDERMASK);
    expect(soldermaskType).toBe(GeometryType.LAYER_SOLDERMASK);
  });

  test('should build complete layer structure', async () => {
    const testLayers: LayerData[] = [
      {
        id: 'L1',
        name: 'Top Signal',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      },
      {
        id: 'SM_TOP',
        name: 'Top Soldermask',
        type: LayerType.SOLDERMASK,
        thickness: 0.025,
        material: 'Solder Resist',
        color: 'Green'
      }
    ];
    
    const result = await builder.build(testLayers);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    
    // 检查第一个层（信号层）
    const signalLayer = result[0];
    expect(signalLayer.ItemType).toBe(ItemType.ASSEMBLY);
    expect(signalLayer.geometryType).toBe(GeometryType.LAYER_OTHERSIGNAL);
    expect(signalLayer.Name).toBe('Top Signal');
    expect(signalLayer.BaseLine).toBe(true);
    
    // 检查用户属性
    const properties = signalLayer.UserProperties || [];
    const layerIdProp = properties.find(p => p.Key.ObjectName === 'LAYER_ID');
    expect(layerIdProp?.Value).toBe('L1');
    
    const thicknessProp = properties.find(p => p.Key.ObjectName === 'THICKNESS');
    expect(thicknessProp?.Value).toBe('0.035');
    
    const materialProp = properties.find(p => p.Key.ObjectName === 'MATERIAL');
    expect(materialProp?.Value).toBe('Copper');
    
    // 检查第二个层（阻焊层）
    const soldermaskLayer = result[1];
    expect(soldermaskLayer.geometryType).toBe(GeometryType.LAYER_SOLDERMASK);
    expect(soldermaskLayer.Name).toBe('Top Soldermask');
    
    const smProperties = soldermaskLayer.UserProperties || [];
    const colorProp = smProperties.find(p => p.Key.ObjectName === 'COLOR');
    expect(colorProp?.Value).toBe('Green');
  });

  test('should handle dielectric layer properties', async () => {
    const dielectricLayers: LayerData[] = [
      {
        id: 'D1',
        name: 'Prepreg 1',
        type: LayerType.DIELECTRIC,
        thickness: 0.2,
        material: 'FR4',
        dielectricConstant: 4.5,
        lossTangent: 0.02
      }
    ];
    
    const result = await builder.build(dielectricLayers);
    expect(result.length).toBe(1);
    
    const dielectricLayer = result[0];
    expect(dielectricLayer.geometryType).toBe(GeometryType.LAYER_DIELECTRIC);
    
    const properties = dielectricLayer.UserProperties || [];
    const dielectricConstantProp = properties.find(p => p.Key.ObjectName === 'DIELECTRIC_CONSTANT');
    expect(dielectricConstantProp?.Value).toBe('4.5');
    
    const lossTangentProp = properties.find(p => p.Key.ObjectName === 'LOSS_TANGENT');
    expect(lossTangentProp?.Value).toBe('0.02');
  });
});

/**
 * 测试LayerBuilder基本功能
 */
export async function testLayerBuilder() {
  console.log("=== LayerBuilder测试开始 ===");
  
  try {
    const mockContext = new MockBuilderContext();
    const config: BuilderConfig = {
      useSimplified: true,
      defaultUnit: GlobalUnit.UNIT_MM,
      creatorSystem: 'TestSystem',
      idPrefix: 'TEST',
      precision: 6
    };
    const builder = new LayerBuilder(config, mockContext);
    
    // 测试用例1: 空数组验证
    console.log("测试1: 空数组验证");
    const emptyResult = (builder as any).validateInput([]);
    console.assert(emptyResult.valid === true, "空数组应该验证通过");
    console.assert(emptyResult.warnings.length > 0, "空数组应该有警告");
    console.log("✓ 空数组验证测试通过");
    
    // 测试用例2: 有效层数据验证
    console.log("测试2: 有效层数据验证");
    const validLayerData: LayerData[] = [
      {
        id: 'L1',
        name: 'Top Signal',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      }
    ];
    
    const validResult = (builder as any).validateInput(validLayerData);
    console.assert(validResult.valid === true, "有效层数据应该验证通过");
    console.assert(validResult.errors.length === 0, "有效层数据不应该有错误");
    console.log("✓ 有效层数据验证测试通过");
    
    // 测试用例3: 无效厚度验证
    console.log("测试3: 无效厚度验证");
    const invalidThicknessData: LayerData[] = [
      {
        id: 'L1',
        name: 'Top Signal',
        type: LayerType.SIGNAL,
        thickness: -0.1 // 无效的负厚度
      }
    ];
    
    const invalidResult = (builder as any).validateInput(invalidThicknessData);
    console.assert(invalidResult.valid === false, "无效厚度应该验证失败");
    console.assert(invalidResult.errors.length > 0, "无效厚度应该有错误");
    console.log("✓ 无效厚度验证测试通过");
    
    // 测试用例4: 层类型标准化
    console.log("测试4: 层类型标准化");
    const signalType = (builder as any).normalizeLayerType(LayerType.SIGNAL);
    console.assert(signalType === GeometryType.LAYER_OTHERSIGNAL, "信号层应该映射到LAYER_OTHERSIGNAL");
    
    const soldermaskType = (builder as any).normalizeLayerType(LayerType.SOLDERMASK);
    console.assert(soldermaskType === GeometryType.LAYER_SOLDERMASK, "阻焊层应该映射到LAYER_SOLDERMASK");
    console.log("✓ 层类型标准化测试通过");
    
    // 测试用例5: 完整构建流程
    console.log("测试5: 完整构建流程");
    const testLayers: LayerData[] = [
      {
        id: 'L1',
        name: 'Top Signal',
        type: LayerType.SIGNAL,
        thickness: 0.035,
        material: 'Copper',
        copperWeight: 1
      },
      {
        id: 'SM_TOP',
        name: 'Top Soldermask',
        type: LayerType.SOLDERMASK,
        thickness: 0.025,
        material: 'Solder Resist',
        color: 'Green'
      }
    ];
    
    const result = await builder.build(testLayers);
    console.assert(Array.isArray(result), "构建结果应该是数组");
    console.assert(result.length === 2, "应该构建2个层项目");
    
    // 检查第一个层（信号层）
    const signalLayer = result[0];
    console.assert(signalLayer.ItemType === ItemType.ASSEMBLY, "层应该是ASSEMBLY类型");
    console.assert(signalLayer.geometryType === GeometryType.LAYER_OTHERSIGNAL, "信号层几何类型正确");
    console.assert(signalLayer.Name === 'Top Signal', "层名称正确");
    console.assert(signalLayer.BaseLine === true, "层应该标记为基线");
    
    // 检查用户属性
    const properties = signalLayer.UserProperties || [];
    const layerIdProp = properties.find(p => p.Key.ObjectName === 'LAYER_ID');
    console.assert(layerIdProp?.Value === 'L1', "层ID属性正确");
    
    const thicknessProp = properties.find(p => p.Key.ObjectName === 'THICKNESS');
    console.assert(thicknessProp?.Value === '0.035', "厚度属性正确");
    
    const materialProp = properties.find(p => p.Key.ObjectName === 'MATERIAL');
    console.assert(materialProp?.Value === 'Copper', "材料属性正确");
    
    // 检查第二个层（阻焊层）
    const soldermaskLayer = result[1];
    console.assert(soldermaskLayer.geometryType === GeometryType.LAYER_SOLDERMASK, "阻焊层几何类型正确");
    console.assert(soldermaskLayer.Name === 'Top Soldermask', "阻焊层名称正确");
    
    const smProperties = soldermaskLayer.UserProperties || [];
    const colorProp = smProperties.find(p => p.Key.ObjectName === 'COLOR');
    console.assert(colorProp?.Value === 'Green', "颜色属性正确");
    
    console.log("✓ 完整构建流程测试通过");
    
    // 测试用例6: 介质层特殊属性
    console.log("测试6: 介质层特殊属性");
    const dielectricLayers: LayerData[] = [
      {
        id: 'D1',
        name: 'Prepreg 1',
        type: LayerType.DIELECTRIC,
        thickness: 0.2,
        material: 'FR4',
        dielectricConstant: 4.5,
        lossTangent: 0.02
      }
    ];
    
    const dielectricResult = await builder.build(dielectricLayers);
    console.assert(dielectricResult.length === 1, "应该构建1个介质层");
    
    const dielectricLayer = dielectricResult[0];
    console.assert(dielectricLayer.geometryType === GeometryType.LAYER_DIELECTRIC, "介质层几何类型正确");
    
    const dProperties = dielectricLayer.UserProperties || [];
    const dielectricConstantProp = dProperties.find(p => p.Key.ObjectName === 'DIELECTRIC_CONSTANT');
    console.assert(dielectricConstantProp?.Value === '4.5', "介电常数属性正确");
    
    const lossTangentProp = dProperties.find(p => p.Key.ObjectName === 'LOSS_TANGENT');
    console.assert(lossTangentProp?.Value === '0.02', "损耗角正切属性正确");
    
    console.log("✓ 介质层特殊属性测试通过");
    
    console.log("=== 所有LayerBuilder测试通过 ===");
    return true;
    
  } catch (error) {
    console.error("LayerBuilder测试失败:", error);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testLayerBuilder().then(success => {
    process.exit(success ? 0 : 1);
  });
}