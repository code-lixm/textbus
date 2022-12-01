import { Injector } from '@tanbo/di'
import { Commander, QueryState, Query, FormatValue } from '@textbus/core'

import { SelectTool, SelectToolConfig } from '../toolkit/select-tool'
import { fontSizeFormatter } from '../../formatters/_api'
import { I18n } from '../../i18n'

export function fontSizeToolConfigFactory(
  injector: Injector
): SelectToolConfig {
  const i18n = injector.get(I18n)
  const query = injector.get(Query)
  const commander = injector.get(Commander)
  return {
    tooltip: i18n.get('plugins.toolbar.fontSizeTool.tooltip'),
    iconClasses: ['textbus-icon-font-size'],
    mini: true,
    options: [
      {
        label: i18n.get('plugins.toolbar.fontSizeTool.defaultSizeText'),
        classes: ['textbus-toolbar-font-size-inherit'],
        value: '',
        default: true,
      },
      {
        label: '小四',
        classes: ['textbus-toolbar-font-size-12'],
        value: '12px',
      },
      {
        label: '四号',
        classes: ['textbus-toolbar-font-size-14'],
        value: '14px',
      },
      {
        label: '小三',
        classes: ['textbus-toolbar-font-size-15'],
        value: '15px',
      },
      {
        label: '三号',
        classes: ['textbus-toolbar-font-size-16'],
        value: '16px',
      },
      {
        label: '小二',
        classes: ['textbus-toolbar-font-size-18'],
        value: '18px',
      },
      {
        label: '二号',
        classes: ['textbus-toolbar-font-size-22'],
        value: '22px',
      },
      {
        label: '小一',
        classes: ['textbus-toolbar-font-size-24'],
        value: '24px',
      },
      {
        label: '一号',
        classes: ['textbus-toolbar-font-size-26'],
        value: '26px',
      },
      {
        label: '小初',
        classes: ['textbus-toolbar-font-size-36'],
        value: '36px',
      },
      {
        label: '初号',
        classes: ['textbus-toolbar-font-size-42'],
        value: '42px',
      },
    ],
    queryState(): QueryState<FormatValue> {
      return query.queryFormat(fontSizeFormatter)
    },
    onChecked(value: string) {
      !value
        ? commander.unApplyFormat(fontSizeFormatter)
        : commander.applyFormat(fontSizeFormatter, value)
    },
  }
}

export function fontSizeTool() {
  return new SelectTool(fontSizeToolConfigFactory)
}
