import { Injectable, Injector } from '@tanbo/di'
import { EDITOR_OPTIONS} from '@textbus/platform-browser'

import { EditorOptions } from './types'

@Injectable()
export class Message {
  private notification: any

  constructor(private injector: Injector) {
    const options = this.injector.get(EDITOR_OPTIONS) as EditorOptions
    this.notification = options.moduleAPI?.notification
  }

  message(message: string) {
    this.notification('', message)
  }

  info(message: string) {
    this.notification('info', message)
  }

  success(message: string) {
    this.notification('success', message)
  }

  warning(message: string) {
    this.notification('warning', message)
  }

  danger(message: string) {
    this.notification('error', message)
  }
}
