// ============= 数据模型类型测试 =============
// NOTE: 验证数据模型接口的类型兼容性和功能

import {
  ComponentData,
  HoleData,
  KeepoutData,
  LayerData,
  LayerStackupData,
  LayerType,
  ExtendedExportSourceData,
  isValidComponentData,
  isValidHoleData,
  isValidKeepoutData,
  isValidLayerData,
  isValidLayerStackupData,
  calculateStackupThickness,
  getLayerZPosition,
  validateGeometry,
  createDefault4LayerStackup
} from './data-models';

// ============= 类型兼容性测试 =============

/**
 * 测试组件数据类型
 */
function testComponentData(): ComponentData {
  const component: ComponentData = {
    refDes: "U1",
    partNumber: "STM32F407VGT6",
    packageName: "LQFP-100",
    position: { x: 10.5, y: 20.3, z: 0, rotation: 0 },
    dimensions: { width: 14, height: 14, thickness: 1.6 },
    layer: "TOP",
    isMechanical: false,
    electrical: {
      nets: { "VCC": "VCC_3V3", "GND": "GND" },
      characteristics: { "maxCurrent": 100 }
    },
    thermal: {
      thermalResistance: 25,
      maxPowerDissipation: 2.5
    },
    model3D: {
      modelIdentifier: "STM32F407VGT6.step",
      format: "STEP",
      version: "1.0"
    },
    pins: [
      { 
        number: "1", 
        position: { x: -6.5, y: 6.5 }, 
        diameter: 0.3, 
        shape: "round",
        netName: "VCC",
        pinType: "power"
      }
    ],
    properties: { "manufacturer": "STMicroelectronics" }
  };

  console.log("Component data test passed:", isValidComponentData(component));
  return component;
}

/**
 * 测试孔数据类型
 */
function testHoleData(): HoleData {
  const via: HoleData = {
    id: "VIA_001",
    type: "plated",
    position: { x: 15.2, y: 8.7 },
    diameter: 0.2,
    platingThickness: 0.025,
    drillDepth: 1.6,
    startLayer: "L1",
    endLayer: "L4",
    padDiameter: 0.4,
    antiPadDiameter: 0.6,
    netName: "VCC",
    viaType: "through",
    purpose: "via",
    properties: { "impedance": 50 }
  };

  console.log("Hole data test passed:", isValidHoleData(via));
  return via;
}

/**
 * 测试禁止区数据类型
 */
function testKeepoutData(): KeepoutData {
  const keepout: KeepoutData = {
    id: "KEEPOUT_001",
    type: "component",
    geometry: {
      type: "rectangle",
      center: { x: 25, y: 15 },
      width: 10,
      height: 8,
      rotation: 0
    },
    layers: ["TOP", "BOTTOM"],
    height: { min: 0, max: 5 },
    purpose: "placement",
    severity: "error",
    enabled: true,
    properties: { "reason": "High voltage area" }
  };

  console.log("Keepout data test passed:", isValidKeepoutData(keepout));
  console.log("Geometry validation passed:", validateGeometry(keepout.geometry));
  return keepout;
}

/**
 * 测试层数据类型
 */
function testLayerData(): LayerData {
  const layer: LayerData = {
    id: "L1",
    name: "Top Signal",
    type: LayerType.SIGNAL,
    thickness: 0.035,
    material: "Copper",
    copperWeight: 1,
    dielectricConstant: 4.5,
    lossTangent: 0.02,
    surfaceFinish: "HASL",
    color: "#FF0000",
    visible: true,
    properties: { "impedance": 50 }
  };

  console.log("Layer data test passed:", isValidLayerData(layer));
  return layer;
}

/**
 * 测试层叠结构数据类型
 */
function testLayerStackupData(): LayerStackupData {
  const stackup: LayerStackupData = {
    id: "STACKUP_4L",
    name: "4-Layer Standard",
    totalThickness: 1.6,
    description: "Standard 4-layer PCB stackup",
    boardType: "rigid",
    layers: [
      { layerId: "L1", position: 1, thickness: 0.035, material: "Copper" },
      { layerId: "D1", position: 2, thickness: 0.2, material: "FR4" },
      { layerId: "L2", position: 3, thickness: 0.035, material: "Copper" },
      { layerId: "CORE", position: 4, thickness: 1.065, material: "FR4" },
      { layerId: "L3", position: 5, thickness: 0.035, material: "Copper" },
      { layerId: "D2", position: 6, thickness: 0.2, material: "FR4" },
      { layerId: "L4", position: 7, thickness: 0.035, material: "Copper" }
    ],
    impedanceControl: {
      singleEnded: 50,
      differential: 100,
      tolerance: 10
    },
    properties: { "manufacturer": "PCB Fab Co." }
  };

  console.log("Layer stackup data test passed:", isValidLayerStackupData(stackup));
  
  // 测试工具函数
  const calculatedThickness = calculateStackupThickness(stackup);
  console.log("Calculated thickness:", calculatedThickness, "mm");
  
  const l1Position = getLayerZPosition(stackup, "L1");
  console.log("L1 Z position:", l1Position, "mm");
  
  return stackup;
}

/**
 * 测试扩展导出源数据类型
 */
function testExtendedExportSourceData(): ExtendedExportSourceData {
  const component = testComponentData();
  const hole = testHoleData();
  const keepout = testKeepoutData();
  const layer = testLayerData();
  const stackup = testLayerStackupData();

  const exportData: ExtendedExportSourceData = {
    board: {
      id: "BOARD_001",
      name: "Test Board",
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 }
        ],
        thickness: 1.6
      },
      components: [component],
      holes: [hole],
      keepouts: [keepout],
      layers: [layer],
      layerStackup: stackup,
      properties: { "version": "1.0" }
    },
    components: [component], // 也可以在顶层定义
    holes: [hole],
    keepouts: [keepout],
    layers: [layer],
    layerStackup: stackup
  };

  console.log("Extended export source data test passed");
  return exportData;
}

/**
 * 测试默认层叠结构创建
 */
function testDefaultStackup(): LayerStackupData {
  const defaultStackup = createDefault4LayerStackup();
  console.log("Default 4-layer stackup created:", defaultStackup.name);
  console.log("Total thickness:", calculateStackupThickness(defaultStackup), "mm");
  
  return defaultStackup;
}

// ============= 运行所有测试 =============

describe('Data Models', () => {
  test('Component data type validation', () => {
    const component = testComponentData();
    expect(isValidComponentData(component)).toBe(true);
  });

  test('Hole data type validation', () => {
    const hole = testHoleData();
    expect(isValidHoleData(hole)).toBe(true);
  });

  test('Keepout data type validation', () => {
    const keepout = testKeepoutData();
    expect(isValidKeepoutData(keepout)).toBe(true);
    expect(validateGeometry(keepout.geometry)).toBe(true);
  });

  test('Layer data type validation', () => {
    const layer = testLayerData();
    expect(isValidLayerData(layer)).toBe(true);
  });

  test('Layer stackup data type validation', () => {
    const stackup = testLayerStackupData();
    expect(isValidLayerStackupData(stackup)).toBe(true);
    
    const calculatedThickness = calculateStackupThickness(stackup);
    expect(calculatedThickness).toBeCloseTo(1.6, 2);
    
    const l1Position = getLayerZPosition(stackup, "L1");
    expect(typeof l1Position).toBe('number');
  });

  test('Extended export source data type validation', () => {
    const exportData = testExtendedExportSourceData();
    expect(exportData).toBeDefined();
    expect(exportData.board).toBeDefined();
  });

  test('Default stackup creation', () => {
    const defaultStackup = testDefaultStackup();
    expect(defaultStackup.name).toBeDefined();
    expect(calculateStackupThickness(defaultStackup)).toBeGreaterThan(0);
  });
});

export function runDataModelTests() {
  console.log("=== 数据模型类型测试开始 ===");
  
  try {
    testComponentData();
    testHoleData();
    testKeepoutData();
    testLayerData();
    testLayerStackupData();
    testExtendedExportSourceData();
    testDefaultStackup();
    
    console.log("=== 所有数据模型测试通过 ===");
    return true;
  } catch (error) {
    console.error("数据模型测试失败:", error);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runDataModelTests();
}