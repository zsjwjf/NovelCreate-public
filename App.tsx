

import React, { useState, useMemo, useCallback } from 'react';
import type { Storyline, StoryEvent, EventConnection, Character, CharacterRelationship, ViewType, EventType, Script, ScriptData, AppSettings } from './types';
import Sidebar from './components/Sidebar';
import TimelineView from './components/TimelineView';
import CharacterGraphView from './components/CharacterGraphView';
import EventFormModal from './components/EventFormModal';
import EventDetailsModal from './components/EventDetailsModal';
import SettingsModal from './components/SettingsModal';
import { initialScripts } from './constants';
import usePersistentState from './hooks/usePersistentState';
import { PlusIcon } from './components/Icons';
import TimelineControls from './components/TimelineControls';

const defaultSettings: AppSettings = {
  ai: {
    enabled: true,
    activeVendor: 'gemini',
    vendors: {
      gemini: {
        model: 'gemini-2.5-flash',
        systemPrompt: '你是一个为小说家服务的创意助手。请提供简洁而富有想象力的想法。',
        apiKey: '',
        baseUrl: 'https://generativelanguage.googleapis.com',
        advanced: {
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1024,
        },
      },
      openai: {
        model: 'gpt-4o-mini',
        systemPrompt: 'You are a creative assistant for a novelist. Provide concise yet imaginative ideas.',
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        advanced: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }
    }
  },
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('timeline');
  
  const [scripts, setScripts] = usePersistentState<Script[]>('scripts', initialScripts);
  const [activeScriptId, setActiveScriptId] = usePersistentState<string | null>('activeScriptId', scripts[0]?.id ?? null);
  
  const [savedSettings, setSavedSettings] = usePersistentState<Partial<AppSettings>>('appSettings', defaultSettings);

  const settings = useMemo((): AppSettings => {
    // Deep merge saved settings with defaults to ensure all keys are present
    const savedAi = savedSettings.ai || {};
    const savedVendors = (savedAi as any).vendors || {};
    return {
      ai: {
        ...defaultSettings.ai,
        ...savedAi,
        vendors: {
          gemini: {
            ...defaultSettings.ai.vendors.gemini,
            ...(savedVendors.gemini || {}),
            apiKey: savedVendors.gemini?.apiKey ?? defaultSettings.ai.vendors.gemini.apiKey,
            advanced: {
              ...defaultSettings.ai.vendors.gemini.advanced,
              ...((savedVendors.gemini && savedVendors.gemini.advanced) || {}),
            },
          },
          openai: {
            ...defaultSettings.ai.vendors.openai,
            ...(savedVendors.openai || {}),
            advanced: {
              ...defaultSettings.ai.vendors.openai.advanced,
              ...((savedVendors.openai && savedVendors.openai.advanced) || {}),
            },
          },
        },
      },
    };
  }, [savedSettings]);

  const setSettings = useCallback((updater: React.SetStateAction<AppSettings>) => {
    const newSettings = typeof updater === 'function' ? updater(settings) : updater;
    setSavedSettings(newSettings);
  }, [settings, setSavedSettings]);


  const activeScript = useMemo(() => scripts.find(s => s.id === activeScriptId), [scripts, activeScriptId]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StoryEvent | Partial<StoryEvent> | undefined>(undefined);

  const [isEventDetailsModalOpen, setIsEventDetailsModalOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<StoryEvent | undefined>(undefined);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Lifted state for filters
  const [searchTerm, setSearchTerm] = useState('');

  const handleClearFilters = () => {
    setSearchTerm('');
  };

  const filteredEvents = useMemo(() => {
    if (!activeScript) return [];
    const events = activeScript.data.events;
    
    if (searchTerm === '') {
      return events;
    }

    return events.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeScript?.data.events, searchTerm]);

  const createSetter = <K extends keyof ScriptData>(key: K) => {
    return useCallback((updater: React.SetStateAction<ScriptData[K]>) => {
      setScripts(prevScripts => 
        prevScripts.map(script => {
          if (script.id === activeScriptId) {
            const oldData = script.data[key];
            const newData = typeof updater === 'function' ? (updater as (prevState: ScriptData[K]) => ScriptData[K])(oldData) : updater;
            return {
              ...script,
              data: { ...script.data, [key]: newData }
            };
          }
          return script;
        })
      );
    }, [activeScriptId, setScripts]);
  };

  const setters = {
    setStorylines: createSetter('storylines'),
    setEventTypes: createSetter('eventTypes'),
    setEvents: createSetter('events'),
    setEventConnections: createSetter('eventConnections'),
    setCharacters: createSetter('characters'),
    setCharacterRelationships: createSetter('characterRelationships'),
    setCharacterGroups: createSetter('characterGroups'),
    setEraOrder: createSetter('eraOrder'),
  };

  const handleCreateScript = (name: string) => {
    const newScript: Script = {
      id: `script-${Date.now()}`,
      name,
      data: {
        storylines: [],
        eventTypes: [],
        events: [],
        eventConnections: [],
        characters: [],
        characterRelationships: [],
        characterGroups: [],
        eraOrder: ['公元纪年'],
      }
    };
    setScripts(prev => [...prev, newScript]);
    setActiveScriptId(newScript.id);
  };

  const handleDeleteScript = (idToDelete: string) => {
    const scriptIndex = scripts.findIndex(s => s.id === idToDelete);
    if (scriptIndex === -1) return;

    const newScripts = scripts.filter(s => s.id !== idToDelete);
    setScripts(newScripts);

    if (activeScriptId === idToDelete) {
      if (newScripts.length > 0) {
        // Try to select the next script, or the previous one if it was the last
        const newActiveIndex = Math.min(scriptIndex, newScripts.length - 1);
        setActiveScriptId(newScripts[newActiveIndex].id);
      } else {
        setActiveScriptId(null);
      }
    }
  };

  const handleOpenEventModal = (event?: StoryEvent | Partial<StoryEvent>) => {
    setEditingEvent(event);
    setIsEventModalOpen(true);
  };
  
  const handleCloseEventModal = () => {
    setEditingEvent(undefined);
    setIsEventModalOpen(false);
  };

  const handleOpenEventDetailsModal = (event: StoryEvent) => {
    setViewingEvent(event);
    setIsEventDetailsModalOpen(true);
  };

  const handleCloseEventDetailsModal = () => {
    setViewingEvent(undefined);
    setIsEventDetailsModalOpen(false);
  };
  
  const handleEditFromDetails = (event: StoryEvent) => {
    handleCloseEventDetailsModal();
    handleOpenEventModal(event);
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 font-sans overflow-hidden">
      <Sidebar 
        scripts={scripts}
        activeScript={activeScript}
        setActiveScriptId={setActiveScriptId}
        onCreateScript={handleCreateScript}
        onDeleteScript={handleDeleteScript}
        data={activeScript?.data} 
        setters={setters} 
        handleOpenEventModal={handleOpenEventModal}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />
      <main className="flex-1 flex flex-col h-full min-w-0">
        {activeScript && (
          <TimelineControls
            view={view}
            onViewChange={setView}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onClearFilters={handleClearFilters}
          />
        )}
        {activeScript ? (
            <div className="flex-1 bg-gray-900 relative min-h-0">
              {view === 'timeline' && (
                <TimelineView
                  key={activeScript.id} // Add key to force re-mount on script change
                  events={filteredEvents} // Pass filtered events
                  storylines={activeScript.data.storylines}
                  eventConnections={activeScript.data.eventConnections}
                  eventTypes={activeScript.data.eventTypes}
                  eraOrder={activeScript.data.eraOrder}
                  setStorylines={setters.setStorylines}
                  onAddEventRequest={handleOpenEventModal}
                  setEvents={setters.setEvents}
                  setEventConnections={setters.setEventConnections}
                  onEventClick={handleOpenEventDetailsModal}
                />
              )}
              {view === 'characters' && (
                <CharacterGraphView
                  key={activeScript.id} // Add key to force re-mount on script change
                  characters={activeScript.data.characters}
                  relationships={activeScript.data.characterRelationships}
                  groups={activeScript.data.characterGroups}
                  setCharacters={setters.setCharacters}
                  setCharacterRelationships={setters.setCharacterRelationships}
                  setCharacterGroups={setters.setCharacterGroups}
                />
              )}
            </div>
        ) : (
           <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <h2 className="text-2xl font-bold mb-4">欢迎使用时间线编辑器</h2>
              <p className="mb-6">看起来您还没有任何剧本。</p>
              <button 
                onClick={() => handleCreateScript('我的第一个剧本')}
                className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-lg font-semibold"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="ml-2">创建一个新剧本开始</span>
              </button>
          </div>
        )}
      </main>
      
      {isEventModalOpen && activeScript && (
        <EventFormModal
            onClose={handleCloseEventModal}
            data={activeScript.data}
            setters={setters}
            eventToEdit={editingEvent}
            settings={settings}
        />
      )}

      {isEventDetailsModalOpen && viewingEvent && activeScript && (
        <EventDetailsModal
          event={viewingEvent}
          data={activeScript.data}
          onClose={handleCloseEventDetailsModal}
          onEdit={handleEditFromDetails}
          setEventConnections={setters.setEventConnections}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        setSettings={setSettings}
      />
    </div>
  );
};

export default App;