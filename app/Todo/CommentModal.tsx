'use client';

import { useState, useEffect } from 'react';
import { Modal, Stack, Text, Textarea, Button, Group, Avatar, ScrollArea, Divider, Box } from '@mantine/core';
import { IconSend, IconEdit, IconTrash } from '@tabler/icons-react';
import { ExtendedCommentModalProps, Comment as TodoComment } from '../ApiController/TodoList';
import { fetchComments, createComment, updateComment, deleteComment, fetchAvatars } from '../ApiController/ApiController';

export default function CommentModal({
  opened,
  onClose,
  todoId,
  loggedInUserId,
  comments: initialComments = [],
  webSocket,
}: ExtendedCommentModalProps & { webSocket?: WebSocket | null }) {
  const [comments, setComments] = useState<TodoComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Map<number, string | null>>(new Map());

  useEffect(() => {
    if (opened) {
      loadComments();
    }
  }, [opened, todoId, initialComments]);

  useEffect(() => {
    if (!webSocket || !opened) return;

    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        const { action, comment, commentId } = parsed;

        if (comment && comment.TodoId === todoId) {
          const normalizedComment: TodoComment = {
            id: comment.Id,
            text: comment.Text,
            todoId: comment.TodoId,
            userId: comment.UserId,
            userName: comment.UserName || 'Unknown',
            avatarUrl:
              comment.AvatarUrl &&
              (comment.AvatarUrl.startsWith('data:image')
                ? comment.AvatarUrl
                : `data:image/jpeg;base64,${comment.AvatarUrl}`) || '',
            createdAt: comment.CreatedAt || new Date().toISOString(),
          };

          switch (action) {
            case 'create':
              setComments((prev) => {
                if (prev.some((c) => c.id === normalizedComment.id)) return prev;
                console.log('Adding comment to CommentModal:', normalizedComment);
                return [...prev, normalizedComment];
              });
              break;
            case 'update':
              setComments((prev) =>
                prev.map((c) =>
                  c.id === normalizedComment.id ? normalizedComment : c
                )
              );
              break;
            case 'delete':
              if (commentId) {
                setComments((prev) => prev.filter((c) => c.id !== commentId));
              }
              break;
            default:
              break;
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message in CommentModal:', err);
      }
    };

    webSocket.addEventListener('message', handleWebSocketMessage);
    return () => {
      webSocket.removeEventListener('message', handleWebSocketMessage);
    };
  }, [webSocket, opened, todoId]);

  const normalizeAvatarUrl = (avatarUrl: string | undefined): string => {
    if (!avatarUrl) return '';
    if (avatarUrl.startsWith('data:image')) return avatarUrl;
    if (avatarUrl.startsWith('/9j/') || avatarUrl.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/jpeg;base64,${avatarUrl}`;
    }
    return avatarUrl;
  };

  const loadComments = async () => {
    try {
      setError(null);
      const fetchedComments = await fetchComments(todoId);
      console.log('Raw fetched comments:', fetchedComments);

      const normalizedComments = fetchedComments.map((comment) => ({
        ...comment,
        avatarUrl: normalizeAvatarUrl(comment.avatarUrl),
      }));
      setComments(normalizedComments);

      const uniqueUserIds = Array.from(new Set(fetchedComments.map((comment) => comment.userId)));
      const avatarPromises = uniqueUserIds.map(async (userId) => {
        const avatarSrc = await fetchAvatars(userId);
        return { userId, avatarSrc };
      });

      const avatarResults = await Promise.all(avatarPromises);
      const newAvatarUrls = new Map(avatarResults.map(({ userId, avatarSrc }) => [userId, avatarSrc]));
      setAvatarUrls(newAvatarUrls);

      console.log('Fetched avatars:', Object.fromEntries(newAvatarUrls));
    } catch (err: any) {
      console.error('Error fetching comments or avatars:', err);
      setError(err.message || 'Failed to load comments');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await createComment(todoId, newComment);
      setNewComment('');
    } catch (err: any) {
      console.error('Error adding comment:', err);
      setError(err.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleEditComment = (comment: TodoComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.text);
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editText.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    try {
      setError(null);
      await updateComment(commentId, editText);
      setEditingCommentId(null);
      setEditText('');
    } catch (err: any) {
      setError(err.message || 'Failed to update comment');
    } finally {
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      setError(null);
      await deleteComment(commentId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
    } finally {
    }
  };

  return (
    <Modal
      zIndex={1001}
      opened={opened}
      onClose={onClose}
      title={<Text size="lg" fw={600} c="black">Comments for Todo #{todoId}</Text>}
      styles={{
        header: { backgroundColor: '#F5F5F5', borderBottom: '1px solid #E0E0E0' },
        body: { backgroundColor: '#FFFFFF', padding: '20px' },
      }}
      size="md"
    >
      <Stack>
        <ScrollArea h={300} scrollbarSize={6}>
          {error ? (
            <Text c="red" ta="center">
              {error}
            </Text>
          ) : comments.length === 0 ? (
            <Text c="gray.7" ta="center">
              No comments yet
            </Text>
          ) : (
            comments.map((comment, index) => {
              const avatarSrc = avatarUrls.get(comment.userId) || normalizeAvatarUrl(comment.avatarUrl);
              const isOwnComment = comment.userId === loggedInUserId;
              return (
                <Stack key={comment.id} gap="sm" pb="sm">
                  <Group justify="space-between" align="flex-start">
                    <Group gap="sm">
                      <Avatar src={avatarSrc} alt={comment.userName} radius="xl" size={30} />
                      <Box>
                        <Text size="sm" c="black" fw={isOwnComment ? 700 : 400}>
                          {comment.userName} {isOwnComment && '(You)'}
                        </Text>
                        <Text size="xs" c="gray.6">
                          {new Date(comment.createdAt).toLocaleString()}
                        </Text>
                      </Box>
                    </Group>
                    {isOwnComment && (
                      <Group gap="xs">
                        <Button
                          variant="subtle"
                          size="xs"
                          color="gray"
                          onClick={() => handleEditComment(comment)}
                          disabled={loading || editingCommentId !== null}
                        >
                          <IconEdit size={16} />
                        </Button>
                        <Button
                          variant="subtle"
                          size="xs"
                          color="red"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={loading}
                        >
                          <IconTrash size={16} />
                        </Button>
                      </Group>
                    )}
                  </Group>
                  {editingCommentId === comment.id ? (
                    <Box style={{ marginLeft: '42px' }}>
                      <Textarea
                        value={editText}
                        onChange={(event) => setEditText(event.currentTarget.value)}
                        minRows={2}
                        styles={{
                          input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
                        }}
                      />
                      <Group justify="flex-end" mt="sm">
                        <Button
                          variant="subtle"
                          size="sm"
                          color="gray"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText('');
                          }}
                          disabled={loading}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          color="pink"
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={loading || !editText.trim()}
                        >
                          Save
                        </Button>
                      </Group>
                    </Box>
                  ) : (
                    <Text size="sm" c="gray.7" style={{ marginLeft: '42px' }}>
                      {comment.text}
                    </Text>
                  )}
                  {index < comments.length - 1 && <Divider />}
                </Stack>
              );
            })
          )}
        </ScrollArea>

        <Textarea
          value={newComment}
          onChange={(event) => setNewComment(event.currentTarget.value)}
          placeholder="Add a comment..."
          minRows={3}
          disabled={loading}
          styles={{
            input: { backgroundColor: '#F9F9F9', color: '#000000', borderColor: '#E0E0E0' },
          }}
        />

        <Group justify="flex-end">
          <Button
            onClick={handleAddComment}
            disabled={loading || !newComment.trim()}
            color="pink"
            variant="filled"
            leftSection={<IconSend size={16} />}
            styles={{ root: { borderRadius: '8px' } }}
          >
            Post Comment
          </Button>
        </Group>

        {error && (
          <Text c="red" size="sm" mt="sm">
            {error}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}