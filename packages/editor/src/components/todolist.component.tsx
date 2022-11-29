import {
  Commander,
  ComponentInitData,
  ComponentInstance,
  ContentType,
  defineComponent,
  onBreak,
  Selection,
  Slot,
  useContext,
  useSelf,
  useSlots,
  VElement
} from '@textbus/core'
import { ComponentLoader, EDITOR_OPTIONS, SlotParser } from '@textbus/browser'
import { Injector } from '@tanbo/di'
import { paragraphComponent } from './paragraph.component'
import { parse, stringify, userList } from './custom-parse'

import { EditorOptions } from '../types'
import { Editor } from '../editor'

export interface TodoListSlotState {
  active: boolean
  disabled: boolean
  endTime?: string
  userList?: userList
  addUserIsOpen: boolean
  searchText: string,
  positionId: string
}

export interface TodoModalOptions {
  time: string;
  userList: userList;
  setTodoState: (state: TodoListSlotState) => void;
}

const nanoid = () => Math.random().toString(36).substr(2)

export const todolistComponent = defineComponent({
  type: ContentType.BlockComponent,
  name: 'TodolistComponent',
  separable: true,
  zenCoding: {
    match: /^(-\s\[|\[)(x|\s)?\]$/,
    key: ' ',
    generateInitData(
      content: string
    ): ComponentInitData<void, TodoListSlotState> {
      const isChecked = content.charAt(3) === 'x'
      return {
        slots: [
          new Slot<TodoListSlotState>(
            [ContentType.Text, ContentType.InlineComponent],
            {
              active: isChecked,
              disabled: false,
              endTime: '',
              userList: [],
              addUserIsOpen: false,
              searchText: '',
              positionId: nanoid()
            }
          )
        ]
      }
    }
  },
  setup(initData: ComponentInitData<void, TodoListSlotState>) {
    const { Text, InlineComponent } = ContentType
    const slots = useSlots<TodoListSlotState>(
      initData.slots || [new Slot<TodoListSlotState>([Text, InlineComponent], {
        active: false,
        disabled: false,
        endTime: '',
        userList: [],
        addUserIsOpen: false,
        searchText: '',
        positionId: nanoid()
      })]
    )

    if (slots.length === 0) {
      slots.push(new Slot<TodoListSlotState>([Text, InlineComponent]))
    }
    const injector = useContext()

    const self = useSelf()
    const selection = injector.get(Selection)
    const commander = injector.get(Commander)    
    const editor = injector.get(Editor)
    const readonly = editor.readonly

    const options = injector.get(EDITOR_OPTIONS) as EditorOptions
    const { openSetTimeModal } = options.moduleAPI?.todo || {}
    const { shareUsers } = options.moduleAPI?.mention || {
      shareUsers: []
    }

    onBreak((ev) => {
      const slot = ev.target
      const index = ev.data.index
      ev.preventDefault()
      if (
        slot.isEmpty &&
        index === 0 &&
        slots.length > 1 &&
        slot === slots.last
      ) {
        const p = paragraphComponent.createInstance(injector)
        commander.insertAfter(p, self)
        slots.remove(slot)
        const firstSlot = p.slots.get(0)!
        selection.setPosition(firstSlot, 0)
      } else {
        const nextSlot = slot.cut(index)
        //重置状态
        nextSlot.state = {
          active: false,
          disabled: false,
          endTime: '',
          userList: [],
          addUserIsOpen: false,
          searchText: '',
          positionId: nanoid()
        }

        slots.insertAfter(nextSlot, slot)
        selection.setPosition(nextSlot, 0)
      }
    })

    return {
      render(_, slotRender): VElement {
        return (
          <div component-name="TodoComponent" class="tb-todolist">
            {slots.toArray().map((slot) => {
              const state = slot.state || {
                active: false,
                disabled: false,
                endTime: '',
                userList: [],
                addUserIsOpen: false,
                searchText: '',
                positionId: nanoid()
              }

              const classes = ['tb-todolist-item']

              if (state.active) {
                classes.push('tb-todolist-state-active')
              }
              if (state.disabled) {
                classes.push('tb-todolist-state-disabled')
              }
              const options: TodoModalOptions = {
                time: state.endTime || '',
                userList: state.userList || [],
                setTodoState: ({
                  endTime = state.endTime,
                  userList = state.userList
                }: TodoListSlotState) => {
                  slot.updateState((draft) => {
                    draft.endTime = endTime
                    draft.userList = userList
                  })
                }
              }

              const userList = stringify(state.userList || [])
              let timeClass = state.endTime
                ? 'background_normal'
                : 'background_normal background_no_time'
              if(readonly) timeClass+=' background_readonly'
              const addUserClass = readonly
              ? 'add_user add_user_readonly'
              : 'add_user'

              const searchedList = shareUsers.filter((item) =>
                item.username.includes(state.searchText)
              )
              const unSearchedList = shareUsers.filter(
                (item) => !item.username.includes(state.searchText)
              )
              const filterUserList = [...searchedList, ...unSearchedList].map(
                ({ username, authId }) => ({ username, authId })
              )

              return (
                <div
                  class={classes.join(' ')}
                  user-list={userList}
                  todo-time={state.endTime}
                >
                  <div class="tb-todolist-btn">
                    <div
                      class="tb-todolist-state"
                      onClick={() => {
                        slot.updateState((draft) => {
                          draft.active = !draft.active
                        })
                      }}
                    />
                  </div>
                  <div>
                    {slotRender(slot, () => {
                      return <span class="tb-todolist-content" />
                    })}
                    {state.userList?.length ? (
                      <span class="info_box">
                        <span>
                          {state.userList?.map(({ username, authId }) => (
                            <span class="mention">
                              @{username}
                              <span
                                class="cross"
                                onClick={() => {
                                  slot.updateState((draft) => {
                                    draft.userList = draft.userList?.filter(
                                      ({ authId: id }) => id !== authId
                                    )
                                  })
                                }}
                              ></span>
                            </span>
                          ))}
                        </span>
                        <span
                          class={addUserClass}
                          onClick={() => {
                            slot.updateState((draft) => {
                              draft.addUserIsOpen = true
                            })
                          }}
                        >
                          {state.addUserIsOpen ? (
                            <div
                              onClick={(e: MouseEvent) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                left: '-6px',
                                background: '#ffffff',
                                border: '1px solid #e8e8e8',
                                borderRadius: '4px',
                                padding: '8px',
                                top: '26px',
                                boxShadow: '0px 0px 5px rgba(0,0,0, 0.1)',
                                color: '#000'
                              }}
                            >
                              <input
                                type="text"
                                placeholder="搜索"
                                // ref={searchInput}
                                onInput={(e: any) => {
                                  slot.updateState((draft) => {
                                    draft.searchText = e.target.value
                                  })
                                }}
                                // onKeydown={onKeydown}
                                style={{
                                  paddingBottom: '4px',
                                  marginBottom: '4px',
                                  border: 'none',
                                  outline: 'none',
                                  borderBottom: '1px solid #e8e8e8'
                                }}
                              />
                              <div>
                                {filterUserList.map((option) => {
                                  return (
                                    <div
                                      key={option.authId}
                                      style={{
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer',
                                        minWidth: '100px',
                                        padding: '4px'
                                      }}
                                      onClick={() => {
                                        slot.updateState((draft) => {
                                          const userIsExists =
                                            draft.userList?.find(
                                              ({ authId }) => authId === option.authId
                                            )
                                          draft.addUserIsOpen = false
                                          !userIsExists &&
                                            draft.userList?.push(option)
                                        })
                                      }}
                                    >
                                      {option.username}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            ''
                          )}
                        </span>
                        <span
                          class={timeClass}
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation()
                            if (openSetTimeModal) {
                              openSetTimeModal(e, options)
                            }
                          }}
                        >
                          {state.endTime + ' '}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    }
  }
})

export const todolistComponentLoader: ComponentLoader = {
  resources: {
    styles: [
      `
.tb-todolist {
  display: block;
  margin-bottom: 1em;
}
.tb-todolist:not(:first-child) {
  margin-top: 1em;
}
.tb-todolist-item {
  padding-top: 0.2em;
  padding-bottom: 0.2em;
  display: flex;
}
.tb-todolist-btn {
  display: flex;
  align-items: center;
  margin-right: 0.6em;
}
.tb-todolist-state {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #000000;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  box-sizing: content-box;
}
.tb-todolist-state:after {
  content: "";
  position: absolute;
  border-right: 2px solid #ffffff;
  border-bottom: 2px solid #ffffff;
  box-sizing: content-box;
  left: 3px;
  top: 1px;
  width: 4px;
  height: 6px;
  transform: rotateZ(45deg);
}
.tb-todolist-state-active .tb-todolist-state {
  background: #000000;
}
.tb-todolist-state-active .tb-todolist-content {
  text-decoration: line-through;
  color: #999999;
}
.tb-todolist-state-disabled {
  opacity: 0.5;
}
.tb-todolist-content {
  flex: 1;
}

.info_box {
  margin-left: 6px;
  border-left: 1px solid rgba(31, 35, 41, 0.15);
  padding-left: 6px;
}
.mention {
  border-radius: 10px;
  line-height: 22px;
  background-color: rgba(130, 167, 252, 0.18);
  color: #1f2329;
  padding: 0 8px;
  margin-right: 6px;
  display: inline-block;
  position: relative;
  cursor: pointer;
}
.cross {
  width: 22px;
  height: 22px;
  display: none;
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 50%;
  background-color: #bacefd;
}
.cross::before,
.cross::after {
  content: '';
  position: absolute;
  width: 1px;
  background-color: #646a73;
  height: 11px;
  left: 11px;
  top: 5px;
}
.cross::before {
  transform: rotate(45deg);
}
.cross::after {
  transform: rotate(-45deg);
}
.mention:hover {
  background-color: #bacefd;
}
.mention:hover .cross {
  display: inline-block;
}
.add_user_readonly {
  display: none;
}
.add_user {
  position: relative;
  border-radius: 4px;
  height: 20px;
  padding-left: 21px;
  margin-right: 8px;
  transition: 0.2s all;
  cursor: pointer;
}
.add_user::after {
  content: '';
  position: absolute;
  width: 1px;
  background-color: rgba(31, 35, 41, 0.15);
  height: 12px;
  right: -9px;
  top: 5px;
}
.add_user:hover {
  background-color: rgba(214, 220, 232, 1);
}
.background_readonly: hover{
  background-color: white;
  cursor: default;
}
.background_normal {
  display: inline-block;
  transform: translateY(-1px);
  color: #999999;
  line-height: 22px;
  cursor: pointer;
  height: 22px;
  padding-left: 26px;
  padding-right: 6px;
  background-size: 16px 16px;
  background-position: 5px center;
  background-repeat: no-repeat;
  font-family: PingFangSC-Regular;
  font-size: 14px;
  font-weight: 400;
  border-radius: 4px;
  color: #646a73;
  transition: 0.2s all;
  margin-left: 9px;
}
.background_normal:hover {
  background-color: rgba(214, 220, 232, 1);
}
.background_no_time {
  padding-left: 16px;
}
`
    ]
  },
  match(element: HTMLElement): boolean {
    return (
      element.tagName === 'DIV' &&
      element.getAttribute('component-name') === 'TodoComponent'
    )
  },
  read(
    element: HTMLElement,
    context: Injector,
    slotParser: SlotParser
  ): ComponentInstance {
    const listConfig = Array.from(element.children).map((child) => {
      const stateElement = child.querySelector('.tb-todolist-state')
      const userList = child.getAttribute('user-list') || ''
      const endTime = child.getAttribute('todo-time') || ''

      return {
        childSlot: child.querySelector('.tb-todolist-content') as HTMLElement,
        slot: new Slot<TodoListSlotState>(
          [ContentType.Text, ContentType.InlineComponent],
          {
            active: !!stateElement?.classList.contains(
              'tb-todolist-state-active'
            ),
            disabled: !!stateElement?.classList.contains(
              'tb-todolist-state-disabled'
            ),
            endTime,
            userList: parse(userList),
            addUserIsOpen: false,
            searchText: '',
            positionId: nanoid()
          }
        )
      }
    })

    return todolistComponent.createInstance(context, {
      slots: listConfig.map((i) => {
        return slotParser(i.slot, i.childSlot)
      })
    })
  }
}
