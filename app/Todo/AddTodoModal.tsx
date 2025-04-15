'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Select,
  MultiSelect,
  Checkbox,
  Text,
  Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  createTodo,
  fetchTodoStatuses,
  fetchAssignableUsersForTodoList,
} from '../ApiController/ApiController';
import { AddTodoModalProps, Todo, TodoStatus, UserWithAvatar, TodoAssignment } from '../ApiController/TodoList';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export default function AddTodoModal({ opened, onClose, onAdd, todoListId }: AddTodoModalProps) {
  const [statuses, setStatuses] = useState<TodoStatus[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserWithAvatar[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userAssignments, setUserAssignments] = useState<TodoAssignment[]>([]); 
  const router = useRouter();

  const form = useForm({
    initialValues: {
      taskName: '',
      taskDescription: '',
      statusId: '',
      assignedUserIds: [] as string[],
    },
    validate: {
      taskName: (value) => (value.length < 1 ? 'Task name is required' : null),
      statusId: (value) => (!value ? 'Status is required' : null),
      assignedUserIds: (value) => (value.length < 1 ? 'At least one user must be assigned' : null),
    },
  });

  const loadDropdownData = async () => {
    try {
      setError(null);
      const [statusData, userData] = await Promise.all([
        fetchTodoStatuses(),
        fetchAssignableUsersForTodoList(todoListId),
      ]);
      setStatuses(statusData);
      setAssignableUsers(userData);

      if (statusData.length > 0 && !form.values.statusId) {
        form.setFieldValue('statusId', statusData[0].id.toString());
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load statuses or assignable users.';
      if (errorMessage.includes('Authentication failed') || errorMessage.includes('Unauthorized')) {
        Cookies.remove('token');
        Cookies.remove('userId');
        Cookies.remove('userName');
        router.push('/');
      }
      setError(errorMessage);
    }
  };

  const handleUserSelection = (selected: string[]) => {
    form.setFieldValue('assignedUserIds', selected);
    const newAssignments = selected.map((id) => {
      const userId = parseInt(id, 10);
      const user = assignableUsers.find((u) => u.id === userId);
      const existing = userAssignments.find((ua) => ua.userId === userId);
      return (
        existing || {
          userId,
          userName: user?.userName || 'Unknown',
          canEdit: true,
          assignedAt: new Date().toISOString(), 
          avatarUrl: user?.avatarUrl || '',
        }
      );
    });
    setUserAssignments(newAssignments);
  };

  const handleCanEditChange = (userId: number, canEdit: boolean) => {
    setUserAssignments((prev) =>
      prev.map((ua) => (ua.userId === userId ? { ...ua, canEdit } : ua))
    );
  };

  const handleAddTodo = async (values: typeof form.values) => {
    try {
      setError(null);
      const statusIdNumber = parseInt(values.statusId, 10);
      if (isNaN(statusIdNumber)) throw new Error('Invalid status ID');
  
      const assignmentsForApi = userAssignments.map(({ userId }) => ({ userId, canEdit: true }));
  
      const apiTodo = await createTodo(
        values.taskName,
        values.taskDescription,
        statusIdNumber,
        assignmentsForApi,
        todoListId
      );
  
      const status = statuses.find((s) => s.id === statusIdNumber);
      const completeTodo: Todo = {
        ...apiTodo,
        todoListId,
        createdAt: apiTodo.createdAt || new Date().toISOString(),
        statusName: status?.statusName || 'Unknown',
        assignments: userAssignments, 
        userId: apiTodo.userId || parseInt(Cookies.get('userId') || '0', 10),
        comments: [],
      };
  
      onAdd(completeTodo);
      onClose();
      form.reset();
      setUserAssignments([]);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add todo.';
      if (errorMessage.includes('Authentication failed') || errorMessage.includes('Unauthorized')) {
        Cookies.remove('token');
        Cookies.remove('userId');
        Cookies.remove('userName');
        router.push('/');
      }
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (opened) {
      loadDropdownData();
      form.reset();
      setUserAssignments([]);
      setError(null);
    }
  }, [opened, todoListId]);

  return (
    <Modal
      zIndex={1000}
      opened={opened}
      onClose={() => {
        onClose();
        form.reset();
        setUserAssignments([]);
        setError(null);
      }}
      title={<Text size="lg" fw={600} c="black">Add New Todo</Text>}
      styles={{
        header: { backgroundColor: '#F5F5F5', borderBottom: '1px solid #E0E0E0' },
        body: { backgroundColor: '#FFFFFF', padding: '20px' },
      }}
    >
      <form onSubmit={form.onSubmit(handleAddTodo)}>
        <Stack gap="md">
          <TextInput
            label="Task Name"
            placeholder="Enter task name"
            required
            {...form.getInputProps('taskName')}
            styles={{
              input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
              label: { color: '#000000' },
            }}
          />
          <TextInput
            label="Task Description"
            placeholder="Enter task description"
            {...form.getInputProps('taskDescription')}
            styles={{
              input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
              label: { color: '#000000' },
            }}
          />
          <Select
            label="Status"
            placeholder="Select status"
            data={statuses.map((status) => ({
              value: status.id.toString(),
              label: status.statusName,
            }))}
            required
            {...form.getInputProps('statusId')}
            styles={{
              input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
              label: { color: '#000000' },
              dropdown: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', zIndex: 1001 },
              option: { color: '#000000', '&:hover': { backgroundColor: '#FFD1DC' } },
            }}
          />
          <Stack gap="xs">
            <MultiSelect
              label="Assign To"
              placeholder="Select at least one user"
              data={assignableUsers.map((user) => ({
                value: user.id.toString(),
                label: user.userName,
              }))}
              value={form.values.assignedUserIds}
              onChange={handleUserSelection}
              searchable
              required
              styles={{
                input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
                label: { color: '#000000' },
                dropdown: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', zIndex: 1001 },
                option: { color: '#000000', '&:hover': { backgroundColor: '#FFD1DC' } },
              }}
            />
            {userAssignments.length > 0 && (
              <Box>
                {userAssignments.map((assignment) => (
                  <Group
                    key={assignment.userId}
                    justify="space-between"
                    p="xs"
                    bg="#F9F9F9"
                    mt="xs"
                    style={{ borderRadius: '6px' }}
                  >
                    <Text c="gray.7">{assignment.userName}</Text>
                    <Checkbox
                      label="Can Edit"
                      checked={assignment.canEdit}
                      onChange={(event) =>
                        handleCanEditChange(assignment.userId, event.currentTarget.checked)
                      }
                      color="pink"
                      styles={{ label: { color: '#000000' } }}
                    />
                  </Group>
                ))}
              </Box>
            )}
          </Stack>
          {error && (
            <Text c="red" size="sm">
              {error}
            </Text>
          )}
          <Group justify="flex-end" mt="md">
            <Button
              type="submit"
              color="pink"
              variant="filled"
              styles={{ root: { borderRadius: '8px' } }}
            >
              Add Todo
            </Button>
            <Button
              variant="subtle"
              color="gray"
              onClick={onClose}
              styles={{ root: { '&:hover': { color: '#FF4081' } } }}
            >
              Cancel
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}