'use client';

import { useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import {
  Button,
  Center,
  Container,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  connectWebSocket,
  fetchTodoLists,
  fetchTodosByTodoListId,
  updateTodoList,
  deleteTodoList,
} from '../ApiController/ApiController';
import {
  Comment,
  NotificationData,
  Todo,
  TodoList,
  TodoListAssignment,
  WebSocketTodoData,
} from '../ApiController/TodoList';
import AddTodoModal from './AddTodoModal';
import NotificationModal from './NotificationModal';
import TodoCard from './TodoCard';
import TodoListComponent from './TodoList';
import NavBar from './NavBar';
import { useRouter } from 'next/navigation';

export default function TodoPage() {
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('User');
  const [error, setError] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const hasFetchedInitialTodos = useRef(false);
  const processedMessages = useRef<Set<string>>(new Set());
  const router = useRouter();

  const loadTodoListsAndTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTodoLists();
      setTodoLists(data);
      if (data.length > 0 && !hasFetchedInitialTodos.current) {
        setSelectedListId(data[0].id);
        const initialTodos = await fetchTodosByTodoListId(data[0].id);
        setTodos(initialTodos.length ? initialTodos : []);
        hasFetchedInitialTodos.current = true;
      } else if (data.length === 0) {
        setTodos([]);
      }
    } catch (err) {
      setError('Failed to fetch todo lists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = Cookies.get('userId');
    const role = Cookies.get('userRole');
    if (userId) {
      setLoggedInUserId(parseInt(userId, 10));
      setUserRole(role || 'User');
    } else {
      setLoggedInUserId(null);
      router.push('/');
    }
    loadTodoListsAndTodos();
  }, [router]);

  const handleListSelect = async (id: number) => {
    if (id === selectedListId) return;
    setSelectedListId(id);
    try {
      const fetchedTodos = await fetchTodosByTodoListId(id);
      setTodos(fetchedTodos || []);
    } catch (err) {
      setError('Failed to fetch todos for selected list.');
    }
  };

  const handleStatusUpdate = (todoId: number, statusId: number, statusName: string) => {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === todoId ? { ...todo, statusId, statusName } : todo
      )
    );
  };

  const handleAddTodo = (newTodo: Todo) => {
    setTodos((prev) => [newTodo, ...prev.filter((todo) => todo.id !== newTodo.id)]);
  };

  const handleAddTodoList = async (newList: TodoList) => {
    setTodoLists((prevLists) => [...prevLists, newList]);
    setSelectedListId(newList.id);
    const todos = await fetchTodosByTodoListId(newList.id);
    setTodos(todos || []);
  };

  const handleUpdateTodoList = async (
    id: number,
    listName: string,
    assignments: TodoListAssignment[]
  ) => {
    try {
      const updatedList = await updateTodoList(id, listName, assignments);
      setTodoLists((prev) =>
        prev.map((list) => (list.id === id ? updatedList : list))
      );
    } catch (err) {
      setError('Failed to update todo list.');
    }
  };

  const handleDeleteTodoList = async (id: number) => {
    try {
      await deleteTodoList(id);
      setTodoLists((prev) => prev.filter((list) => list.id !== id));
      if (selectedListId === id) {
        const remainingLists = todoLists.filter((list) => list.id !== id);
        setSelectedListId(remainingLists.length > 0 ? remainingLists[0].id : null);
        setTodos([]);
      }
    } catch (err) {
      setError('Failed to delete todo list.');
    }
  };

  const transformWebSocketData = (data: WebSocketTodoData): Todo => {
    return {
      id: data.Id || 0,
      taskName: data.TaskName || '',
      taskDescription: data.TaskDescription || '',
      statusId: data.StatusId || 1,
      statusName: data.StatusName || 'Pending',
      userId: data.UserId || 0,
      assignments:
        data.TodoAssignments?.map((a) => ({
          userId: a.UserId,
          userName: a.UserName || '',
          avatarUrl: a.AvatarUrl || '',
          canEdit: a.CanEdit,
          assignedAt: a.AssignedAt,
        })) || [],
      todoListId: data.TodoListId || 0,
      createdAt: data.CreatedAt || new Date().toISOString(),
      todoListAssignments:
        data.TodoListAssignments?.map((a) => ({
          userId: a.UserId,
          canEdit: a.CanEdit,
          assignedAt: a.AssignedAt,
        })) || [],
      comments: data.Comments || [],
    };
  };

  const updateCommentInTodos = (comment: Comment) => {
    setTodos((prev) => {
      const todoExists = prev.some((todo) => todo.id === comment.todoId);
      if (!todoExists) return prev;
      return prev.map((todo) =>
        todo.id === comment.todoId
          ? {
              ...todo,
              comments: todo.comments?.some((c) => c.id === comment.id)
                ? todo.comments.map((c) => (c.id === comment.id ? comment : c))
                : [...(todo.comments || []), comment],
            }
          : todo
      );
    });
  };

  const deleteCommentInTodos = (commentId: number) => {
    setTodos((prev) =>
      prev.map((todo) => ({
        ...todo,
        comments: todo.comments?.filter((c) => c.id !== commentId) || [],
      }))
    );
  };

  useEffect(() => {
    if (!loggedInUserId) return;

    const connectWs = () => {
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        setError('Max WebSocket reconnection attempts reached. Please refresh the page.');
        return;
      }

      try {
        wsRef.current = connectWebSocket((message) => {
          try {
            const parsed = JSON.parse(message);
            // Check if the message has an 'action' field to distinguish broadcast updates
            if (parsed.action) {
              const messageId = `${parsed.action}-${parsed.data?.Id || Date.now()}`;
              if (processedMessages.current.has(messageId)) {
                console.log('Duplicate broadcast message ignored:', messageId);
                return;
              }
              processedMessages.current.add(messageId);

              const { action, data } = parsed;
              switch (action) {
                case 'todo_created': {
                  const newTodo = transformWebSocketData(data);
                  if (newTodo.todoListId === selectedListId) {
                    setTodos((prev) => [
                      newTodo,
                      ...prev.filter((todo) => todo.id !== newTodo.id),
                    ]);
                  }
                  break;
                }
                case 'todo_updated': {
                  const updatedTodo = transformWebSocketData(data);
                  if (updatedTodo.todoListId === selectedListId) {
                    setTodos((prev) =>
                      prev.map((todo) =>
                        todo.id === updatedTodo.id ? { ...todo, ...updatedTodo } : todo
                      )
                    );
                  }
                  break;
                }
                case 'status_updated': {
                  const statusTodo = transformWebSocketData(data);
                  if (statusTodo.todoListId === selectedListId) {
                    setTodos((prev) =>
                      prev.map((todo) =>
                        todo.id === statusTodo.id
                          ? {
                              ...todo,
                              statusId: statusTodo.statusId,
                              statusName: statusTodo.statusName,
                            }
                          : todo
                      )
                    );
                  }
                  break;
                }
                case 'todo_deleted': {
                  const deletedId = data.id;
                  setTodos((prev) => prev.filter((todo) => todo.id !== deletedId));
                  break;
                }
                case 'create':
                case 'update': {
                  if (parsed.comment) {
                    const normalizedComment: Comment = {
                      id: parsed.comment.Id,
                      text: parsed.comment.Text,
                      todoId: parsed.comment.TodoId,
                      userId: parsed.comment.UserId,
                      userName: parsed.comment.UserName || 'Unknown',
                      avatarUrl: parsed.comment.AvatarUrl || '',
                      createdAt: parsed.comment.CreatedAt || new Date().toISOString(),
                    };
                    updateCommentInTodos(normalizedComment);
                  }
                  break;
                }
                case 'delete': {
                  if (parsed.commentId) {
                    deleteCommentInTodos(parsed.commentId);
                  }
                  break;
                }
                default:
                  console.warn('Unhandled WebSocket action:', action);
              }
            } else {
              // Handle user-specific notification (no 'action' field)
              const notification: NotificationData = parsed;
              const messageId = `notification-${notification.TodoId}-${notification.Assignment.AssignedAt}`;
              if (processedMessages.current.has(messageId)) {
                console.log('Duplicate notification ignored:', messageId);
                return;
              }
              processedMessages.current.add(messageId);

              // Only add notification if it’s for the logged-in user
              if (notification.Assignment.UserId === loggedInUserId) {
                setNotifications((prev) => [...prev, notification]);
              }
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
            setError('Error processing real-time updates. Please refresh the page.');
          }
        });

        wsRef.current.onopen = () => {
          console.log('WebSocket connected (overridden by connectWebSocket)');
          reconnectAttempts.current = 0;
          setError(null);
          processedMessages.current.clear();
        };

        wsRef.current.onerror = () => {
          setError('Real-time connection failed. Attempting to reconnect...');
        };

        wsRef.current.onclose = (event) => {
          console.log('WebSocket closed (overridden by connectWebSocket):', event.code, event.reason);
          if (reconnectAttempts.current < maxReconnectAttempts && !event.wasClean) {
            reconnectAttempts.current++;
            const delay = Math.min(5000, 1000 * 2 ** reconnectAttempts.current);
            setTimeout(() => {
              console.log(`Reconnection attempt ${reconnectAttempts.current}`);
              connectWs();
            }, delay);
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setError('Failed to establish real-time connection. Attempting to reconnect...');
        reconnectAttempts.current++;
        const delay = Math.min(5000, 1000 * 2 ** reconnectAttempts.current);
        setTimeout(connectWs, delay);
      }
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [loggedInUserId, selectedListId]);

  const handleLogout = () => {
    Cookies.remove('userId');
    Cookies.remove('avatar');
    Cookies.remove('userName');
    Cookies.remove('userRole');
    router.push('/');
  };

  const handleRetry = () => {
    reconnectAttempts.current = 0;
    hasFetchedInitialTodos.current = false;
    setError(null);
    loadTodoListsAndTodos();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual retry');
    }
  };

  return (
    <Flex direction="column" style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <NavBar userId={loggedInUserId} onLogout={handleLogout} />

      <Flex style={{ marginTop: '60px', flex: 1 }}>
        <TodoListComponent
          onSelect={handleListSelect}
          todoLists={todoLists}
          onAddTodoList={handleAddTodoList}
          onUpdateTodoList={handleUpdateTodoList}
          onDeleteTodoList={handleDeleteTodoList}
          loggedInUserId={loggedInUserId}
        />
        <Container size="lg" py="xl" style={{ flex: 1 }}>
          {loading ? (
            <Center style={{ height: 'calc(100vh - 60px)' }}>
              <Loader size="lg" />
            </Center>
          ) : error ? (
            <Center style={{ height: 'calc(100vh - 60px)' }}>
              <Stack align="center">
                <Text c="red" size="lg">{error}</Text>
                <Button onClick={handleRetry} color="gray" variant="outline">
                  Retry
                </Button>
              </Stack>
            </Center>
          ) : (
            <Paper shadow="sm" p="lg" radius="md" style={{ backgroundColor: '#ffffff' }}>
              <Group justify="space-between" align="center" mb="md">
                <Title order={2} c="gray.8">
                  Todos {selectedListId ? `for List ${selectedListId}` : ' - Select a List'}
                </Title>
                <Button
                  color="#FF991F"
                  onClick={() => setModalOpened(true)}
                  disabled={!selectedListId}
                  variant="filled"
                >
                  Add Todo
                </Button>
              </Group>

              {todos.length === 0 ? (
                <Text c="gray.6" size="lg" ta="center" mt="lg">
                  No todos found for this list
                </Text>
              ) : (
                <Stack gap="md">
                  {todos.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      {...todo}
                      loggedInUserId={loggedInUserId ?? 0}
                      updateStatus={handleStatusUpdate}
                      webSocket={wsRef.current}
                      comments={todo.comments || []}
                    />
                  ))}
                </Stack>
              )}

              {selectedListId && (
                <AddTodoModal
                  opened={modalOpened}
                  onClose={() => setModalOpened(false)}
                  onAdd={handleAddTodo}
                  todoListId={selectedListId}
                />
              )}
            </Paper>
          )}
        </Container>
        {loggedInUserId !== null && (
          <NotificationModal
            loggedInUserId={loggedInUserId}
            notifications={notifications}
            updateTodoInLists={(todoId, updates) =>
              setTodos((prev) =>
                prev.map((todo) => (todo.id === todoId ? { ...todo, ...updates } : todo))
              )
            }
          />
        )}
      </Flex>
    </Flex>
  );
}