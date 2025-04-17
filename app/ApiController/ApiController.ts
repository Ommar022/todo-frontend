import axios from 'axios';
import Cookies from 'js-cookie';
import { TodoList , Todo, User , TodoStatus , Comment, TodoListAssignment, UserWithAvatar, TodoAssignment} from './TodoList';

// const API_BASE_URL = 'http://localhost:5122/api';
// const WS_URL = 'ws://localhost:5122/ws'; 

// const API_BASE_URL = 'http://localhost:8080/api';
// const WS_URL = 'ws://localhost:8080/ws'; 

const API_BASE_URL = 'https://todo-backend-production-f99f.up.railway.app/api';
const WS_URL = 'https://todo-backend-production-f99f.up.railway.app/ws'; 

const getAuthHeaders = () => {
  const token = Cookies.get('token');
  if (!token) throw new Error('User is not authenticated');
  return { 
    Authorization: `Bearer ${token}`, 
    'Content-Type': 'application/json' 
  };
};

export const connectWebSocket = (onMessage: (message: string) => void): WebSocket => {
  const token = Cookies.get('token');
  if (!token) {
    console.error('No token found, WebSocket connection aborted');
    throw new Error('User is not authenticated');
  }
  const socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  socket.onmessage = (event) => {
    console.log('WebSocket message:', event.data);
    onMessage(event.data);
  };
  socket.onerror = (error) => console.error('WebSocket error:', error);
  socket.onclose = (event) => console.log('WebSocket closed:', event.code, event.reason);
  socket.onopen = () => console.log('WebSocket connection established');

  return socket;
};

export const handleAuth = async (
  action: 'Sign Up' | 'Login',
  formData: any,
  imageFile?: File | null
) => {
  const endpoint = action === 'Sign Up' ? 'signup' : 'login';
  let data: any;

  if (action === 'Sign Up') {
    let imageBase64 = null;
    if (imageFile) {
      try {
        imageBase64 = await fileToBase64(imageFile);
        console.log('Base64 Image:', imageBase64.substring(0, 50));
      } catch (error) {
        console.error('Error converting image to Base64:', error);
        throw new Error('Failed to process image');
      }
    }

    data = {
      userName: formData.userName,
      email: formData.email,
      password: formData.password,
      imageBase64: imageBase64,
    };
    console.log('Signup Payload:', data);
  } else {
    data = {
      email: formData.email,
      password: formData.password,
    };
  }

  try {
    const response = await axios.post(`${API_BASE_URL}/User/${endpoint}`, data);

    if (action === 'Sign Up' && response.data.success) {
      Cookies.set('userId', response.data.userId);
      Cookies.set('userName', formData.userName);
      return '/';
    } else if (action === 'Login' && response.data.token) {
      Cookies.set('token', response.data.token);
      Cookies.set('userId', response.data.user.id);
      Cookies.set('userName', response.data.user.userName);
      Cookies.set('userRole', response.data.user.role || 'User');
      if (response.data.user.avatar?.base64Image) {
        Cookies.set('avatar', response.data.user.avatar.base64Image);
      }
      return '/Todo';
    }

    throw new Error('Unexpected response from server');
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      const errorMessage = error.response.data?.message || 'Authentication failed';
      console.error(`Authentication error: ${errorMessage}`);
      throw new Error(errorMessage); 
    }
    console.error('Unexpected error during authentication:', error);
    throw new Error('Authentication failed');
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const fetchUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${API_BASE_URL}/User/users`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const fetchTodoStatuses = async (): Promise<TodoStatus[]> => {
  const response = await axios.get(`${API_BASE_URL}/TodoStatus`, {
    headers: getAuthHeaders()
  });
  return response.data;
};

export const updateTodoStatus = async (todoId: number, statusId: number): Promise<void> => {
  try {
    const url = `${API_BASE_URL}/TodoStatus/${todoId}/status`;
    const payload = { statusId, source: 'web' };
    const headers = getAuthHeaders();
    console.log('API Status Update Request:', { url, payload, headers });
    const response = await axios.put(url, payload, { headers });
    console.log('API Status Update Response:', response.status);
  } catch (error: any) {
    console.error('Status Update API Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update status');
  }
};

export async function fetchComments(todoId: number): Promise<Comment[]> {
  const response = await axios.get(`${API_BASE_URL}/comment/todo/${todoId}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function fetchAvatars(userId: number): Promise<string | null> {
  // return;
  try {
    if (!userId || isNaN(userId)) {
      console.error('Invalid user ID provided:', userId);
      return null;
    }

    const url = `${API_BASE_URL}/User/avatar/${userId}`;
    console.log('Fetching avatar from:', url);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    console.log(`Successfully fetched avatar for user ID ${userId}`);

    const blob = new Blob([response.data], { type: 'image/jpeg' });
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
}

export async function createComment(todoId: number, text: string): Promise<Comment> {
  const response = await axios.post(`${API_BASE_URL}/comment`, { todoId, text }, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateComment(commentId: number, text: string): Promise<Comment> {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/comment/${commentId}`,
      { text },
      { headers: getAuthHeaders() }
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to update comment');
  }
}

export async function deleteComment(commentId: number): Promise<void> {
  try {
    await axios.delete(`${API_BASE_URL}/comment/${commentId}`, {
      headers: getAuthHeaders(),
    });
  } catch (error) {
    throw new Error('Failed to delete comment');
  }
}

export const toggleUserActive = async (userId: string, isActive: boolean): Promise<void> => {
  try {
    const url = `${API_BASE_URL}/User/toggle-active/${userId}`;
    const headers = getAuthHeaders();
    const response = await axios.put(url, !isActive, { headers }); 
    console.log(`User ${userId} active status toggled to ${!isActive}`);
  } catch (error: any) {
    console.error(`Error toggling active status for user ${userId}:`, error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error('Unauthorized: Please log in again.');
    }
    throw new Error(error.response?.data?.message || 'Failed to toggle user active status');
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const url = `${API_BASE_URL}/User/delete/${userId}`;
    const headers = getAuthHeaders();
    await axios.delete(url, { headers });
    console.log(`User ${userId} deleted successfully`);
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error.response?.data || error.message);
    if (error.response?.status === 401) {
      throw new Error('Unauthorized: Please log in again.');
    }
    throw new Error(error.response?.data?.message || 'Failed to delete user');
  }
};

export const fetchTodoLists = async (): Promise<TodoList[]> => {
  const response = await axios.get(`${API_BASE_URL}/TodoList`, {
    headers: getAuthHeaders(),
  });
  return response.data.map((list: any) => ({
    id: list.id,
    listName: list.listName,
    userId: list.userId,
    createdAt: list.createdAt,
    todos: (list.todos || []).map((todo: any) => ({
      id: todo.id,
      taskName: todo.taskName,
      taskDescription: todo.taskDescription,
      statusId: todo.statusId,
      statusName: todo.statusName,
      todoListId: todo.todoListId,
      userId: todo.userId,
      createdAt: todo.createdAt,
      assignments: (todo.todoAssignments || []).map((a: any) => ({
        userId: a.userId,
        userName: a.userName || '',
        canEdit: a.canEdit,
        assignedAt: a.assignedAt,
        avatarUrl: a.avatarUrl || '',
      })),
      comments: todo.comments || [],
      todoListAssignments: (todo.todoListAssignments || []).map((a: any) => ({
        userId: a.userId,
        canEdit: a.canEdit,
        assignedAt: a.assignedAt,
      })),
    })),
    assignments: (list.assignments || []).map((a: any) => ({
      userId: a.userId,
      canEdit: a.canEdit,
      assignedAt: a.assignedAt,
    })),
  }));
};

export const assignTodoToUsers = async (todoId: number, assignments: TodoAssignment[]) => {
  const response = await fetch(`/api/todos/${todoId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assignments }),
  });
  if (!response.ok) throw new Error('Failed to assign users to todo');
  return response.json();
};

export const fetchTodosByTodoListId = async (todoListId: number): Promise<Todo[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/Todo/todos/by-todolist/${todoListId}`, {
      headers: getAuthHeaders(),
    });
    if (!Array.isArray(response.data)) return [];
    return response.data.map((todo: any) => ({
      id: todo.id ?? 0,
      taskName: todo.taskName ?? '',
      taskDescription: todo.taskDescription ?? '',
      statusId: todo.statusId ?? 0,
      statusName: todo.statusName ?? '',
      userId: todo.userId ?? 0,
      assignments: (todo.todoAssignments || []).map((a: any) => ({
        userId: a.userId ?? 0,
        userName: a.userName ?? '',
        canEdit: a.canEdit ?? false,
        assignedAt: a.assignedAt ?? '',
        avatarUrl: a.avatarUrl || '',
      })),
      todoListId: todo.todoListId ?? 0,
      createdAt: todo.createdAt ?? '',
      todoListAssignments: (todo.todoListAssignments || []).map((a: any) => ({
        userId: a.userId ?? 0,
        canEdit: a.canEdit ?? false,
        assignedAt: a.assignedAt ?? '',
      })),
      comments: todo.comments || [],
    }));
  } catch (error) {
    console.error('Error fetching todos:', error);
    throw error;
  }
};

export const createTodoList = async (
  listName: string,
  assignments: TodoListAssignment[] = []
): Promise<TodoList> => {
  const response = await axios.post(
    `${API_BASE_URL}/TodoList`,
    { listName, assignments },
    { headers: getAuthHeaders() }
  );
  return {
    id: response.data.id,
    listName: response.data.listName, 
    userId: response.data.userId,
    createdAt: response.data.createdAt,
    todos: [],
    assignments: response.data.assignments.map((a: any) => ({
      userId: a.userId,
      canEdit: a.canEdit,
      assignedAt: a.assignedAt,
    })),
  };
};
export const updateTodoList = async (
  id: number,
  listName: string,
  assignments: TodoListAssignment[]
): Promise<TodoList> => {
  const response = await axios.put(
    `${API_BASE_URL}/TodoList/${id}`,
    { listName, assignments },
    { headers: getAuthHeaders() }
  );
  return {
    id: response.data.id,
    listName: response.data.listName,
    userId: response.data.userId,
    createdAt: response.data.createdAt,
    todos: (response.data.todos || []).map((todo: any) => ({
      id: todo.id,
      taskName: todo.taskName,
      taskDescription: todo.taskDescription,
      statusId: todo.statusId,
      statusName: todo.statusName,
      todoListId: todo.todoListId,
      userId: todo.userId,
      createdAt: todo.createdAt,
      assignments: (todo.todoAssignments || []).map((a: any) => ({
        userId: a.userId,
        userName: a.userName || '',
        canEdit: a.canEdit,
        assignedAt: a.assignedAt,
        avatarUrl: a.avatarUrl || '',
      })),
      comments: todo.comments || [],
      todoListAssignments: (todo.todoListAssignments || []).map((a: any) => ({
        userId: a.userId,
        canEdit: a.canEdit,
        assignedAt: a.assignedAt,
      })),
    })),
    assignments: (response.data.assignments || []).map((a: any) => ({
      userId: a.userId,
      canEdit: a.canEdit,
      assignedAt: a.assignedAt,
    })),
  };
};

export const deleteTodoList = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/TodoList/${id}`, { headers: getAuthHeaders() });
};

export const createTodo = async (
  taskName: string,
  taskDescription: string,
  statusId: number,
  assignments: { userId: number; canEdit: boolean }[],
  todoListId: number
): Promise<Todo> => {
  const assignedUserIds = assignments.map(assignment => assignment.userId); 

  const response = await axios.post(
    `${API_BASE_URL}/Todo`,
    {
      taskName,
      taskDescription,
      statusId,
      todoListId,
      assignedUserIds,
    },
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const updateTodo = async (
  id: number,
  taskName: string,
  taskDescription: string,
  statusId: number,
  assignments: { userId: number; canEdit: boolean }[], 
  todoListId: number,
  userId: number
): Promise<Todo> => {
  const assignedUserIds = assignments.map(assignment => assignment.userId); 

  const response = await axios.put(
    `${API_BASE_URL}/Todo/${id}`,
    { taskName, taskDescription, statusId, todoListId, userId, assignedUserIds }, 
    { headers: getAuthHeaders() }
  );
  return response.data;
};

export const deleteTodo = async (id: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/Todo/${id}`, { headers: getAuthHeaders() });
};

export const fetchAssignableUsersForTodoList = async (
  todoListId: number
): Promise<UserWithAvatar[]> => {
  const response = await axios.get(`${API_BASE_URL}/Todo/${todoListId}/assignable-users`, {
    headers: getAuthHeaders(),
  });
  return response.data.map((user: any) => ({
    id: user.id,
    userName: user.userName,
    email: user.email,
    avatarUrl: user.avatarUrl || (user.avatarBase64 ? `data:image/jpeg;base64,${user.avatarBase64}` : undefined),
    role: user.role,
    isActive: user.isActive,
  }));
};

