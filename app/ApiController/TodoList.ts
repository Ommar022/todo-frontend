export interface Todo {
  id: number;
  taskName: string;
  taskDescription: string;
  statusId: number;
  statusName: string;
  userId: number;
  assignments: TodoAssignment[];
  todoAssignments?: TodoAssignment[];
  todoListId: number;
  createdAt: string;
  todoListAssignments: TodoListAssignment[];
  comments: Comment[];
}

export interface ExtendedTodoCardProps {
  id: number;
  taskName: string;
  taskDescription: string;
  statusId: number;
  statusName: string;
  userId: number;
  assignments: TodoAssignment[];
  todoListId: number;
  createdAt: string;
  loggedInUserId: number;
  updateStatus: (todoId: number, statusId: number, statusName: string) => void;
  webSocket?: WebSocket | null | undefined;
  comments?: Comment[];
}

export interface TodoCardProps {
  id: number;
  taskName: string;
  taskDescription: string;
  statusName: string;
  assignments?: TodoAssignment[];
  updateStatus?: (todoId: number, statusId: number, statusName: string) => void;
  onAssign?: (todoId: number, assignments: TodoAssignment[]) => void;
  onEdit?: () => void;
  webSocket?: WebSocket | null | undefined;
}

export interface UserAssignment {
  userId: number;
  userName: string;
  avatarUrl?: string;
  canEdit: boolean;
  assignedAt?: string;
}

export interface TodoStatus {
  id: number;
  statusName: string;
}

export interface ExtendedTodoListComponentProps extends TodoListComponentProps {
  loggedInUserId: number | null;
}

export interface TodoList {
  id: number;
  listName: string;
  userId: number;
  createdAt: string;
  todos: Todo[];
  assignments: TodoListAssignment[];
}

export interface TodoListAssignment {
  userId: number;
  canEdit: boolean;
  assignedAt: string;
}

export interface User {
  id: number;
  userName: string;
  email: string;
  avatarBase64?: string;
  role?: string;
  isActive: boolean;
}

export interface TodoAssignmentRequest {
  userId: number;
  canEdit: boolean;
}

export interface TodoAssignment {
  userId: number;
  userName?: string; 
  avatarUrl?: string; 
  canEdit: boolean;
  assignedAt: string;
}

export interface EditTodoCardModalProps {
  opened: boolean;
  onClose: () => void;
  id: number;
  taskName: string;
  taskDescription: string;
  statusName: string;
  assignments: TodoAssignment[];
  userId: number;
  loggedInUserId: number;
  todoListId: number;
  updateStatus: (todoId: number, statusId: number, statusName: string) => void; 
}

export interface AddTodoListModalProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (newList: TodoList) => void;
}

export interface TodoListProps {
  onSelect: (id: number) => void;
}

export interface AddTodoModalProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (newTodo: Todo) => void;
  todoListId: number;
}

export interface Comment {
  id: number;
  text: string;
  todoId: number;
  userId: number;
  userName: string;
  avatarUrl: string;
  createdAt: string;
}

export interface CommentModalProps {
  opened: boolean;
  onClose: () => void;
  todoId: number;
  loggedInUserId: number;
}

export interface ExtendedCommentModalProps extends CommentModalProps {
  webSocket?: WebSocket | null | undefined;
  comments?: Comment[];
}

export interface NotificationModalProps {
  loggedInUserId: number;
  notifications: NotificationData[];
  updateTodoInLists: (todoId: number, updates: Partial<Todo>) => void;
}

export interface NavBarProps {
  userId?: number | null;
  onLogout?: () => void;
}

export interface UsersModalProps {
  opened: boolean;
  onClose: () => void;
}

export interface UserWithAvatar extends User {
  avatarUrl?: string | null;
}

export interface TodoListComponentProps extends TodoListProps {
  todoLists: TodoList[];
  onAddTodoList: (newList: TodoList) => void;
  onUpdateTodoList: (id: number, listName: string, assignments: TodoListAssignment[]) => void;
  onDeleteTodoList: (id: number) => void;
}



export interface EditTodoListModalProps {
  opened: boolean;
  onClose: () => void;
  onUpdate: (id: number, listName: string, assignments: TodoListAssignment[]) => void;
  listId: number;
  initialListName: string;
  initialAssignments: TodoListAssignment[];
}
export interface AddTodoListModalProps {
  opened: boolean;
  onClose: () => void;
  onAdd: (newList: TodoList) => void;
}
export interface SomeOtherInterface {
  onUpdateTodoList: (id: number, listName: string, assignments: TodoAssignmentRequest[]) => void;
}

export interface Todo {
  id: number;
  taskName: string;
  taskDescription: string;
  statusId: number;
  statusName: string;
  userId: number;
  assignments: TodoAssignment[];
  todoListId: number;
  createdAt: string;
  todoListAssignments: TodoListAssignment[];
  comments: Comment[];
}

export interface TodoList {
  id: number;
  listName: string;
  userId: number;
  createdAt: string;
  todos: Todo[];
  assignments: TodoListAssignment[];
}

export interface TodoListAssignment {
  userId: number;
  canEdit: boolean;
  assignedAt: string;
}

export interface TodoAssignment {
  userId: number;
  userName?: string;
  canEdit: boolean;
  assignedAt: string;
  avatarUrl?: string;
}

export interface User {
  id: number;
  userName: string;
  email: string;
  avatarBase64?: string;
  role?: string;
  isActive: boolean;
}

export interface UserWithAvatar extends User {
  avatarUrl?: string | null;
}

export interface TodoStatus {
  id: number;
  statusName: string;
}

export interface Comment {
  id: number;
  text: string;
  todoId: number;
  userId: number;
  userName: string;
  avatarUrl: string;
  createdAt: string;
}

export interface Assignment {
  userId: number;
  userName?: string;
  avatarUrl?: string; 
  canEdit: boolean;
  assignedAt: string;
}

export interface TodoListAssignment {
  userId: number;
  canEdit: boolean;
  assignedAt: string;
}

export interface Comment {
  id: number;
  text: string;
  todoId: number;
  userId: number;
  userName: string;
  createdAt: string;
}

export interface Todo {
  id: number;
  taskName: string;
  taskDescription: string;
  statusId: number;
  statusName: string;
  userId: number;
  assignments: Assignment[];
  todoListId: number;
  createdAt: string;
  todoListAssignments: TodoListAssignment[];
  comments: Comment[];
}

export interface TodoList {
  id: number;
  listName: string; 
  userId: number;
  createdAt: string;
  todos: Todo[];
  assignments: TodoListAssignment[];
}

export interface WebSocketTodoData {
  Id?: number;
  TodoId?: number;
  TaskName?: string;
  TaskDescription?: string;
  StatusId?: number;
  StatusName?: string; 
  statusName?: string; 
  UserId?: number;
  TodoListId?: number;
  CreatedAt?: string;
  TodoAssignments?: {
    UserId: number;
    UserName?: string;
    AvatarUrl?: string;
    CanEdit: boolean;
    AssignedAt: string;
  }[];
  TodoListAssignments?: {
    UserId: number;
    CanEdit: boolean;
    AssignedAt: string;
  }[];
  Comments?: Comment[];
}

export interface NotificationData {
  TodoId: number;
  TaskName: string;
  TaskDescription: string;
  StatusId: number;
  StatusName: string;
  TodoListId: number;
  CreatedAt: string;
  Creator: {
    UserId: number;
    UserName: string;
    AvatarUrl: string;
  };
  Assignment: {
    UserId: number;
    CanEdit: boolean;
    AssignedAt: string;
    userName?: string;
  };
}