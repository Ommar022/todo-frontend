'use client';

import { useState, useEffect } from 'react';
import { Modal, Stack, Group, Avatar, Text, Loader, Center, Button, Switch } from '@mantine/core';
import { fetchUsers, fetchAvatars, deleteUser, toggleUserActive } from '../ApiController/ApiController';
import { UserWithAvatar, UsersModalProps } from '../ApiController/TodoList';

export default function UsersModal({ opened, onClose }: UsersModalProps) {
  const [users, setUsers] = useState<UserWithAvatar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const userList = await fetchUsers();

      const usersWithAvatars = await Promise.all(
        userList.map(async (user) => {
          try {
            const avatarUrl = await fetchAvatars(user.id);
            return { ...user, avatarUrl };
          } catch (err) {
            console.error(`Error fetching avatar for user ${user.id}:`, err);
            return { ...user, avatarUrl: null };
          }
        })
      );

      setUsers(usersWithAvatars);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentIsActive: boolean) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id.toString() === userId ? { ...user, isActive: !currentIsActive } : user
      )
    );

    try {
      await toggleUserActive(userId, currentIsActive);
      console.log(`Successfully toggled user ${userId} to ${!currentIsActive}`);
    } catch (err: any) {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id.toString() === userId ? { ...user, isActive: currentIsActive } : user
        )
      );
      console.error(`Error toggling user ${userId}:`, err);
      setError(err.message || 'Failed to toggle user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(userId);
      setUsers((prevUsers) => prevUsers.filter((user) => user.id.toString() !== userId));
      console.log(`Successfully deleted user ${userId}`);
    } catch (err: any) {
      console.error(`Error deleting user ${userId}:`, err);
      setError(err.message || 'Failed to delete user');
    }
  };

  useEffect(() => {
    if (opened) {
      loadUsers();
    }
  }, [opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={700} size="lg">Manage Users</Text>}
      size="lg"
      centered
      zIndex={1001}
    >
      {loading ? (
        <Center style={{ height: '200px' }}>
          <Loader size="lg" />
        </Center>
      ) : error ? (
        <Center style={{ height: '200px' }}>
          <Stack align="center">
            <Text c="red" ta="center">{error}</Text>
            <Button onClick={loadUsers} color="gray" variant="outline">
              Retry
            </Button>
          </Stack>
        </Center>
      ) : users.length === 0 ? (
        <Center style={{ height: '200px' }}>
          <Text ta="center" c="gray.6">No users found</Text>
        </Center>
      ) : (
        <Stack gap="sm">
          {users.map((user) => (
            <Group
              key={user.id}
              p="sm"
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fafafa',
              }}
              justify="space-between"
            >
              <Group>
                <Avatar
                  src={user.avatarUrl}
                  radius="xl"
                  size="lg"
                  alt={user.userName}
                  style={{ border: '2px solid #e0e0e0' }}
                />
                <Stack gap={0} style={{ flex: 1 }}>
                  <Text fw={500} size="md">{user.userName}</Text>
                  <Text size="sm" c="gray.6">{user.email}</Text>
                  <Text size="sm" c={user.role === 'Admin' ? 'blue' : 'gray'}>
                    Role: {user.role || 'User'}
                  </Text>
                </Stack>
              </Group>
              <Group gap="xs">
                <Switch
                  checked={user.isActive}
                  onChange={() => handleToggleUserActive(user.id.toString(), user.isActive)}
                  label="Active"
                  size="sm"
                />
                <Button
                  color="red"
                  variant="outline"
                  size="xs"
                  onClick={() => handleDeleteUser(user.id.toString())}
                >
                  Delete
                </Button>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </Modal>
  );
}