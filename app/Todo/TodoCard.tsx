'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconEdit, IconMessageCircle, IconProgressCheck, IconTrash } from '@tabler/icons-react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  Select,
  Text,
} from '@mantine/core';
import {
  assignTodoToUsers,
  deleteTodo,
  fetchAvatars,
  fetchTodoStatuses,
  updateTodoStatus,
} from '../ApiController/ApiController';
import { Comment, ExtendedTodoCardProps, TodoAssignment, User } from '../ApiController/TodoList';
import CommentModal from './CommentModal';
import EditTodoCardModal from './EditTodoCardModal';

type AvatarData = {
  src: string;
  key: number;
};

export default function TodoCard({
  id,
  taskName,
  taskDescription,
  statusName,
  assignments = [],
  userId,
  todoListId,
  loggedInUserId,
  updateStatus,
  webSocket,
  comments = [],
}: ExtendedTodoCardProps) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [statuses, setStatuses] = useState<{ id: number; statusName: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userAssignments, setUserAssignments] = useState<TodoAssignment[]>(assignments);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [localComments, setLocalComments] = useState<Comment[]>(comments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Map<number, string | null>>(new Map());

  const DEFAULT_AVATAR = '';

  useEffect(() => {
    setUserAssignments(assignments);
  }, [assignments]);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  const canEdit = useMemo(() => {
    const isOwner = userId === loggedInUserId;
    const assignment = assignments.find((a) => a.userId === loggedInUserId);
    return isOwner || (assignment && assignment.canEdit);
  }, [userId, loggedInUserId, assignments]);

  useEffect(() => {
    const fetchAllAvatars = async () => {
      const newAvatarUrls = new Map<number, string | null>();
      for (const assignment of assignments) {
        if (assignment.userId) {
          try {
            const avatarSrc = await fetchAvatars(assignment.userId);
            newAvatarUrls.set(assignment.userId, avatarSrc);
          } catch (error) {
            console.error(`Failed to fetch avatar for user ${assignment.userId}:`, error);
            newAvatarUrls.set(assignment.userId, null);
          }
        }
      }
      setAvatarUrls(newAvatarUrls);
    };

    if (assignments.length > 0) {
      fetchAllAvatars();
    }
  }, [assignments]);

  useEffect(() => {
    if (!webSocket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const { action, comment, commentId } = data;

        if (comment && comment.TodoId === id) {
          switch (action) {
            case 'create':
              setLocalComments((prev) => {
                if (prev.some((c) => c.id === comment.Id)) return prev;
                const normalizedComment: Comment = {
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
                console.log('Adding comment to TodoCard:', normalizedComment);
                return [...prev, normalizedComment];
              });
              break;

            case 'update':
              setLocalComments((prev) =>
                prev.map((c) =>
                  c.id === comment.Id
                    ? {
                        ...c,
                        text: comment.Text,
                        avatarUrl:
                          comment.AvatarUrl &&
                          (comment.AvatarUrl.startsWith('data:image')
                            ? comment.AvatarUrl
                            : `data:image/jpeg;base64,${comment.AvatarUrl}`) || '',
                      }
                    : c
                )
              );
              break;

            case 'delete':
              if (commentId) {
                setLocalComments((prev) => prev.filter((c) => c.id !== commentId));
              }
              break;

            default:
              break;
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message in TodoCard:', error);
        setError('Error processing real-time update');
      }
    };

    webSocket.addEventListener('message', handleMessage);
    return () => {
      webSocket.removeEventListener('message', handleMessage);
    };
  }, [webSocket, id]);

  const assignedAvatars = useMemo<AvatarData[]>(() => {
    return assignments.map((assignment, index) => ({
      src: avatarUrls.get(assignment.userId) || DEFAULT_AVATAR,
      key: assignment.userId || index,
    }));
  }, [assignments, avatarUrls]);

  const handleUserSelection = async (value: string | null) => {
    setSelectedUserId(value);
    if (value && !userAssignments.some((ua) => ua.userId === parseInt(value))) {
      const user = users.find((u) => u.id === parseInt(value));
      if (user) {
        try {
          const avatarSrc = await fetchAvatars(user.id);
          setAvatarUrls((prev) => new Map(prev).set(user.id, avatarSrc));
          setUserAssignments((prev) => [
            ...prev,
            {
              userId: parseInt(value),
              userName: user.userName,
              canEdit: true,
              assignedAt: new Date().toISOString(),
              avatarUrl: avatarSrc || DEFAULT_AVATAR,
            },
          ]);
        } catch (error) {
          console.error(`Failed to fetch avatar for user ${user.id}:`, error);
          setAvatarUrls((prev) => new Map(prev).set(user.id, null));
        }
      }
    }
  };

  const handleCanEditChange = (userId: number, canEdit: boolean) => {
    setUserAssignments((prev) =>
      prev.map((ua) => (ua.userId === userId ? { ...ua, canEdit } : ua))
    );
  };

  const handleUserAssign = async () => {
    if (!userAssignments.length) {
      setError('Please select at least one user');
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const updatedAssignments = await assignTodoToUsers(id, userAssignments);
      setUserAssignments(updatedAssignments.todoAssignments || userAssignments);

      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(
          JSON.stringify({
            action: 'todo_assigned',
            data: {
              TodoId: id,
              TaskName: taskName,
              TaskDescription: taskDescription,
              StatusId: statuses.find((s) => s.statusName === statusName)?.id || 0,
              StatusName: statusName,
              UserId: userId,
              TodoListId: todoListId,
              Assignments: userAssignments,
            },
          })
        );
      }

      setShowAssignDropdown(false);
      setSelectedUserId(null);
    } catch (error: any) {
      setError(error.message || 'Failed to assign users');
      console.error('Assignment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = async () => {
    if (!showStatusDropdown) {
      try {
        setLoading(true);
        const statusList = await fetchTodoStatuses();
        setStatuses(statusList);
        setShowStatusDropdown(true);
      } catch (error) {
        setError('Failed to fetch statuses');
        console.error('Status fetch error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setShowStatusDropdown(false);
      setSelectedStatusId(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedStatusId) {
      setError('Please select a status');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const statusId = parseInt(selectedStatusId);
      const selectedStatus = statuses.find((s) => s.id === statusId);
      if (!selectedStatus) throw new Error('Status not found');

      await updateTodoStatus(id, statusId);
      updateStatus?.(id, statusId, selectedStatus.statusName);
      setShowStatusDropdown(false);
      setSelectedStatusId(null);
    } catch (error: any) {
      setError(error.message || 'Failed to update status');
      console.error('Status update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this todo?')) return;
    try {
      setLoading(true);
      setError(null);
      await deleteTodo(id);
    } catch (error: any) {
      setError(error.message || 'Failed to delete todo');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" radius="lg" shadow="sm" bg="white" style={{ border: '2px solid #E0E0E0' }}>
      <Group
        justify="space-between"
        bg="linear-gradient(135deg, #735EC6 0%, #CD5A91 100%)"
        p="sm"
        style={{ borderRadius: '8px' }}
      >
        <Text fw={600} c="white" size="lg">
          {taskName || 'Untitled Task'}
        </Text>
        <Text
          size="sm"
          c="white"
          px={10}
          py={4}
          bg="rgba(255,255,255,0.2)"
          style={{ borderRadius: '12px' }}
        >
          {statusName}
        </Text>
      </Group>

      <Text mt="md" size="md" c="gray.7" style={{ lineHeight: 1.6 }}>
        {taskDescription || 'No description provided'}
      </Text>

      <Divider my="md" color="gray.2" />

      <Group justify="space-between" align="center">
        <Box>
          <Text
            size="sm"
            c="gray.6"
            style={{ fontStyle: assignments.length > 0 ? 'normal' : 'italic' }}
          >
            {assignments.length > 0 ? 'Assigned Users:' : 'Unassigned'}
          </Text>
          {assignments.length > 0 && (
            <Box mt="xs">
              {assignments.map((assignment, index) => (
                <Group key={`assignment-${assignment.userId}-${index}`} gap="xs">
                  <Text
                    size="sm"
                    c={assignment.canEdit ? 'green' : 'red'}
                    fw={assignment.userId === loggedInUserId ? 700 : 400}
                  >
                    {assignment.userName} {assignment.userId === loggedInUserId && '(You)'}
                  </Text>
                  <Text size="xs" c={assignment.canEdit ? 'green' : 'red'}>
                    ({assignment.canEdit ? 'Can Edit' : 'Read Only'})
                  </Text>
                </Group>
              ))}
            </Box>
          )}
          <Text size="sm" c={canEdit ? 'green' : 'red'} mt="xs">
            You can {canEdit ? '' : 'not'} edit or delete this todo
          </Text>
        </Box>
        <Group gap="sm">
          {assignedAvatars.map((avatar) => (
            <Avatar
              key={`avatar-${avatar.key}`}
              src={avatar.src}
              alt="User Avatar"
              radius="xl"
              size={40}
              style={{
                border: `2px solid ${
                  assignments.find((a) => a.userId === avatar.key)?.canEdit ? '#28a745' : '#dc3545'
                }`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
          ))}
          <Button
            variant="subtle"
            size="sm"
            color="gray.6"
            leftSection={<IconEdit size={20} />}
            onClick={() => setShowEditModal(true)}
            disabled={!canEdit}
          />
          <Button
            variant="subtle"
            size="sm"
            color="gray.6"
            leftSection={<IconProgressCheck size={20} />}
            onClick={handleStatusClick}
            disabled={!canEdit}
          />
          <Button
            variant="subtle"
            size="sm"
            color="gray.6"
            leftSection={<IconMessageCircle size={20} />}
            onClick={() => setShowCommentModal(true)}
          />
          <Button
            variant="subtle"
            size="sm"
            color="gray.6"
            leftSection={<IconTrash size={20} />}
            onClick={handleDelete}
            disabled={!canEdit}
          />
        </Group>
      </Group>

      {showAssignDropdown && (
        <Box mt="md" p="sm" bg="#F5F5F5" style={{ borderRadius: '8px', border: '1px solid #E0E0E0' }}>
          <Select
            data={users.map((user) => ({
              value: user.id.toString(),
              label: user.userName,
            }))}
            value={selectedUserId}
            onChange={handleUserSelection}
            placeholder="Select a user to assign"
            searchable
            clearable
          />
          {userAssignments.length > 0 && (
            <Box mt="sm">
              {userAssignments.map((assignment, index) => (
                <Group
                  key={`user-assignment-${assignment.userId}-${index}`}
                  justify="space-between"
                  p="xs"
                  bg="#FAFAFA"
                  mt="xs"
                  style={{ borderRadius: '6px' }}
                >
                  <Text c="gray.8">{assignment.userName}</Text>
                  <Checkbox
                    label="Can Edit"
                    checked={assignment.canEdit}
                    onChange={(event) =>
                      handleCanEditChange(assignment.userId, event.currentTarget.checked)
                    }
                    color="blue"
                  />
                </Group>
              ))}
              <Button
                fullWidth
                mt="md"
                onClick={handleUserAssign}
                disabled={loading}
                color="blue"
                variant="filled"
              >
                Assign Users
              </Button>
            </Box>
          )}
        </Box>
      )}

      {showStatusDropdown && (
        <Box mt="md" p="sm" bg="#F5F5F5" style={{ borderRadius: '8px', border: '1px solid #E0E0E0' }}>
          <Select
            data={statuses.map((status) => ({
              value: status.id.toString(),
              label: status.statusName,
            }))}
            value={selectedStatusId}
            onChange={(value) => setSelectedStatusId(value)}
            placeholder="Select a status"
            searchable
            clearable
          />
          <Button
            fullWidth
            mt="md"
            onClick={handleStatusUpdate}
            disabled={loading || !selectedStatusId}
            color="blue"
            variant="filled"
          >
            Update Status
          </Button>
        </Box>
      )}

      <EditTodoCardModal
        opened={showEditModal}
        onClose={() => setShowEditModal(false)}
        id={id}
        taskName={taskName}
        taskDescription={taskDescription}
        statusName={statusName}
        assignments={assignments}
        userId={userId}
        loggedInUserId={loggedInUserId}
        todoListId={todoListId}
        updateStatus={updateStatus}
      />

      <CommentModal
        opened={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        todoId={id}
        loggedInUserId={loggedInUserId}
        comments={localComments}
        webSocket={webSocket} 
      />
    </Paper>
  );
}