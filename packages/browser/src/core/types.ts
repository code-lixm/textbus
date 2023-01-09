import { ComponentLiteral, Module, TextbusConfig } from '@textbus/core'

import { FormatLoader, ComponentLoader } from '../dom-support/parser'

export interface ViewModule extends Module {
  componentLoaders?: ComponentLoader[]
  formatLoaders?: FormatLoader[]
}

/**
 * Textbus PC 端配置接口
 */
export interface ViewOptions extends TextbusConfig {
  imports?: ViewModule[]
  /** 自动获取焦点 */
  autoFocus?: boolean
  /** 编辑区最小高度 */
  minHeight?: string
  /** 组件加载器 */
  componentLoaders?: ComponentLoader[]
  /** 格式加载器 */
  formatLoaders?: FormatLoader[]
  /** 默认内容 */
  content?: string | ComponentLiteral
  /** 文档默认样式表 */
  styleSheets?: string[]
  /** 配置文档编辑状态下用到的样式 */
  editingStyleSheets?: string[]
  /** 使用 contentEditable 作为编辑器控制可编辑范围 */
  useContentEditable?: boolean
}
