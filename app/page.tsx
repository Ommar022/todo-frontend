'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Notification,
  Overlay,
  Paper,
  Stack,
  TextInput,
  Title,
  FileInput,
} from '@mantine/core';
import { handleAuth } from './ApiController/ApiController';

const Home = () => {
  const router = useRouter();
  const [action, setAction] = useState<'Login' | 'Sign Up'>('Login');
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    password: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null); 
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectPath = await handleAuth(action, formData, imageFile);
      if (redirectPath && typeof redirectPath === 'string') {
        router.push(redirectPath);
        if (action === 'Sign Up') {
          console.log('User created successfully');
        }
      } else {
        throw new Error('Invalid redirect path');
      }
    } catch (err) {
      console.error('Auth error:', err); 
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Group justify="center" align="center" h="100vh" bg="gray.2">
      <Paper shadow="md" p="lg" radius="md" w={380} bg="white" style={{ position: 'relative' }}>
        {loading && (
          <Overlay color="#FF991F" blur={2}>
            <Center h="100%">
              <Loader color="blue" size="lg" />
            </Center>
          </Overlay>
        )}
        <Stack gap="md">
          <Title order={2} ta="center" c="dark">
            {action}
          </Title>

          <Divider color="gray.4" />

          <Stack gap="sm">
            {action === 'Sign Up' && (
              <>
                <TextInput
                  label="Username"
                  placeholder="Enter your username"
                  name="userName"
                  value={formData.userName}
                  onChange={handleInputChange}
                />
                <FileInput
                  label="Profile Image"
                  placeholder="Upload an image"
                  accept="image/*"
                  value={imageFile}
                  onChange={handleImageChange}
                />
              </>
            )}

            <TextInput
              label="Email"
              placeholder="Enter your email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />

            <TextInput
              label="Password"
              placeholder="Enter your password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
            />
          </Stack>

          {error && (
            <Notification color="red" title="Error" onClose={() => setError(null)}>
              {error}
            </Notification>
          )}

          <Group justify="center" gap="sm">
            <Button
              variant={action === 'Sign Up' ? 'filled' : 'outline'}
              color="#FF991F"
              radius="md"
              onClick={() => {
                setAction('Sign Up');
                setError(null);
              }}
              disabled={loading}
            >
              Sign Up
            </Button>

            <Button
              variant={action === 'Login' ? 'filled' : 'outline'}
              color="#FF991F"
              radius="md"
              onClick={() => {
                setAction('Login');
                setError(null);
              }}
              disabled={loading}
            >
              Login
            </Button>
          </Group>

          <Button fullWidth color="#FF991F" radius="md" onClick={handleSubmit} disabled={loading}>
            Submit
          </Button>
        </Stack>
      </Paper>
    </Group>
  );
};

export default Home;