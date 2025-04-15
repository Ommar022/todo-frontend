'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Checkbox,
  MultiSelect,
  Group,
  Text,
  Box,
} from '@mantine/core';
import { TodoList, TodoListAssignment, AddTodoListModalProps, User } from '../ApiController/TodoList';
import { createTodoList, fetchUsers } from '../ApiController/ApiController';

export default function AddTodoListModal({ opened, onClose, onAdd }: AddTodoListModalProps) {
  const [listName, setListName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [canEditAssignments, setCanEditAssignments] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await fetchUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };
    if (opened) {
      loadUsers();
      setListName('');
      setSelectedUsers([]);
      setCanEditAssignments({});
      setError(null);
    }
  }, [opened]);

  const handleUserSelect = (value: string[]) => {
    setSelectedUsers(value);
    const newCanEditAssignments = { ...canEditAssignments };
    value.forEach((userId) => {
      if (!(userId in newCanEditAssignments)) {
        newCanEditAssignments[userId] = false;
      }
    });
    setCanEditAssignments(newCanEditAssignments);
  };

  const handleCanEditChange = (userId: string, checked: boolean) => {
    setCanEditAssignments((prev) => ({
      ...prev,
      [userId]: checked,
    }));
  };

  const handleSubmit = async () => {
    if (!listName.trim()) {
      setError('List name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const assignments: TodoListAssignment[] = selectedUsers.map((userId) => ({
        userId: parseInt(userId, 10),
        canEdit: canEditAssignments[userId] || false,
        assignedAt: new Date().toISOString(),
      }));

      const newList = await createTodoList(listName, assignments);
      onAdd(newList);
      setListName('');
      setSelectedUsers([]);
      setCanEditAssignments({});
      setError(null);
      onClose();
    } catch (err) {
      console.error('Error creating todo list:', err);
      setError('Failed to create todo list.');
    } finally {
      setLoading(false);
    }
  };

  const multiSelectData = users.map((user) => ({
    value: user.id.toString(),
    label: user.userName,
  }));

  return (
    <Modal
      zIndex={1000}
      opened={opened}
      onClose={() => {
        onClose();
        setListName('');
        setSelectedUsers([]);
        setCanEditAssignments({});
        setError(null);
      }}
      title={<Text size="lg" fw={600} c="black">Add New Todo List</Text>}
      styles={{
        header: { backgroundColor: '#F5F5F5', borderBottom: '1px solid #E0E0E0' },
        body: { backgroundColor: '#FFFFFF', padding: '20px' },
      }}
    >
      <Stack gap="md">
        <TextInput
          label="List Name"
          placeholder="Enter list name"
          value={listName}
          onChange={(e) => setListName(e.currentTarget.value)}
          required
          disabled={loading}
          error={error && !listName.trim() ? 'List name is required' : null}
          styles={{
            input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
            label: { color: '#000000' },
          }}
        />
        <Stack gap="xs">
          <MultiSelect
            label="Assign Users"
            placeholder={loading ? 'Loading users...' : 'Select users'}
            data={multiSelectData}
            value={selectedUsers}
            onChange={handleUserSelect}
            searchable
            clearable
            disabled={loading}
            styles={{
              input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
              label: { color: '#000000' },
              dropdown: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', zIndex: 1001 },
              option: { color: '#000000', '&:hover': { backgroundColor: '#FFD1DC' } },
            }}
          />
          {selectedUsers.length > 0 && (
            <Box>
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id.toString() === userId);
                return (
                  <Group
                    key={userId}
                    justify="space-between"
                    p="xs"
                    bg="#F9F9F9"
                    mt="xs"
                    style={{ borderRadius: '6px' }}
                  >
                    <Text c="gray.7">{user?.userName || 'Unknown'}</Text>
                    <Checkbox
                      label="Can Edit"
                      checked={canEditAssignments[userId] || false}
                      onChange={(e) => handleCanEditChange(userId, e.currentTarget.checked)}
                      disabled={loading}
                      color="pink"
                      styles={{ label: { color: '#000000' } }}
                    />
                  </Group>
                );
              })}
            </Box>
          )}
        </Stack>
        {error && <Text c="red" size="sm">{error}</Text>}
        <Group justify="flex-end" mt="md">
          <Button
            onClick={handleSubmit}
            color="pink"
            variant="filled"
            disabled={loading}
            loading={loading}
            styles={{ root: { borderRadius: '8px' } }}
          >
            Create List
          </Button>
          <Button
            variant="subtle"
            color="gray"
            onClick={onClose}
            disabled={loading}
            styles={{ root: { '&:hover': { color: '#FF4081' } } }}
          >
            Cancel
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}