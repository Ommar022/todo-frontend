'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Text,
  Stack,
  Paper,
  Title,
  ScrollArea,
  Button,
  Group,
  ActionIcon,
} from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { TodoList, TodoListAssignment, TodoListComponentProps } from '../ApiController/TodoList';
import AddTodoListModal from './AddTodoListModal';
import EditTodoListModal from './EditTodoListModal';

interface ExtendedTodoListComponentProps extends TodoListComponentProps {
  loggedInUserId: number | null;
}

export default function TodoListComponent({
  onSelect,
  todoLists,
  onAddTodoList,
  onUpdateTodoList,
  onDeleteTodoList,
  loggedInUserId,
}: ExtendedTodoListComponentProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editList, setEditList] = useState<TodoList | null>(null);

  useEffect(() => {
    if (todoLists.length > 0 && !selectedId) {
      setSelectedId(todoLists[0].id);
      onSelect(todoLists[0].id);
    }
  }, [todoLists, onSelect, selectedId]);

  const handleSelect = (id: number) => {
    setSelectedId(id);
    onSelect(id);
  };

  const handleAddTodoList = (newList: TodoList) => {
    onAddTodoList(newList);
    setSelectedId(newList.id);
    onSelect(newList.id);
    setAddModalOpened(false);
  };

  const handleEditTodoList = (
    id: number,
    listName: string,
    assignments: TodoListAssignment[]
  ) => {
    onUpdateTodoList(id, listName, assignments);
    setEditModalOpened(false);
  };

  const handleDeleteTodoList = (id: number) => {
    onDeleteTodoList(id);
    if (selectedId === id) {
      const nextList = todoLists.find((list) => list.id !== id);
      if (nextList) {
        setSelectedId(nextList.id);
        onSelect(nextList.id);
      } else {
        setSelectedId(null);
      }
    }
  };

  const openEditModal = (list: TodoList) => {
    setEditList(list);
    setEditModalOpened(true);
  };

  const canEditOrDelete = (list: TodoList): boolean => {
    if (!loggedInUserId) return false;
    return (
      list.userId === loggedInUserId ||
      list.assignments.some(
        (assignment) => assignment.userId === loggedInUserId && assignment.canEdit
      )
    );
  };

  return (
    <Box w={250} h="100vh" p="md" style={{ borderRight: '1px solid #ddd' }}>
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>ToDo Lists</Title>
        <Button
          color="#FF991F"
          size="xs"
          onClick={() => setAddModalOpened(true)}
        >
          Add List
        </Button>
      </Group>
      <ScrollArea h="calc(100vh - 80px)">
        <Stack gap="sm">
          {todoLists.map((list) => (
            <Paper
              key={list.id}
              p="sm"
              shadow={selectedId === list.id ? 'md' : 'xs'}
              onClick={() => handleSelect(list.id)} 
              style={{
                cursor: 'pointer',
                backgroundColor: selectedId === list.id ? '#f0f0f0' : 'white',
              }}
            >
              <Group justify="space-between" align="center">
                <Text>{list.listName}</Text>
                {canEditOrDelete(list) && (
                  <Group 
                    gap="xs"
                    onClick={(e) => e.stopPropagation()} 
                  >
                    <ActionIcon
                      size="sm"
                      onClick={() => openEditModal(list)}
                      variant="subtle"
                      color="gray"
                    >
                      <IconPencil />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      onClick={() => handleDeleteTodoList(list.id)}
                      variant="subtle"
                      color="red"
                    >
                      <IconTrash />
                    </ActionIcon>
                  </Group>
                )}
              </Group>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>

      <AddTodoListModal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        onAdd={handleAddTodoList}
      />

      {editList && (
        <EditTodoListModal
          opened={editModalOpened}
          onClose={() => setEditModalOpened(false)}
          onUpdate={handleEditTodoList}
          listId={editList.id}
          initialListName={editList.listName}
          initialAssignments={editList.assignments}
        />
      )}
    </Box>
  );
}