

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Storyline, StoryEvent, EventConnection, Character, CharacterRelationship, EventType, Script, ScriptData, RelationshipDirection, CharacterGroup } from '../types';
import Modal from './Modal';
import { SparklesIcon, PlusIcon, PencilIcon, TrashIcon, WarningIcon, ChevronDownIcon, SettingsIcon, GrabberIcon } from './Icons';
import VirtualizedList from './VirtualizedList';
import Checkbox from './Checkbox';

interface SidebarProps {
  scripts: Script[];
  activeScript: Script | undefined;
  setActiveScriptId: (id: string | null) => void;
  onCreateScript: (name: string) => void;
  onDeleteScript: (id: string) => void;
  data: ScriptData | undefined;
  setters: {
    setStorylines: React.Dispatch<React.SetStateAction<Storyline[]>>;
    setEventTypes: React.Dispatch<React.SetStateAction<EventType[]>>;
    setEvents: React.Dispatch<React.SetStateAction<StoryEvent[]>>;
    setEventConnections: React.Dispatch<React.SetStateAction<EventConnection[]>>;
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    setCharacterRelationships: React.Dispatch<React.SetStateAction<CharacterRelationship[]>>;
    setCharacterGroups: React.Dispatch<React.SetStateAction<CharacterGroup[]>>;
    setEraOrder: React.Dispatch<React.SetStateAction<string[]>>;
  };
  handleOpenEventModal: (event?: Partial<StoryEvent>) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ scripts, activeScript, setActiveScriptId, onCreateScript, onDeleteScript, data, setters, handleOpenEventModal, onOpenSettings }) => {
  const [editingStoryline, setEditingStoryline] = useState<Storyline | undefined>(undefined);
  const [isStorylineModalOpen, setIsStorylineModalOpen] = useState(false);

  const [editingEventType, setEditingEventType] = useState<EventType | undefined>(undefined);
  const [isEventTypeModalOpen, setIsEventTypeModalOpen] = useState(false);

  const [editingCharacter, setEditingCharacter] = useState<Character | undefined>(undefined);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  
  const [editingGroup, setEditingGroup] = useState<CharacterGroup | undefined>(undefined);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const [isRelationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [isConnectionModalOpen, setConnectionModalOpen] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ onConfirm: () => void; message: string; title: string; confirmText: string; } | null>(null);

  const [isNewScriptModalOpen, setIsNewScriptModalOpen] = useState(false);
  const [isEraModalOpen, setIsEraModalOpen] = useState(false);
  const [editingEra, setEditingEra] = useState<{ name: string, index: number } | undefined>(undefined);

  const openModal = (setter: React.Dispatch<React.SetStateAction<boolean>>, editingSetter?: React.Dispatch<React.SetStateAction<any>>, item?: any) => {
    editingSetter?.(item);
    setter(true);
  };

  const closeModal = (setter: React.Dispatch<React.SetStateAction<boolean>>, editingSetter?: React.Dispatch<React.SetStateAction<any>>) => {
    editingSetter?.(undefined);
    setter(false);
  };

  const requestConfirmation = (onConfirm: () => void, title: string, message: string, confirmText: string = "确认删除") => {
    setConfirmAction({ onConfirm, title, message, confirmText });
    setIsConfirmModalOpen(true);
  };

  const handleConfirm = () => {
    if (confirmAction) {
        confirmAction.onConfirm();
    }
    setIsConfirmModalOpen(false);
    setConfirmAction(null);
  };
  
  const handleDeleteStoryline = (storylineId: string) => {
    setters.setStorylines(prev => prev.filter(s => s.id !== storylineId));
    setters.setEvents(prev => prev.map(e => (e.storylineId === storylineId ? { ...e, storylineId: null } : e)));
  };

  const handleDeleteEventType = (typeId: string) => {
    setters.setEventTypes(prev => prev.filter(et => et.id !== typeId));
    setters.setEvents(prev => prev.map(e => (e.typeId === typeId ? { ...e, typeId: null } : e)));
  };

  const handleDeleteCharacter = (characterId: string) => {
      setters.setCharacters(prev => prev.filter(c => c.id !== characterId));
      setters.setCharacterRelationships(prev => prev.filter(r => r.fromCharacterId !== characterId && r.toCharacterId !== characterId));
      setters.setCharacterGroups(prev => prev.map(g => ({ ...g, characterIds: g.characterIds.filter(id => id !== characterId) })));
      setters.setEvents(prev => prev.map(e => ({
          ...e,
          charactersInvolved: e.charactersInvolved.filter(cid => cid !== characterId)
      })));
  };
  
  const handleDeleteGroup = (groupId: string) => {
    setters.setCharacterGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleDeleteEvent = (eventId: string) => {
      setters.setEvents(prev => prev.filter(e => e.id !== eventId));
      setters.setEventConnections(prev => prev.filter(c => c.fromEventId !== eventId && c.toEventId !== eventId));
  };
  
  const handleDeleteEra = (index: number) => {
    setters.setEraOrder(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteScriptRequest = () => {
    if (!activeScript) return;
    requestConfirmation(
      () => onDeleteScript(activeScript.id),
      '删除剧本',
      `您确定要永久删除剧本 “${activeScript.name}” 吗？此操作无法撤销。`
    );
  };

  if (!data) {
    return (
       <aside className="w-80 h-full bg-gray-800 p-4 flex flex-col flex-shrink-0 border-r border-gray-700">
        <ScriptManagerDropdown
          scripts={scripts}
          activeScript={activeScript}
          setActiveScriptId={id => setActiveScriptId(id)}
          onNewScript={() => setIsNewScriptModalOpen(true)}
          onDeleteScript={handleDeleteScriptRequest}
        />
        <div className="flex-grow flex items-center justify-center text-center text-gray-400">
          <p>请选择或创建一个剧本以开始。</p>
        </div>
         {isNewScriptModalOpen && <NewScriptModal onCreate={onCreateScript} onClose={() => setIsNewScriptModalOpen(false)}/>}
        <footer className="flex-shrink-0 pt-2 mt-2 border-t border-gray-700 flex items-center justify-end">
          <button 
            onClick={onOpenSettings}
            className="p-1 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="打开设置"
          >
              <SettingsIcon />
          </button>
        </footer>
      </aside>
    );
  }


  return (
    <aside className="w-80 h-full bg-gray-800 p-4 flex flex-col flex-shrink-0 border-r border-gray-700">
      <ScriptManagerDropdown
        scripts={scripts}
        activeScript={activeScript}
        setActiveScriptId={id => setActiveScriptId(id)}
        onNewScript={() => setIsNewScriptModalOpen(true)}
        onDeleteScript={handleDeleteScriptRequest}
      />
      
      <div className="flex-grow overflow-y-auto">
        <ExpandableSection title="纪元管理" onAdd={() => openModal(setIsEraModalOpen, setEditingEra)} defaultOpen={false}>
          <EraManager eras={data.eraOrder} setEras={setters.setEraOrder} onEdit={(name, index) => setEditingEra({name, index})} openModal={() => setIsEraModalOpen(true)} onDelete={handleDeleteEra} />
        </ExpandableSection>

        <ExpandableSection title="故事线" onAdd={() => openModal(setIsStorylineModalOpen, setEditingStoryline)} defaultOpen={false}>
          {data.storylines.map(s => (
              <ItemRow key={s.id} onEdit={() => openModal(setIsStorylineModalOpen, setEditingStoryline, s)} onDelete={() => requestConfirmation(() => handleDeleteStoryline(s.id), '确认删除', '您确定要删除这个故事线吗？相关的事件将不再属于任何故事线。')}>
                  <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: s.color }}></div>
                  <span className="font-medium truncate">{s.name}</span>
              </ItemRow>
          ))}
        </ExpandableSection>
        
        <ExpandableSection title="事件类型" onAdd={() => openModal(setIsEventTypeModalOpen, setEditingEventType)} defaultOpen={false}>
          {data.eventTypes.map(et => (
              <ItemRow key={et.id} onEdit={() => openModal(setIsEventTypeModalOpen, setEditingEventType, et)} onDelete={() => requestConfirmation(() => handleDeleteEventType(et.id), '确认删除', '您确定要删除这个事件类型吗？相关的事件将不再有任何类型。')}>
                  <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: et.color }}></div>
                  <span className="font-medium truncate">{et.name}</span>
              </ItemRow>
          ))}
        </ExpandableSection>

        <ExpandableSection title="人物" onAdd={() => openModal(setIsCharacterModalOpen, setEditingCharacter)}>
          {data.characters.map(c => (
              <ItemRow key={c.id} onEdit={() => openModal(setIsCharacterModalOpen, setEditingCharacter, c)} onDelete={() => requestConfirmation(() => handleDeleteCharacter(c.id), '确认删除', '您确定要删除这个人物吗？这会从事件和群组中移除该人物并删除所有相关的人物关系。')}>
                  <span className="font-medium truncate">{c.name}</span>
              </ItemRow>
          ))}
        </ExpandableSection>

        <ExpandableSection title="人物群组" onAdd={() => openModal(setIsGroupModalOpen, setEditingGroup)} defaultOpen={false}>
          {(data.characterGroups || []).map(g => (
            <ItemRow key={g.id} onEdit={() => openModal(setIsGroupModalOpen, setEditingGroup, g)} onDelete={() => requestConfirmation(() => handleDeleteGroup(g.id), '确认删除', `您确定要删除群组 “${g.name}” 吗？`)}>
                <div className="w-3 h-3 rounded-sm mr-2 flex-shrink-0" style={{ backgroundColor: g.color }}></div>
                <span className="font-medium truncate">{g.name}</span>
            </ItemRow>
          ))}
        </ExpandableSection>
        
        <ExpandableSection title="事件" onAdd={() => handleOpenEventModal({})}>
          {/* FIX: Explicitly specify the generic type for VirtualizedList to ensure correct type inference for 'e' in renderItem. */}
          <VirtualizedList<StoryEvent>
              items={data.events}
              itemHeight={40}
              containerHeight={Math.min(data.events.length * 40, 400)}
              renderItem={(e, style) => {
                  const isOrphaned = !e.storylineId || !e.typeId;
                  const tooltipParts: string[] = [];
                  if (!e.storylineId) tooltipParts.push('缺少故事线');
                  if (!e.typeId) tooltipParts.push('缺少事件类型');
                  const tooltipText = isOrphaned ? `数据不完整: ${tooltipParts.join('，')}` : '';

                  return (
                      <div style={style} key={e.id}>
                          <ItemRow onEdit={() => handleOpenEventModal(e)} onDelete={() => requestConfirmation(() => handleDeleteEvent(e.id), '确认删除', '您确定要删除这个事件吗？这也会删除所有与该事件的关联。')} tooltipText={tooltipText}>
                              <div className="flex items-center min-w-0">
                                  {isOrphaned && <WarningIcon className="text-yellow-400 mr-2 flex-shrink-0" />}
                                  <span className="font-medium truncate">{e.title}</span>
                              </div>
                          </ItemRow>
                      </div>
                  );
              }}
          />
        </ExpandableSection>

        <div className="mt-4">
          <button onClick={() => setRelationshipModalOpen(true)} className="w-full text-left flex items-center p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors mb-2">
              <PlusIcon className="h-5 w-5"/><span className="ml-1">添加人物关系</span>
          </button>
          <button onClick={() => setConnectionModalOpen(true)} className="w-full text-left flex items-center p-2 rounded-md bg-teal-600 hover:bg-teal-700 transition-colors">
              <PlusIcon className="h-5 w-5"/><span className="ml-1">添加事件关联</span>
          </button>
        </div>
      </div>

      <footer className="flex-shrink-0 pt-2 mt-2 border-t border-gray-700 flex items-center justify-end">
          <button 
            onClick={onOpenSettings}
            className="p-1 text-gray-400 rounded-md hover:bg-gray-700 hover:text-white transition-colors"
            aria-label="打开设置"
          >
              <SettingsIcon />
          </button>
      </footer>

      {isStorylineModalOpen && <StorylineFormModal onClose={() => closeModal(setIsStorylineModalOpen, setEditingStoryline)} setStorylines={setters.setStorylines} storylineToEdit={editingStoryline} />}
      {isEventTypeModalOpen && <EventTypeFormModal onClose={() => closeModal(setIsEventTypeModalOpen, setEditingEventType)} setEventTypes={setters.setEventTypes} eventTypeToEdit={editingEventType} />}
      {isEraModalOpen && <EraFormModal onClose={() => closeModal(setIsEraModalOpen, setEditingEra)} setEras={setters.setEraOrder} eraToEdit={editingEra} />}
      {isCharacterModalOpen && <CharacterFormModal 
        onClose={() => closeModal(setIsCharacterModalOpen, setEditingCharacter)} 
        setCharacters={setters.setCharacters} 
        characterToEdit={editingCharacter}
        allCharacters={data.characters}
        relationships={data.characterRelationships}
        setCharacterRelationships={setters.setCharacterRelationships}
        allGroups={data.characterGroups}
        setCharacterGroups={setters.setCharacterGroups}
      />}
      {isGroupModalOpen && <CharacterGroupFormModal
        onClose={() => closeModal(setIsGroupModalOpen, setEditingGroup)}
        setCharacterGroups={setters.setCharacterGroups}
        groupToEdit={editingGroup}
        allCharacters={data.characters}
      />}
      {isRelationshipModalOpen && <RelationshipFormModal onClose={() => setRelationshipModalOpen(false)} data={data} setCharacterRelationships={setters.setCharacterRelationships} />}
      {isConnectionModalOpen && <ConnectionFormModal onClose={() => setConnectionModalOpen(false)} data={data} setEventConnections={setters.setEventConnections} />}
      {isNewScriptModalOpen && <NewScriptModal onCreate={onCreateScript} onClose={() => setIsNewScriptModalOpen(false)}/>}
      {confirmAction && (
        <ConfirmModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={handleConfirm}
          title={confirmAction.title}
          confirmText={confirmAction.confirmText}
        >
          <p>{confirmAction.message}</p>
        </ConfirmModal>
      )}
    </aside>
  );
};

const ScriptManagerDropdown: React.FC<{
  scripts: Script[];
  activeScript: Script | undefined;
  setActiveScriptId: (id: string) => void;
  onNewScript: () => void;
  onDeleteScript: () => void;
}> = ({ scripts, activeScript, setActiveScriptId, onNewScript, onDeleteScript }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setActiveScriptId(id);
    setIsOpen(false);
  };

  const handleCreate = () => {
    onNewScript();
    setIsOpen(false);
  };

  const handleDelete = () => {
    onDeleteScript();
    setIsOpen(false);
  };

  const canDelete = scripts.length > 1 && !!activeScript;

  return (
    <div className="relative mb-4" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg shadow-sm text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition-colors"
      >
        <div className="flex flex-col text-left min-w-0">
          <span className="text-xs text-gray-400">当前剧本</span>
          <span className="font-semibold truncate pr-2">{activeScript?.name || '未选择'}</span>
        </div>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-xl py-1">
          <div className="px-1 max-h-48 overflow-y-auto">
            {scripts.map(script => (
              <button
                key={script.id}
                onClick={() => handleSelect(script.id)}
                className={`w-full text-left flex items-center p-2 text-sm rounded-md ${
                  script.id === activeScript?.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-gray-200 hover:bg-gray-700'
                }`}
              >
                <span className="flex-grow truncate">{script.name}</span>
                {script.id === activeScript?.id && (
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                )}
              </button>
            ))}
          </div>
          <hr className="border-gray-700 my-1" />
          <div className="px-1">
            <button
              onClick={handleCreate}
              className="w-full text-left flex items-center p-2 text-sm rounded-md text-gray-200 hover:bg-gray-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              新建剧本...
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="w-full text-left flex items-center p-2 text-sm rounded-md text-gray-200 hover:bg-red-800 hover:text-white disabled:text-gray-500 disabled:hover:bg-gray-800 disabled:cursor-not-allowed"
            >
              <TrashIcon />
              <span className="ml-2">删除当前剧本...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


const NewScriptModal: React.FC<{onClose: () => void, onCreate: (name: string) => void}> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="创建新剧本">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">剧本名称</label>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white p-2" 
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">创建剧本</button>
        </div>
      </form>
    </Modal>
  );
};

const ItemRow: React.FC<{onEdit?:() => void, onDelete?: () => void, children: React.ReactNode, tooltipText?: string, isDraggable?: boolean, onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void, onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void, onDrop?: (e: React.DragEvent<HTMLDivElement>) => void, onDragEnd?: () => void, isDragTarget?: boolean}> = 
  ({onEdit, onDelete, children, tooltipText, isDraggable, onDragStart, onDragOver, onDrop, onDragEnd, isDragTarget}) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div 
            className="text-sm p-2 rounded-md bg-gray-700 mr-2 flex items-center justify-between group relative h-full"
            onMouseEnter={() => tooltipText && setIsHovered(true)}
            onMouseLeave={() => tooltipText && setIsHovered(false)}
            draggable={isDraggable}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
        >
            {isDragTarget && <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 z-10" />}
            <div className="flex items-center min-w-0">
                {isDraggable && <GrabberIcon className="text-gray-500 mr-2 cursor-grab" />}
                {children}
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && <button onClick={onEdit} className="p-1 text-gray-400 hover:text-white"><PencilIcon/></button>}
                {onDelete && <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon/></button>}
            </div>
            {isHovered && tooltipText && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg shadow-sm z-10 pointer-events-none">
                    {tooltipText}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-600"></div>
                </div>
            )}
        </div>
    );
};

const ExpandableSection: React.FC<{ title: string; onAdd: () => void; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, onAdd, children, defaultOpen }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen ?? true);
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <button onClick={() => setIsOpen(!isOpen)} className="text-md font-bold text-gray-300 hover:text-white flex items-center">
                    <svg className={`w-4 h-4 mr-2 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    {title}
                </button>
                <button onClick={onAdd} className="p-1 rounded-full text-gray-400 hover:bg-gray-600 hover:text-white transition-colors">
                    <PlusIcon className="h-5 w-5" />
                </button>
            </div>
            {isOpen && <div className="pl-2 border-l-2 border-gray-700 ml-2 flex flex-col gap-1">{children}</div>}
        </div>
    );
};

const EraManager: React.FC<{eras: string[], setEras: React.Dispatch<React.SetStateAction<string[]>>, onEdit: (name: string, index: number) => void, openModal: () => void, onDelete: (index: number) => void}> = 
  ({eras, setEras, onEdit, openModal, onDelete}) => {
  const [draggedEra, setDraggedEra] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, era: string) => {
    setDraggedEra(era);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if(draggedEra && index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (!draggedEra) return;

    setEras(currentEras => {
      const draggedIndex = currentEras.indexOf(draggedEra);
      if (draggedIndex === -1 || draggedIndex === dropIndex) return currentEras;
      
      const reordered = [...currentEras];
      const [item] = reordered.splice(draggedIndex, 1);
      reordered.splice(dropIndex, 0, item);
      return reordered;
    });
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedEra(null);
    setDragOverIndex(null);
  }

  const handleEditClick = (name: string, index: number) => {
    onEdit(name, index);
    openModal();
  };

  return (
    <div onDragLeave={() => setDragOverIndex(null)}>
      {eras.map((era, index) => (
        <ItemRow 
          key={era + index}
          isDraggable={true}
          onDragStart={(e) => handleDragStart(e, era)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          onEdit={() => handleEditClick(era, index)}
          onDelete={era !== '公元纪年' ? () => onDelete(index) : undefined}
          isDragTarget={dragOverIndex === index}
        >
          <span className={`font-medium truncate ${era === '公元纪年' ? 'text-indigo-400' : ''}`}>
            {era} {era === '公元纪年' && '(锚点)'}
          </span>
        </ItemRow>
      ))}
    </div>
  );
};

const EraFormModal: React.FC<{onClose: () => void, setEras: React.Dispatch<React.SetStateAction<string[]>>, eraToEdit?: { name: string, index: number }}> = ({ onClose, setEras, eraToEdit }) => {
  const [name, setName] = useState(eraToEdit?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!name.trim()) return;

    if(eraToEdit) {
      setEras(prev => prev.map((era, index) => index === eraToEdit.index ? name : era));
    } else {
      setEras(prev => [...prev, name]);
    }
    onClose();
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title={eraToEdit ? "编辑纪元" : "添加新纪元"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">纪元名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required autoFocus/>
           <p className="mt-2 text-xs text-gray-400">对于“第N代”这样的格式，请使用大写字母“N”作为数字的占位符。</p>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{eraToEdit ? "保存更改" : "添加纪元"}</button>
        </div>
      </form>
    </Modal>
  );
};

const StorylineFormModal: React.FC<{onClose: () => void; setStorylines: React.Dispatch<React.SetStateAction<Storyline[]>>; storylineToEdit?: Storyline}> = ({ onClose, setStorylines, storylineToEdit }) => {
  const [name, setName] = useState(storylineToEdit?.name || '');
  const [description, setDescription] = useState(storylineToEdit?.description || '');
  const [color, setColor] = useState(storylineToEdit?.color || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (storylineToEdit) {
        setStorylines(prev => prev.map(s => s.id === storylineToEdit.id ? {...storylineToEdit, name, description, color} : s));
    } else {
        const newStoryline: Storyline = { id: `sl-${Date.now()}`, name, description, color };
        setStorylines(prev => [...prev, newStoryline]);
    }
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={storylineToEdit ? "编辑故事线" : "添加新故事线"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white p-2" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-white p-2" rows={3}></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">颜色</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 block w-full h-10 bg-gray-700 border-gray-600 rounded-md shadow-sm"/>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{storylineToEdit ? "保存更改" : "添加故事线"}</button>
        </div>
      </form>
    </Modal>
  );
}

const EventTypeFormModal: React.FC<{onClose: () => void; setEventTypes: React.Dispatch<React.SetStateAction<EventType[]>>; eventTypeToEdit?: EventType}> = ({ onClose, setEventTypes, eventTypeToEdit }) => {
  const [name, setName] = useState(eventTypeToEdit?.name || '');
  const [color, setColor] = useState(eventTypeToEdit?.color || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventTypeToEdit) {
        setEventTypes(prev => prev.map(et => et.id === eventTypeToEdit.id ? {...eventTypeToEdit, name, color} : et));
    } else {
        const newEventType: EventType = { id: `et-${Date.now()}`, name, color };
        setEventTypes(prev => [...prev, newEventType]);
    }
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={eventTypeToEdit ? "编辑事件类型" : "添加新事件类型"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">颜色</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 block w-full h-10 bg-gray-700 border-gray-600 rounded-md shadow-sm"/>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{eventTypeToEdit ? "保存更改" : "添加类型"}</button>
        </div>
      </form>
    </Modal>
  );
}

const DirectionSelector: React.FC<{
    value: RelationshipDirection;
    onChange: (value: RelationshipDirection) => void;
    fromName: string;
    toName: string;
}> = ({ value, onChange, fromName, toName }) => {
    const baseStyle = "flex-1 px-2 py-1 text-xs rounded-md transition-colors focus:outline-none";
    const activeStyle = "bg-indigo-600 text-white font-semibold";
    const inactiveStyle = "bg-gray-800 hover:bg-gray-600 text-gray-300";

    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">方向</label>
            <div className="flex items-center space-x-1 p-1 bg-gray-900 rounded-lg">
                <button type="button" onClick={() => onChange('forward')} className={`${baseStyle} ${value === 'forward' ? activeStyle : inactiveStyle}`}>
                    <span className="truncate">{fromName}</span> &rarr; <span className="truncate">{toName}</span>
                </button>
                <button type="button" onClick={() => onChange('bidirectional')} className={`${baseStyle} ${value === 'bidirectional' ? activeStyle : inactiveStyle}`}>
                    <span className="truncate">{fromName}</span> &harr; <span className="truncate">{toName}</span>
                </button>
                <button type="button" onClick={() => onChange('backward')} className={`${baseStyle} ${value === 'backward' ? activeStyle : inactiveStyle}`}>
                    <span className="truncate">{fromName}</span> &larr; <span className="truncate">{toName}</span>
                </button>
            </div>
        </div>
    );
};

const CharacterFormModal: React.FC<{
  onClose: () => void;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setCharacterRelationships: React.Dispatch<React.SetStateAction<CharacterRelationship[]>>;
  setCharacterGroups: React.Dispatch<React.SetStateAction<CharacterGroup[]>>;
  characterToEdit?: Character;
  allCharacters: Character[];
  relationships: CharacterRelationship[];
  allGroups: CharacterGroup[];
}> = ({ onClose, setCharacters, setCharacterRelationships, setCharacterGroups, characterToEdit, allCharacters, relationships, allGroups }) => {
    const [name, setName] = useState(characterToEdit?.name || '');
    const [description, setDescription] = useState(characterToEdit?.description || '');
    const isEditing = !!characterToEdit;

    // --- Relationship logic ---
    const [editingRel, setEditingRel] = useState<{ id: string; type: string; direction: RelationshipDirection } | null>(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newRelTargetId, setNewRelTargetId] = useState<string>(() => 
        allCharacters.find(c => c.id !== characterToEdit?.id)?.id || ''
    );
    const [newRelType, setNewRelType] = useState('');
    const [newRelDirection, setNewRelDirection] = useState<RelationshipDirection>('bidirectional');

    const characterRelationships = useMemo(() => {
        if (!isEditing) return [];
        return relationships.filter(r => r.fromCharacterId === characterToEdit.id || r.toCharacterId === characterToEdit.id);
    }, [relationships, characterToEdit, isEditing]);

    const handleSaveCharacterInfo = () => {
        if(isEditing){
            setCharacters(prev => prev.map(c => c.id === characterToEdit.id ? {...characterToEdit, name, description} : c));
        }
    };

    const handleAddCharacter = () => {
        const newCharacter: Character = { id: `c-${Date.now()}`, name, description };
        setCharacters(prev => [...prev, newCharacter]);
        onClose();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing) {
            handleSaveCharacterInfo();
        } else {
            handleAddCharacter();
        }
    };

    const handleStartEditRel = (rel: CharacterRelationship) => {
        setEditingRel({ id: rel.id, type: rel.relationshipType, direction: rel.direction });
    };

    const handleCancelEditRel = () => {
        setEditingRel(null);
    };

    const handleSaveRel = () => {
        if (!editingRel) return;
        setCharacterRelationships(prev => prev.map(r => r.id === editingRel.id ? { ...r, relationshipType: editingRel.type, direction: editingRel.direction } : r));
        handleCancelEditRel();
    };
    
    const handleDeleteRel = (relId: string) => {
        setCharacterRelationships(prev => prev.filter(r => r.id !== relId));
    };

    const handleAddNewRel = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRelTargetId || !newRelType.trim()) return;

        const newRelationship: CharacterRelationship = {
            id: `cr-${Date.now()}`,
            fromCharacterId: characterToEdit!.id,
            toCharacterId: newRelTargetId,
            relationshipType: newRelType.trim(),
            direction: newRelDirection,
        };
        setCharacterRelationships(prev => [...prev, newRelationship]);

        // Reset form
        setShowAddForm(false);
        setNewRelType('');
        setNewRelDirection('bidirectional');
    };

    const getOtherCharacter = (rel: CharacterRelationship) => {
        const otherId = rel.fromCharacterId === characterToEdit!.id ? rel.toCharacterId : rel.fromCharacterId;
        return allCharacters.find(c => c.id === otherId);
    };

    const handleGroupToggle = (groupId: string) => {
        setCharacterGroups(prevGroups => 
            prevGroups.map(group => {
                if (group.id === groupId) {
                    const isMember = group.characterIds.includes(characterToEdit!.id);
                    const newCharacterIds = isMember 
                        ? group.characterIds.filter(id => id !== characterToEdit!.id)
                        : [...group.characterIds, characterToEdit!.id];
                    return { ...group, characterIds: newCharacterIds };
                }
                return group;
            })
        );
    };


    return (
        <Modal isOpen={true} onClose={onClose} title={isEditing ? `编辑: ${characterToEdit.name}` : "添加新人物"}>
            <div className="space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300">姓名</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">描述</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" rows={3}></textarea>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">{isEditing ? "保存人物信息" : "添加人物"}</button>
                    </div>
                </form>

                {isEditing && (
                    <>
                        {/* Groups Section */}
                        <div className="pt-4 border-t border-gray-700">
                            <h4 className="text-md font-semibold text-gray-200 mb-2">所属群组</h4>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {allGroups.length > 0 ? allGroups.map(group => (
                                    <div key={group.id} className="p-1 rounded-md hover:bg-gray-600">
                                        <Checkbox
                                            id={`sidebar-group-char-check-${characterToEdit.id}-${group.id}`}
                                            checked={group.characterIds.includes(characterToEdit.id)}
                                            onChange={() => handleGroupToggle(group.id)}
                                            label={
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-sm mr-2 flex-shrink-0" style={{ backgroundColor: group.color }}></div>
                                                    <span className="font-medium truncate">{group.name}</span>
                                                </div>
                                            }
                                        />
                                    </div>
                                )) : <p className="text-gray-400 text-sm">暂无群组。</p>}
                            </div>
                        </div>

                        {/* Relationships Section */}
                        <div className="pt-4 border-t border-gray-700">
                            <h4 className="text-md font-semibold text-gray-200 mb-2">人物关系 (1对1)</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {characterRelationships.length > 0 ? characterRelationships.map(rel => {
                                    const otherChar = getOtherCharacter(rel);
                                    if (!otherChar) return null;
                                    const isEditingThis = editingRel?.id === rel.id;
                                    
                                    return (
                                        <div key={rel.id} className="text-sm p-2 rounded-md bg-gray-700 flex flex-col items-center justify-between group">
                                            {isEditingThis ? (
                                                <div className="w-full space-y-2">
                                                    <input type="text" value={editingRel.type} onChange={e => setEditingRel(prev => prev ? {...prev, type: e.target.value} : null)} className="block w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white" autoFocus />
                                                    <DirectionSelector value={editingRel.direction} onChange={dir => setEditingRel(prev => prev ? {...prev, direction: dir} : null)} fromName={characterToEdit.name} toName={otherChar.name} />
                                                    <div className="flex items-center space-x-1 justify-end">
                                                        <button onClick={handleSaveRel} className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white">保存</button>
                                                        <button onClick={handleCancelEditRel} className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-400 rounded text-white">取消</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex items-center space-x-2 truncate">
                                                        <span className="font-semibold text-white">{rel.relationshipType}</span>
                                                        <span className="text-gray-400">
                                                          {rel.fromCharacterId === characterToEdit.id && rel.direction === 'forward' && '→'}
                                                          {rel.fromCharacterId === characterToEdit.id && rel.direction === 'backward' && '←'}
                                                          {rel.toCharacterId === characterToEdit.id && rel.direction === 'forward' && '←'}
                                                          {rel.toCharacterId === characterToEdit.id && rel.direction === 'backward' && '→'}
                                                          {rel.direction === 'bidirectional' && '↔'}
                                                        </span>
                                                        <span className="truncate">{otherChar.name}</span>
                                                    </div>
                                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleStartEditRel(rel)} className="p-1 text-gray-400 hover:text-white"><PencilIcon/></button>
                                                        <button onClick={() => handleDeleteRel(rel.id)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon/></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : <p className="text-gray-400 text-sm">暂无关系。</p>}
                            </div>
                        </div>
                        
                        {/* Add New Relationship Form */}
                        <div className="pt-4 border-t border-gray-700">
                            {!showAddForm ? (
                                <button onClick={() => setShowAddForm(true)} className="w-full flex items-center justify-center p-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors text-sm">
                                    <PlusIcon className="h-4 w-4 mr-1" /> 添加新关系
                                </button>
                            ) : (
                                <form onSubmit={handleAddNewRel} className="space-y-3 p-3 bg-gray-700 rounded-md">
                                    <div className="relative">
                                        <select value={newRelTargetId} onChange={e => setNewRelTargetId(e.target.value)} className="appearance-none block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm">
                                            {allCharacters.filter(c => c.id !== characterToEdit.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                    <input type="text" value={newRelType} onChange={e => setNewRelType(e.target.value)} placeholder="关系类型 (例如 朋友)" className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white text-sm" required />
                                    <DirectionSelector value={newRelDirection} onChange={setNewRelDirection} fromName={characterToEdit.name} toName={allCharacters.find(c=>c.id === newRelTargetId)?.name || ''} />
                                    <div className="flex justify-end space-x-2 pt-2">
                                        <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-400 text-xs">取消</button>
                                        <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs">添加</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};


const RelationshipFormModal: React.FC<{onClose: () => void; data: ScriptData; setCharacterRelationships: React.Dispatch<React.SetStateAction<CharacterRelationship[]>>}> = ({ onClose, data, setCharacterRelationships }) => {
  const [fromId, setFromId] = useState(data.characters[0]?.id || '');
  const [toId, setToId] = useState(data.characters[1]?.id || '');
  const [type, setType] = useState('');
  const [direction, setDirection] = useState<RelationshipDirection>('bidirectional');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) return;
    const newRelationship: CharacterRelationship = { id: `cr-${Date.now()}`, fromCharacterId: fromId, toCharacterId: toId, relationshipType: type, direction };
    setCharacterRelationships(prev => [...prev, newRelationship]);
    onClose();
  };

  const fromName = data.characters.find(c => c.id === fromId)?.name || '';
  const toName = data.characters.find(c => c.id === toId)?.name || '';
  
  return (
    <Modal isOpen={true} onClose={onClose} title="添加人物关系">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">从</label>
          <div className="relative mt-1">
            <select value={fromId} onChange={e => setFromId(e.target.value)} className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
              {data.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">到</label>
          <div className="relative mt-1">
            <select value={toId} onChange={e => setToId(e.target.value)} className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
              {data.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">关系类型 (例如 盟友, 敌人)</label>
          <input type="text" value={type} onChange={e => setType(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" required />
        </div>
         <DirectionSelector value={direction} onChange={setDirection} fromName={fromName} toName={toName} />
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">添加关系</button>
        </div>
      </form>
    </Modal>
  );
};


const ConnectionFormModal: React.FC<{onClose: () => void; data: ScriptData; setEventConnections: React.Dispatch<React.SetStateAction<EventConnection[]>>}> = ({ onClose, data, setEventConnections }) => {
  const [fromId, setFromId] = useState(data.events[0]?.id || '');
  const [toId, setToId] = useState(data.events[1]?.id || '');
  const [description, setDescription] = useState('导致');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) return;
    const newConnection: EventConnection = { id: `ec-${Date.now()}`, fromEventId: fromId, toEventId: toId, description };
    setEventConnections(prev => [...prev, newConnection]);
    onClose();
  };
  
  return (
    <Modal isOpen={true} onClose={onClose} title="添加事件关联">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">从事件</label>
          <div className="relative mt-1">
            <select value={fromId} onChange={e => setFromId(e.target.value)} className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
              {data.events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">到事件</label>
          <div className="relative mt-1">
            <select value={toId} onChange={e => setToId(e.target.value)} className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
              {data.events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
            </select>
            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">关联类型 (例如 导致, 阻止)</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required />
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700">添加关联</button>
        </div>
      </form>
    </Modal>
  );
};

const ConfirmModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
}> = ({ isOpen, onClose, onConfirm, title, children, confirmText = "确认删除" }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-gray-300">
        {children}
      </div>
      <div className="flex justify-end pt-6 space-x-2">
        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors">
          取消
        </button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

const CharacterGroupFormModal: React.FC<{
  onClose: () => void;
  setCharacterGroups: React.Dispatch<React.SetStateAction<CharacterGroup[]>>;
  groupToEdit?: CharacterGroup;
  allCharacters: Character[];
}> = ({ onClose, setCharacterGroups, groupToEdit, allCharacters }) => {
  const [name, setName] = useState(groupToEdit?.name || '');
  const [description, setDescription] = useState(groupToEdit?.description || '');
  const [color, setColor] = useState(groupToEdit?.color || '#a855f7');
  const [characterIds, setCharacterIds] = useState<string[]>(groupToEdit?.characterIds || []);

  const handleCharacterToggle = (charId: string) => {
    setCharacterIds(prev => prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupToEdit) {
      setCharacterGroups(prev => prev.map(g => g.id === groupToEdit.id ? { ...g, name, description, color, characterIds } : g));
    } else {
      const newGroup: CharacterGroup = { id: `cg-${Date.now()}`, name, description, color, characterIds };
      setCharacterGroups(prev => [...prev, newGroup]);
    }
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={groupToEdit ? `编辑群组: ${groupToEdit.name}` : "创建新群组"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">群组名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required/>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" rows={3}></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">颜色</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1 block w-full h-10 bg-gray-700 border-gray-600 rounded-md shadow-sm"/>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">群组成员</label>
            <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded-md">
                {allCharacters.map(char => (
                     <div key={char.id} className="p-1 rounded-md hover:bg-gray-600">
                        <Checkbox
                            id={`group-char-check-${char.id}`}
                            checked={characterIds.includes(char.id)}
                            onChange={() => handleCharacterToggle(char.id)}
                            label={char.name}
                        />
                     </div>
                ))}
            </div>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{groupToEdit ? "保存更改" : "创建群组"}</button>
        </div>
      </form>
    </Modal>
  );
};

export default Sidebar;