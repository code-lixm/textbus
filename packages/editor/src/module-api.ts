import { TodoModalOptions } from './public-api'

export interface CurrentUserInfo {
  name: string;
}

export interface UserInfo {
  username: string;
  authId: string;
}

export interface TodoListSlotState {
  active: boolean;
  disabled: boolean;
  endTime: string;
  userList: UserInfo[];
  addUserIsOpen: boolean;
  searchText: string;
  positionId: string;
}

// export interface TodoModalOptions {
//   time: string;
//   userList: UserInfo[];
//   setTodoState: (state: TodoListSlotState) => void;
// }

export interface ModuleAPI {
  // 获取当前用户信息
  getCurrentUserInfo(): CurrentUserInfo | null;
  // 获取当前用户列表
  getShareUsers(): UserInfo[] | [];
  // 打开当前的时间选择弹窗
  openSetTimeModal(event: MouseEvent, options: TodoModalOptions): void;
  // 保存待办信息
  updateTodoList: (id: string, status: boolean) => void;
  // 发送消息
  notification:(type: '' | 'info' | 'success' | 'warning' | 'error' | undefined, message: string) => void
}

export const DEFAULT_MODULE_API: ModuleAPI = {
  getCurrentUserInfo: () => null,
  getShareUsers: () => [],
  openSetTimeModal: () => ({}),
  updateTodoList: () => ({}),
  notification: () => ({})
}
