import { BoardData } from "../builders/board-builder";
import { ComponentData } from "../builders/component-builder";

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