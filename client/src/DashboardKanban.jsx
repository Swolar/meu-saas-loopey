import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, X, Edit2, Check, Trash2, Calendar, User } from 'lucide-react';
import { authFetch } from './config';

const DashboardKanban = ({ siteId, themeColor }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditingTitle, setIsEditingTitle] = useState(null); // { type: 'column'|'task', id: '...' }
  const [editValue, setEditValue] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [activeColumnAdd, setActiveColumnAdd] = useState(null);
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnData, setEditingColumnData] = useState({ title: '', color: '' });
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const addColumnRef = useRef(null);

  useEffect(() => {
    if (isAddingColumn && addColumnRef.current) {
        addColumnRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isAddingColumn]);

  useEffect(() => {
    fetchBoard();
  }, [siteId]);

  const fetchBoard = async () => {
    try {
      const res = await authFetch(`/api/sites/${siteId}/kanban`);
      if (res.ok) {
        const boardData = await res.json();
        setData(boardData);
        setError(null);
      } else {
        setError(`Erro ${res.status}: ${res.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load kanban board:', error);
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = async (newData) => {
    setData(newData); // Optimistic update
    try {
      await authFetch(`/api/sites/${siteId}/kanban`, {
        method: 'PUT',
        body: JSON.stringify(newData)
      });
    } catch (error) {
      console.error('Failed to save board:', error);
      // Revert? For now, we assume success or user refresh.
    }
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Moving Columns
    if (type === 'column') {
        const newColumnOrder = Array.from(data.columnOrder);
        newColumnOrder.splice(source.index, 1);
        newColumnOrder.splice(destination.index, 0, draggableId);

        const newData = { ...data, columnOrder: newColumnOrder };
        saveBoard(newData);
        return;
    }

    // Moving Tasks
    const start = data.columns[source.droppableId];
    const finish = data.columns[destination.droppableId];

    // Moving within same column
    if (start === finish) {
        const newTaskIds = Array.from(start.taskIds);
        newTaskIds.splice(source.index, 1);
        newTaskIds.splice(destination.index, 0, draggableId);

        const newColumn = { ...start, taskIds: newTaskIds };
        const newData = {
            ...data,
            columns: { ...data.columns, [newColumn.id]: newColumn }
        };
        saveBoard(newData);
        return;
    }

    // Moving from one column to another
    const startTaskIds = Array.from(start.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...start, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finish.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finish, taskIds: finishTaskIds };

    const newData = {
        ...data,
        columns: {
            ...data.columns,
            [newStart.id]: newStart,
            [newFinish.id]: newFinish
        }
    };
    saveBoard(newData);
  };

  const addTask = (columnId) => {
      if (!newTaskContent.trim()) return;
      
      const newTaskId = `task-${Date.now()}`;
      const newTask = { id: newTaskId, content: newTaskContent, createdAt: new Date().toISOString() };
      
      const newData = {
          ...data,
          tasks: { ...data.tasks, [newTaskId]: newTask },
          columns: {
              ...data.columns,
              [columnId]: {
                  ...data.columns[columnId],
                  taskIds: [...data.columns[columnId].taskIds, newTaskId]
              }
          }
      };
      
      saveBoard(newData);
      setNewTaskContent('');
      setActiveColumnAdd(null);
  };

  const deleteTask = (taskId, columnId) => {
      const newTasks = { ...data.tasks };
      delete newTasks[taskId];

      const newColumnTaskIds = data.columns[columnId].taskIds.filter(id => id !== taskId);

      const newData = {
          ...data,
          tasks: newTasks,
          columns: {
              ...data.columns,
              [columnId]: { ...data.columns[columnId], taskIds: newColumnTaskIds }
          }
      };
      saveBoard(newData);
  };

  const updateTaskContent = (taskId, newContent) => {
      const newData = {
          ...data,
          tasks: {
              ...data.tasks,
              [taskId]: { ...data.tasks[taskId], content: newContent }
          }
      };
      saveBoard(newData);
      setIsEditingTitle(null);
  };

  const confirmAddColumn = () => {
      if (!newColumnTitle.trim()) return;
      
      const newColumnId = `col-${Date.now()}`;
      const newColumn = { id: newColumnId, title: newColumnTitle, taskIds: [] };
      
      const newData = {
          ...data,
          columns: { ...data.columns, [newColumnId]: newColumn },
          columnOrder: [...data.columnOrder, newColumnId]
      };
      saveBoard(newData);
      setNewColumnTitle('');
      setIsAddingColumn(false);
  };

  const deleteColumn = (columnId) => {
      if (!confirm("Tem certeza que deseja excluir esta lista e todos os cartões nela?")) return;
      
      const newColumnOrder = data.columnOrder.filter(id => id !== columnId);
      const newColumns = { ...data.columns };
      const taskIdsToDelete = newColumns[columnId].taskIds;
      delete newColumns[columnId];

      const newTasks = { ...data.tasks };
      taskIdsToDelete.forEach(id => delete newTasks[id]);

      const newData = {
          ...data,
          columnOrder: newColumnOrder,
          columns: newColumns,
          tasks: newTasks
      };
      saveBoard(newData);
  };

  const startEditingColumn = (column) => {
    setEditingColumnId(column.id);
    setEditingColumnData({ 
        title: column.title, 
        color: column.color || 'transparent' 
    });
  };

  const saveColumnEdit = () => {
    if (!editingColumnId || !editingColumnData.title.trim()) return;

    const newData = {
        ...data,
        columns: {
            ...data.columns,
            [editingColumnId]: {
                ...data.columns[editingColumnId],
                title: editingColumnData.title,
                color: editingColumnData.color
            }
        }
    };
    saveBoard(newData);
    setEditingColumnId(null);
  };

  if (loading) return <div style={{ padding: '2rem', color: 'white' }}>Carregando quadro...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Erro ao carregar quadro: {error}</div>;
  if (!data) return <div style={{ padding: '2rem', color: 'white' }}>Quadro não encontrado.</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
            padding: '1rem 2rem', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Organização Diária</h2>
            <button 
                onClick={() => setIsAddingColumn(true)}
                style={{
                    background: themeColor,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 1rem',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}
            >
                <Plus size={18} /> Nova Lista
            </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{
                            display: 'flex',
                            overflowX: 'auto',
                            padding: '2rem',
                            height: '100%',
                            alignItems: 'flex-start',
                            gap: '1.5rem'
                        }}
                    >
                        {data.columnOrder.map((columnId, index) => {
                            const column = data.columns[columnId];
                            const tasks = column.taskIds.map(taskId => data.tasks[taskId]);

                            return (
                                <Draggable key={column.id} draggableId={column.id} index={index}>
                                    {(provided) => (
                                        <div
                                            {...provided.draggableProps}
                                            ref={provided.innerRef}
                                            style={{
                                                background: '#1e293b',
                                                borderRadius: '12px',
                                                width: '300px',
                                                minWidth: '300px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                maxHeight: '100%',
                                                border: '1px solid rgba(255,255,255,0.05)',
                                                ...provided.draggableProps.style
                                            }}
                                        >
                                            <div 
                                                {...provided.dragHandleProps}
                                                style={{
                                                    padding: '1rem',
                                                    fontWeight: '600',
                                                    color: 'white',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    background: column.color && column.color !== 'transparent' ? column.color : 'transparent',
                                                    borderTopLeftRadius: '12px',
                                                    borderTopRightRadius: '12px'
                                                }}
                                            >
                                                {editingColumnId === column.id ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                                        <input 
                                                            autoFocus
                                                            value={editingColumnData.title}
                                                            onChange={(e) => setEditingColumnData({...editingColumnData, title: e.target.value})}
                                                            onKeyDown={(e) => e.key === 'Enter' && saveColumnEdit()}
                                                            style={{
                                                                background: 'rgba(0,0,0,0.2)',
                                                                border: '1px solid rgba(255,255,255,0.2)',
                                                                borderRadius: '4px',
                                                                color: 'white',
                                                                padding: '0.25rem 0.5rem',
                                                                width: '100%'
                                                            }}
                                                        />
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <input 
                                                                type="color"
                                                                value={editingColumnData.color === 'transparent' ? '#1e293b' : editingColumnData.color}
                                                                onChange={(e) => setEditingColumnData({...editingColumnData, color: e.target.value})}
                                                                style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    padding: 0,
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    background: 'transparent'
                                                                }}
                                                            />
                                                            <button 
                                                                onClick={saveColumnEdit}
                                                                style={{
                                                                    padding: '0.25rem 0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    background: '#10b981',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    color: 'white',
                                                                    cursor: 'pointer',
                                                                    marginLeft: 'auto',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => setEditingColumnId(null)}
                                                                style={{
                                                                    padding: '0.25rem 0.5rem',
                                                                    fontSize: '0.75rem',
                                                                    background: 'rgba(255,255,255,0.1)',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    color: 'white',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {column.title}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                             <Edit2 size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => startEditingColumn(column)} />
                                                             <Trash2 size={14} color="#64748b" style={{ cursor: 'pointer' }} onClick={() => deleteColumn(column.id)} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <Droppable droppableId={column.id} type="task">
                                                {(provided, snapshot) => (
                                                    <div
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        style={{
                                                            padding: '1rem',
                                                            flexGrow: 1,
                                                            minHeight: '100px',
                                                            overflowY: 'auto',
                                                            background: snapshot.isDraggingOver ? 'rgba(0,0,0,0.2)' : 'transparent',
                                                            transition: 'background 0.2s'
                                                        }}
                                                    >
                                                        {tasks.map((task, index) => (
                                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                                {(provided, snapshot) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        {...provided.dragHandleProps}
                                                                        style={{
                                                                            userSelect: 'none',
                                                                            padding: '1rem',
                                                                            margin: '0 0 0.75rem 0',
                                                                            background: '#334155',
                                                                            borderRadius: '8px',
                                                                            color: 'white',
                                                                            boxShadow: snapshot.isDragging ? '0 5px 15px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                                                                            border: '1px solid rgba(255,255,255,0.05)',
                                                                            ...provided.draggableProps.style
                                                                        }}
                                                                    >
                                                                        {isEditingTitle?.id === task.id ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                                <textarea
                                                                                    autoFocus
                                                                                    value={editValue}
                                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                                    style={{
                                                                                        width: '100%',
                                                                                        background: 'rgba(0,0,0,0.2)',
                                                                                        border: `1px solid ${themeColor}`,
                                                                                        borderRadius: '4px',
                                                                                        color: 'white',
                                                                                        padding: '0.5rem',
                                                                                        outline: 'none',
                                                                                        resize: 'none',
                                                                                        minHeight: '60px'
                                                                                    }}
                                                                                />
                                                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                                    <button 
                                                                                        onClick={() => updateTaskContent(task.id, editValue)}
                                                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#10b981', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                                                                                    >
                                                                                        Salvar
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => setIsEditingTitle(null)}
                                                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                                                                    >
                                                                                        Cancelar
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <div style={{ fontSize: '0.95rem', lineHeight: '1.4', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                                                                                    {task.content}
                                                                                </div>
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                                                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                                        {/* Placeholder for future tags/members */}
                                                                                     </div>
                                                                                     <div style={{ display: 'flex', gap: '0.5rem', opacity: 0.5 }}>
                                                                                        <Edit2 
                                                                                            size={14} 
                                                                                            style={{ cursor: 'pointer' }} 
                                                                                            onClick={() => {
                                                                                                setIsEditingTitle({ type: 'task', id: task.id });
                                                                                                setEditValue(task.content);
                                                                                            }} 
                                                                                        />
                                                                                        <Trash2 
                                                                                            size={14} 
                                                                                            style={{ cursor: 'pointer' }} 
                                                                                            onClick={() => deleteTask(task.id, column.id)} 
                                                                                        />
                                                                                     </div>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {provided.placeholder}
                                                        
                                                        {activeColumnAdd === column.id ? (
                                                            <div style={{ background: '#334155', borderRadius: '8px', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                                <textarea
                                                                    autoFocus
                                                                    placeholder="Digite o título do cartão..."
                                                                    value={newTaskContent}
                                                                    onChange={(e) => setNewTaskContent(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            addTask(column.id);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        background: 'rgba(0,0,0,0.2)',
                                                                        border: 'none',
                                                                        color: 'white',
                                                                        padding: '0.5rem',
                                                                        outline: 'none',
                                                                        resize: 'none',
                                                                        borderRadius: '4px',
                                                                        minHeight: '60px',
                                                                        marginBottom: '0.5rem'
                                                                    }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                    <button 
                                                                        onClick={() => addTask(column.id)}
                                                                        style={{
                                                                            background: themeColor,
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '0.4rem 0.8rem',
                                                                            fontSize: '0.85rem',
                                                                            cursor: 'pointer',
                                                                            fontWeight: '500'
                                                                        }}
                                                                    >
                                                                        Adicionar Cartão
                                                                    </button>
                                                                    <X 
                                                                        size={20} 
                                                                        style={{ cursor: 'pointer', color: '#94a3b8' }} 
                                                                        onClick={() => {
                                                                            setActiveColumnAdd(null);
                                                                            setNewTaskContent('');
                                                                        }} 
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setActiveColumnAdd(column.id)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.75rem',
                                                                    background: 'transparent',
                                                                    border: '1px dashed rgba(255,255,255,0.1)',
                                                                    borderRadius: '8px',
                                                                    color: '#94a3b8',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.5rem',
                                                                    fontSize: '0.9rem',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
                                                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                            >
                                                                <Plus size={16} /> Adicionar um cartão
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    )}
                                </Draggable>
                            );
                        })}
                        {provided.placeholder}
                        
                        <div ref={addColumnRef} style={{ minWidth: '300px' }}>
                             {isAddingColumn ? (
                                 <div style={{
                                     background: '#1e293b',
                                     borderRadius: '12px',
                                     padding: '1rem',
                                     border: '1px solid rgba(255,255,255,0.1)',
                                     display: 'flex',
                                     flexDirection: 'column',
                                     gap: '0.5rem'
                                 }}>
                                     <input
                                         autoFocus
                                         placeholder="Título da lista..."
                                         value={newColumnTitle}
                                         onChange={(e) => setNewColumnTitle(e.target.value)}
                                         onKeyDown={(e) => e.key === 'Enter' && confirmAddColumn()}
                                         style={{
                                             padding: '0.5rem',
                                             borderRadius: '4px',
                                             border: '1px solid rgba(255,255,255,0.2)',
                                             background: 'rgba(0,0,0,0.2)',
                                             color: 'white',
                                             outline: 'none'
                                         }}
                                     />
                                     <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                         <button 
                                            onClick={confirmAddColumn} 
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '0.9rem'
                                            }}
                                         >
                                            Adicionar Lista
                                         </button>
                                         <X 
                                            size={24} 
                                            onClick={() => setIsAddingColumn(false)} 
                                            style={{cursor: 'pointer', color: '#94a3b8'}} 
                                         />
                                     </div>
                                 </div>
                             ) : (
                                 <button
                                    onClick={() => setIsAddingColumn(true)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '1rem',
                                        fontWeight: '500'
                                    }}
                                 >
                                    <Plus size={20} /> Adicionar outra lista
                                 </button>
                             )}
                        </div>
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    </div>
  );
};

export default DashboardKanban;