import { FormatPriority, FormatType, InlineFormatter, VElement } from '@textbus/core'

import { Matcher } from './matcher'

export class LinkFormatLoader extends Matcher {
  constructor(formatter: LinkFormatter) {
    super(formatter, {
      tags: ['a']
    })
  }

  override read(element: HTMLElement) {
    return {
      formatter: this.formatter,
      value: this.extractFormatData(element, {
        attrs: ['target', 'href', 'data-href']
      }).attrs as Record<string, string>
    }
  }
}

export class LinkFormatter implements InlineFormatter {
  type: FormatType.Inline = FormatType.Inline
  priority = FormatPriority.Tag
  name = 'link'

  render(node: VElement | null, formatValue: Record<string, string>, isOutputMode: boolean): VElement | void {
    if (isOutputMode) {
      return new VElement('a', {
        target: formatValue.target,
        href: formatValue.href || formatValue['data-href']
      })
    }
    return new VElement('a', {
      target: formatValue.target,
      'data-href': formatValue.href || formatValue['data-href']
    })
  }
}

export const linkFormatter = new LinkFormatter()

export const linkFormatLoader = new LinkFormatLoader(linkFormatter)
