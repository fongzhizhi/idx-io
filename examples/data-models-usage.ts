// ============= 数据模型使用示例 =============
// NOTE: 演示如何使用新的数据模型接口

import {
  ComponentData,
  HoleData,
  KeepoutData,
  LayerData,
  LayerStackupData,
  LayerType,
  ExtendedExportSourceData,
  createDefault4LayerStackup,
  calculateStackupThickness,
  getLayerZPosition
} from '../src/types/data-models';

/**
 * 创建示例组件数据
 */
function createExampleComponent(): ComponentData {
  return {
    refDes: "U1",
    partNumber: "STM32F407VGT6",
    packageName: "LQFP-100",
    position: {
      x: 25.4,  // 1 inch from origin
      y: 12.7,  // 0.5 inch from origin
      z: 0,
      rotation: 0
    },
    dimensions: {
      width: 14,
      height: 14,
      thickness: 1.6
    },
    layer: "TOP",
    isMechanical: false,
    electrical: {
      nets: {
        "1": "VCC_3V3",
        "25": "GND",
        "50": "RESET",
        "75": "BOOT0"
      },
      characteristics: {
        "maxCurrent": 100,
        "operatingVoltage": 3.3
      }
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
        netName: "VCC_3V3",
        pinType: "power"
      },
      {
        number: "25",
        position: { x: -6.5, y: -6.5 },
        diameter: 0.3,
        shape: "round",
        netName: "GND",
        pinType: "ground"
      }
    ],
    properties: {
      "manufacturer": "STMicroelectronics",
      "datasheet": "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf",
      "cost": 12.50
    }
  };
}

/**
 * 创建示例过孔数据
 */
function createExampleVias(): HoleData[] {
  return [
    {
      id: "VIA_VCC_001",
      type: "plated",
      position: { x: 20, y: 10 },
      diameter: 0.2,
      platingThickness: 0.025,
      startLayer: "L1",
      endLayer: "L2",
      padDiameter: 0.4,
      antiPadDiameter: 0.6,
      netName: "VCC_3V3",
      viaType: "through",
      purpose: "via",
      properties: {
        "impedance": 50,
        "current_rating": 1.0
      }
    },
    {
      id: "VIA_GND_001",
      type: "plated",
      position: { x: 22, y: 10 },
      diameter: 0.2,
      platingThickness: 0.025,
      startLayer: "L1",
      endLayer: "L4",
      padDiameter: 0.4,
      antiPadDiameter: 0.6,
      netName: "GND",
      viaType: "through",
      purpose: "via"
    }
  ];
}

/**
 * 创建示例禁止区数据
 */
function createExampleKeepouts(): KeepoutData[] {
  return [
    {
      id: "KEEPOUT_CRYSTAL",
      type: "component",
      geometry: {
        type: "rectangle",
        center: { x: 30, y: 15 },
        width: 8,
        height: 6,
        rotation: 0
      },
      layers: ["TOP"],
      height: { min: 0, max: 3 },
      purpose: "placement",
      severity: "error",
      enabled: true,
      properties: {
        "reason": "Crystal oscillator sensitive area",
        "description": "Keep components away from crystal to avoid interference"
      }
    },
    {
      id: "KEEPOUT_CONNECTOR",
      type: "component",
      geometry: {
        type: "circle",
        center: { x: 5, y: 25 },
        radius: 4
      },
      layers: ["TOP", "BOTTOM"],
      height: { min: 0, max: "infinity" },
      purpose: "mechanical",
      severity: "warning",
      enabled: true,
      properties: {
        "reason": "Connector clearance area"
      }
    }
  ];
}

/**
 * 创建示例层数据
 */
function createExampleLayers(): LayerData[] {
  return [
    {
      id: "L1_TOP",
      name: "Top Signal",
      type: LayerType.SIGNAL,
      thickness: 0.035,
      material: "Copper",
      copperWeight: 1,
      surfaceFinish: "HASL",
      color: "#FF0000",
      visible: true,
      properties: {
        "impedance_target": 50,
        "trace_width_50ohm": 0.127
      }
    },
    {
      id: "L2_GND",
      name: "Ground Plane",
      type: LayerType.PLANE,
      thickness: 0.035,
      material: "Copper",
      copperWeight: 1,
      color: "#00FF00",
      visible: true,
      properties: {
        "plane_type": "ground"
      }
    },
    {
      id: "L3_PWR",
      name: "Power Plane",
      type: LayerType.PLANE,
      thickness: 0.035,
      material: "Copper",
      copperWeight: 1,
      color: "#0000FF",
      visible: true,
      properties: {
        "plane_type": "power",
        "voltage": 3.3
      }
    },
    {
      id: "L4_BOTTOM",
      name: "Bottom Signal",
      type: LayerType.SIGNAL,
      thickness: 0.035,
      material: "Copper",
      copperWeight: 1,
      surfaceFinish: "HASL",
      color: "#FFFF00",
      visible: true,
      properties: {
        "impedance_target": 50,
        "trace_width_50ohm": 0.127
      }
    }
  ];
}

/**
 * 创建完整的导出数据示例
 */
function createCompleteExportExample(): ExtendedExportSourceData {
  const component = createExampleComponent();
  const vias = createExampleVias();
  const keepouts = createExampleKeepouts();
  const layers = createExampleLayers();
  const stackup = createDefault4LayerStackup();

  // 计算一些有用的信息
  const totalThickness = calculateStackupThickness(stackup);
  const topLayerZ = getLayerZPosition(stackup, "L1_TOP");
  
  console.log(`Board total thickness: ${totalThickness.toFixed(3)} mm`);
  console.log(`Top layer Z position: ${topLayerZ?.toFixed(3)} mm`);

  return {
    board: {
      id: "DEMO_BOARD_001",
      name: "STM32 Demo Board",
      outline: {
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 30 },
          { x: 0, y: 30 }
        ],
        thickness: totalThickness
      },
      components: [component],
      holes: vias,
      keepouts: keepouts,
      layers: layers,
      layerStackup: stackup,
      properties: {
        "version": "1.0",
        "designer": "Demo Designer",
        "created": new Date().toISOString(),
        "board_class": "Class 2",
        "min_trace_width": 0.1,
        "min_via_size": 0.15
      }
    }
  };
}

/**
 * 演示数据验证功能
 */
function demonstrateValidation() {
  console.log("\n=== 数据验证演示 ===");
  
  const component = createExampleComponent();
  const vias = createExampleVias();
  const keepouts = createExampleKeepouts();
  const layers = createExampleLayers();
  const stackup = createDefault4LayerStackup();
  
  // 导入验证函数
  const {
    isValidComponentData,
    isValidHoleData,
    isValidKeepoutData,
    isValidLayerData,
    isValidLayerStackupData,
    validateGeometry
  } = require('../src/types/data-models');
  
  console.log("Component validation:", isValidComponentData(component));
  console.log("Via validation:", vias.every(via => isValidHoleData(via)));
  console.log("Keepout validation:", keepouts.every(keepout => isValidKeepoutData(keepout)));
  console.log("Layer validation:", layers.every(layer => isValidLayerData(layer)));
  console.log("Stackup validation:", isValidLayerStackupData(stackup));
  
  // 测试几何验证
  keepouts.forEach((keepout, index) => {
    console.log(`Keepout ${index + 1} geometry validation:`, validateGeometry(keepout.geometry));
  });
}

/**
 * 主函数
 */
function main() {
  console.log("=== IDX导出器数据模型使用示例 ===\n");
  
  // 创建完整的导出数据示例
  const exportData = createCompleteExportExample();
  
  console.log("\n导出数据创建完成:");
  console.log(`- 板名称: ${exportData.board.name}`);
  console.log(`- 组件数量: ${exportData.board.components?.length || 0}`);
  console.log(`- 过孔数量: ${exportData.board.holes?.length || 0}`);
  console.log(`- 禁止区数量: ${exportData.board.keepouts?.length || 0}`);
  console.log(`- 层数量: ${exportData.board.layers?.length || 0}`);
  console.log(`- 层叠结构: ${exportData.board.layerStackup?.name}`);
  
  // 演示数据验证
  demonstrateValidation();
  
  console.log("\n=== 示例完成 ===");
  
  return exportData;
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
  main();
}

export { main as runDataModelsExample };