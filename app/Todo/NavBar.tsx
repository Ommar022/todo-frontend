'use client';

import { useState, useEffect } from 'react';
import { Group, Avatar, Text, Button, rem, Modal } from '@mantine/core';
import { IconLogout, IconUsers } from '@tabler/icons-react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { fetchAvatars } from '../ApiController/ApiController';
import { NavBarProps } from '../ApiController/TodoList';
import UsersModal from './UsersModal';

export default function NavBar({ userId, onLogout }: NavBarProps) {
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userModalOpened, setUserModalOpened] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedUserId = Cookies.get('userId');
    const storedToken = Cookies.get('token');
    const storedUserName = Cookies.get('userName');

    if (storedUserId && storedToken) {
      setUserName(storedUserName || 'User');

      const fetchAvatarData = async () => {
        try {
          const avatarImageSrc = await fetchAvatars(Number(storedUserId));
          setAvatarUrl(avatarImageSrc);
        } catch (error) {
          console.error('Error fetching avatar:', error);
          setAvatarUrl(null);
        }
      };

      fetchAvatarData();
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove('userId');
    Cookies.remove('avatar');
    Cookies.remove('userName');

    if (onLogout) {
      onLogout();
    }

    router.push('/');
  };

  const userRole = Cookies.get('userRole');
  return (
    <>
      <Group
        h="60px"
        px="lg"
        py="sm"
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        }}
        justify="space-between"
      >
        <Text fw={700} size="xl" c="#FF991F">
          Todo App
        </Text>

        {userId !== null && (
          <Group gap="md">
            <Group style={{ cursor: 'pointer' }}>
              <Avatar
                src={avatarUrl}
                radius="xl"
                size="md"
                alt={userName || 'User'}
              />
              <Text size="sm" fw={500} c="gray.7">
                {userName}
              </Text>
            </Group>

            {userRole === 'Admin' && (
              <Button
                color="#FF991F"
                leftSection={<IconUsers style={{ width: rem(16), height: rem(16) }} color="white" />}
                onClick={() => setUserModalOpened(true)}
                variant="filled"
                size="sm"
              >
                Manage Users
              </Button>
            )}

            <Button
              color="#FF991F"
              leftSection={<IconLogout style={{ width: rem(16), height: rem(16) }} color="white" />}
              onClick={handleLogout}
              variant="filled"
              size="sm"
            >
              Logout
            </Button>
          </Group>
        )}
      </Group>

      <UsersModal
        opened={userModalOpened}
        onClose={() => setUserModalOpened(false)}
      />
    </>
  );
}