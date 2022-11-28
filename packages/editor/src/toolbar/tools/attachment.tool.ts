import { Injector } from '@tanbo/di'
import { Commander, QueryState, QueryStateType } from '@textbus/core'

import { ButtonTool, ButtonToolConfig } from '../toolkit/_api'
import { I18n } from '../../i18n'
import { attachmentComponent } from '../../components/attachment.component'
import { FileUploader } from '../../file-uploader'

export function attachmentToolConfigFactory(injector: Injector): ButtonToolConfig {
  const i18n = injector.get(I18n)
  const commander = injector.get(Commander)
  const fileUploader = injector.get(FileUploader)
  return {
    iconClasses: ['textbus-icon-attachment'],
    tooltip: i18n.get('plugins.toolbar.attachmentTool.tooltip'),
    queryState(): QueryState<any> {
      return {
        state: QueryStateType.Normal,
        value: null
      }
    },
    onClick() {
      fileUploader.upload({
        multiple: true,
        uploadType: 'attachment',
        currentValue: '',
      }).subscribe(value => {
        if(!Array.isArray(value)) {
          value = [value]
        }
        if(!value.length) return
        value.forEach(file => {
          if(typeof file !== 'object') return
          commander.insert(attachmentComponent.createInstance(injector, {
            state: {
              url: file.url,
              name: file.name
            }
          }))
        })
      })
    },
  }
}

export function attachmentTool() {
  return new ButtonTool(attachmentToolConfigFactory)
}
