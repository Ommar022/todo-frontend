'use client';

import { useState, useEffect } from 'react';
import { Modal, Stack, Text, Button, Group, ScrollArea, Divider } from '@mantine/core';
import EditTodoCardModal from './EditTodoCardModal';
import { NotificationData, NotificationModalProps } from '../ApiController/TodoList';

export default function NotificationModal({ loggedInUserId, notifications, updateTodoInLists }: NotificationModalProps) {
  const [localNotifications, setLocalNotifications] = useState<NotificationData[]>([]);
  const [dismissedTodoIds, setDismissedTodoIds] = useState<number[]>([]);
  const [selectedTodo, setSelectedTodo] = useState<NotificationData | null>(null);
  const [editModalOpened, setEditModalOpened] = useState(false);

  useEffect(() => {
    if (notifications.length > 0) {
      setLocalNotifications((prev) => {
        const newNotifications = notifications
          .filter(
            (newNotif) =>
              !prev.some((existing) => existing.TodoId === newNotif.TodoId) &&
              !dismissedTodoIds.includes(newNotif.TodoId)
          );
        console.log('New notifications to prepend:', newNotifications);
        return [...newNotifications, ...prev];
      });
    }
  }, [notifications, dismissedTodoIds]);

  const handleViewTodo = (notification: NotificationData) => {
    setSelectedTodo(notification);
    setEditModalOpened(true);
  };

  const handleCloseNotification = (todoId: number) => {
    setLocalNotifications((prev) => prev.filter((n) => n.TodoId !== todoId));
    setDismissedTodoIds((prev) => [...prev, todoId]);
    console.log('Dismissed Todo ID:', todoId);
  };

  const handleDismissAll = () => {
    const allTodoIds = localNotifications.map((n) => n.TodoId);
    setLocalNotifications([]);
    setDismissedTodoIds((prev) => [...prev, ...allTodoIds]);
    console.log('Dismissed all Todo IDs:', allTodoIds);
  };

  if (loggedInUserId === 0 || localNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <Modal
        opened={localNotifications.length > 0}
        onClose={handleDismissAll}
        title={<Text size="lg" fw={600} c="black">New Todo Assignments</Text>}
        styles={{
          header: { backgroundColor: '#F5F5F5', borderBottom: '1px solid #E0E0E0' },
          body: { backgroundColor: '#FFFFFF', padding: '20px' },
        }}
        size="md"
        zIndex={1001}
      >
        <Stack>
          <ScrollArea h={300} scrollbarSize={6}>
            {localNotifications.map((notification, index) => (
              <Stack key={notification.TodoId} gap="sm" pb="sm">
                <Group justify="space-between" align="center">
                  <Text c="black">
                    Assigned to: <strong>{notification.TaskName}</strong>
                  </Text>
                  <Group gap="xs">
                    <Button
                      size="xs"
                      onClick={() => handleViewTodo(notification)}
                      color="pink"
                      variant="filled"
                      styles={{ root: { borderRadius: '8px' } }}
                    >
                      View
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      onClick={() => handleCloseNotification(notification.TodoId)}
                      styles={{ root: { '&:hover': { color: '#FF4081' } } }}
                    >
                      Dismiss
                    </Button>
                  </Group>
                </Group>
                {index < localNotifications.length - 1 && <Divider />}
              </Stack>
            ))}
          </ScrollArea>
          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              color="gray"
              onClick={handleDismissAll}
              styles={{ root: { '&:hover': { color: '#FF4081' } } }}
            >
              Dismiss All
            </Button>
          </Group>
        </Stack>
      </Modal>

      {selectedTodo && (
        <EditTodoCardModal
          opened={editModalOpened}
          onClose={() => setEditModalOpened(false)}
          id={selectedTodo.TodoId}
          taskName={selectedTodo.TaskName}
          taskDescription={selectedTodo.TaskDescription}
          statusName={selectedTodo.StatusName}
          assignments={[
            {
              userId: selectedTodo.Assignment.UserId,
              canEdit: selectedTodo.Assignment.CanEdit,
              assignedAt: selectedTodo.Assignment.AssignedAt,
            },
          ]}
          userId={selectedTodo.Creator.UserId}
          loggedInUserId={loggedInUserId}
          todoListId={selectedTodo.TodoListId}
          updateStatus={(id, statusId, statusName) => {
            console.log(`Status updated for todo ${id}: ${statusName}`);
            updateTodoInLists(id, { statusId, statusName });
          }}
        />
      )}
    </>
  );
}