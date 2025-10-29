import React, { useState, useEffect, useMemo } from 'react';
import type { StoryEvent, Storyline, EventType, Character, EventConnection, AppSettings, ScriptData } from '../types';
import Modal from './Modal';
import { SparklesIcon, ChevronDownIcon, PlusIcon, TrashIcon } from './Icons';
import { generateCreativeIdea, type CreativeIdea } from '../services/geminiService';
import Checkbox from './Checkbox';

interface EventFormModalProps {
    onClose: () => void;
    data: ScriptData;
    setters: {
        setEvents: React.Dispatch<React.SetStateAction<StoryEvent[]>>;
        setEventConnections: React.Dispatch<React.SetStateAction<EventConnection[]>>;
        setEraOrder: React.Dispatch<React.SetStateAction<string[]>>;
    };
    eventToEdit?: StoryEvent | Partial<StoryEvent>;
    settings: AppSettings;
}

const EraFormModal: React.FC<{onClose: () => void, onSave: (name: string) => void}> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      onClose();
    }
  };
  return (
    <Modal isOpen={true} onClose={onClose} title="添加新纪元">
       <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">纪元名称</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" required autoFocus/>
           <p className="mt-2 text-xs text-gray-400">对于“第N代”这样的格式，请使用大写字母“N”作为数字的占位符。</p>
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">添加纪元</button>
        </div>
      </form>
    </Modal>
  );
};


const EventFormModal: React.FC<EventFormModalProps> = ({ onClose, data, setters, eventToEdit, settings }) => {
    const { setEvents, setEventConnections, setEraOrder } = setters;
    const [title, setTitle] = useState(eventToEdit?.title || '');
    
    // State for the new composite date input
    const [selectedEra, setSelectedEra] = useState('公元纪年');
    const [dateParts, setDateParts] = useState({ year: '', month: '', day: '', hour: '', minute: '', second: '' });
    const [showTime, setShowTime] = useState(false);

    const [storylineId, setStorylineId] = useState<string | null>(eventToEdit?.storylineId ?? (data.storylines[0]?.id ?? null));
    const [typeId, setTypeId] = useState<string | null>(eventToEdit?.typeId ?? (data.eventTypes[0]?.id ?? null));
    const [description, setDescription] = useState(eventToEdit?.description || '');
    const [charactersInvolved, setCharactersInvolved] = useState<string[]>(eventToEdit?.charactersInvolved || []);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEraModalOpen, setIsEraModalOpen] = useState(false);
    const [suggestedConnection, setSuggestedConnection] = useState<{ precedingEventTitle: string } | null>(null);

    // --- New State for Connections ---
    const isEditing = eventToEdit && 'id' in eventToEdit && eventToEdit.id;

    interface FormConnection {
        key: string;
        type: 'predecessor' | 'successor';
        otherEventId: string;
        description: string;
        originalId?: string;
    }

    const [formConnections, setFormConnections] = useState<FormConnection[]>([]);
    const [showAddConnectionForm, setShowAddConnectionForm] = useState(false);
    const [newConnection, setNewConnection] = useState({
        type: 'predecessor' as 'predecessor' | 'successor',
        otherEventId: data.events.find(e => e.id !== eventToEdit?.id)?.id || '',
        description: '导致'
    });

    const eraOptions = useMemo(() => {
        return data.eraOrder;
    }, [data.eraOrder]);

    useEffect(() => {
        if (eventToEdit?.date) {
            const dateStr = eventToEdit.date;
            let foundEra = false;

            // 1. Check for custom eras
            for (const era of data.eraOrder) {
                if (dateStr.startsWith(era)) {
                    setSelectedEra(era);
                    const valueStr = dateStr.substring(era.length).trim();
                    const [year, fraction] = valueStr.split('.');
                    const paddedFraction = (fraction || '').padEnd(10, '0');
                    setDateParts({
                        year: year || '',
                        month: paddedFraction.substring(0, 2),
                        day: paddedFraction.substring(2, 4),
                        hour: paddedFraction.substring(4, 6),
                        minute: paddedFraction.substring(6, 8),
                        second: paddedFraction.substring(8, 10),
                    });
                    setShowTime(paddedFraction.substring(4) !== '000000');
                    foundEra = true;
                    break;
                }
            }

            // 2. Fallback to Gregorian
            if (!foundEra) {
                const gregorianMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
                if (gregorianMatch) {
                    setSelectedEra('公元纪年');
                    setDateParts({
                        year: gregorianMatch[1] || '',
                        month: gregorianMatch[2] || '',
                        day: gregorianMatch[3] || '',
                        hour: gregorianMatch[4] || '00',
                        minute: gregorianMatch[5] || '00',
                        second: gregorianMatch[6] || '00',
                    });
                     setShowTime(!!gregorianMatch[4]);
                }
            }
        } else {
           setSelectedEra('公元纪年');
           const now = new Date();
           setDateParts({
             year: String(now.getFullYear()),
             month: String(now.getMonth() + 1).padStart(2, '0'),
             day: String(now.getDate()).padStart(2, '0'),
             hour: '', minute: '', second: ''
           });
           setShowTime(false);
        }
    }, [eventToEdit, data.eraOrder]);
    
    // Effect to populate connections on edit
    useEffect(() => {
        if (isEditing) {
            const related = data.eventConnections
                .filter(c => c.fromEventId === eventToEdit.id || c.toEventId === eventToEdit.id)
                .map((c): FormConnection => {
                    const isSuccessor = c.fromEventId === eventToEdit.id;
                    return {
                        key: c.id,
                        originalId: c.id,
                        type: isSuccessor ? 'successor' : 'predecessor',
                        otherEventId: isSuccessor ? c.toEventId : c.fromEventId,
                        description: c.description,
                    };
                });
            setFormConnections(related);
        }
    }, [isEditing, eventToEdit?.id, data.eventConnections]);

    const handleDatePartChange = (part: keyof typeof dateParts, value: string) => {
        setDateParts(prev => ({ ...prev, [part]: value }));
    };

    const handleCharacterToggle = (charId: string) => {
        setCharactersInvolved(prev => prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]);
    };

    const handleGenerateIdea = async () => {
        setIsGenerating(true);
        setSuggestedConnection(null); // Clear previous suggestion

        const context = {
            characters: data.characters.map(c => ({ name: c.name, description: c.description })),
            // Provide last 5 events as context
            recentEvents: data.events.slice(-5).map(e => ({ title: e.title, description: e.description }))
        };

        try {
            const result: CreativeIdea = await generateCreativeIdea(context, settings.ai);
            setTitle(result.title || '');
            setDescription(result.description || '');

            if (result.involvedCharacterNames && Array.isArray(result.involvedCharacterNames)) {
                const involvedIds = data.characters
                    .filter(c => result.involvedCharacterNames.includes(c.name))
                    .map(c => c.id);
                setCharactersInvolved(involvedIds);
            }

            if (result.precedingEventTitle) {
                setSuggestedConnection({ precedingEventTitle: result.precedingEventTitle });
            }

        } catch (error) {
            console.error("Failed to generate or parse idea:", error);
            let errorTitle = "AI 建议生成失败";
            let errorMessage = "请手动填写描述。";
            if (error instanceof Error) {
                try {
                    const parsedError = JSON.parse(error.message);
                    errorTitle = parsedError.title || errorTitle;
                    errorMessage = parsedError.description || errorMessage;
                } catch (e) {
                    // If parsing fails, use the original error message
                    errorMessage = error.message;
                }
            }
            setTitle(errorTitle); // Show error in title
            setDescription(errorMessage); // Show error in description
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleEraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === '__NEW__') {
            setIsEraModalOpen(true);
        } else {
            setSelectedEra(value);
        }
    };

    const handleAddNewEra = (name: string) => {
        setEraOrder(prev => [...prev, name]);
        setSelectedEra(name);
    };

    const handleAddConnection = () => {
        if (!newConnection.otherEventId) return;
        const newFormConn: FormConnection = {
            key: `temp-${Date.now()}`,
            ...newConnection
        };
        setFormConnections(prev => [...prev, newFormConn]);
        // Reset form
        setShowAddConnectionForm(false);
        setNewConnection({
            type: 'predecessor',
            otherEventId: data.events.find(e => e.id !== eventToEdit?.id)?.id || '',
            description: '导致'
        });
    };

    const handleDeleteConnection = (key: string) => {
        setFormConnections(prev => prev.filter(c => c.key !== key));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalDate = '';
        const p = (str: string, len: number = 2) => (str || '').padStart(len, '0');

        if (selectedEra === '公元纪年') {
            finalDate = `${p(dateParts.year, 4)}-${p(dateParts.month)}-${p(dateParts.day)}`;
            if (showTime && (dateParts.hour || dateParts.minute || dateParts.second)) {
                finalDate += ` ${p(dateParts.hour)}:${p(dateParts.minute)}:${p(dateParts.second)}`;
            }
        } else {
            const year = dateParts.year || '0';
            const fraction = `${p(dateParts.month)}${p(dateParts.day)}${showTime ? p(dateParts.hour) : '00'}${showTime ? p(dateParts.minute) : '00'}${showTime ? p(dateParts.second) : '00'}`;
            finalDate = `${selectedEra} ${year}.${fraction}`;
        }

        const eventData = { title, date: finalDate.trim(), storylineId, typeId, description, charactersInvolved };
        let eventId: string;
        
        if (isEditing) {
            eventId = eventToEdit.id!;
            setEvents(prev => prev.map(ev => ev.id === eventId ? {...ev, ...eventData} : ev));
        } else {
            eventId = `e-${Date.now()}`;
            const newEvent: StoryEvent = { id: eventId, ...eventToEdit, ...eventData };
            setEvents(prev => [...prev, newEvent]);
        }

        // --- Synchronize connections ---
        setEventConnections(prevConns => {
            const connectionsToSave = [...formConnections];
            
            // Handle auto-connect from timeline drag for new events
            if (!isEditing && eventToEdit?.__connectFrom) {
                connectionsToSave.push({
                    key: `temp-drag-${Date.now()}`,
                    type: 'predecessor',
                    otherEventId: eventToEdit.__connectFrom,
                    description: '导致'
                });
            }
            // Handle auto-connect from AI suggestion for new events
            else if (!isEditing && suggestedConnection) {
                const precedingEvent = data.events.find(e => e.title === suggestedConnection.precedingEventTitle);
                if (precedingEvent) {
                    connectionsToSave.push({
                        key: `temp-ai-${Date.now()}`,
                        type: 'predecessor',
                        otherEventId: precedingEvent.id,
                        description: '导致'
                    });
                }
            }

            // 1. Filter out all old connections related to this event
            const unrelatedConns = prevConns.filter(c => c.fromEventId !== eventId && c.toEventId !== eventId);

            // 2. Create new connection objects from the form state
            const newConns = connectionsToSave.map(fc => {
                const fromEventId = fc.type === 'successor' ? eventId : fc.otherEventId;
                const toEventId = fc.type === 'successor' ? fc.otherEventId : eventId;
                return {
                    id: fc.originalId || `conn-${Date.now()}-${Math.random()}`.replace('.',''),
                    fromEventId,
                    toEventId,
                    description: fc.description
                };
            });

            // 3. Return the new complete list
            return [...unrelatedConns, ...newConns];
        });
        
        onClose();
    };


    return (
        <>
        <Modal isOpen={true} onClose={onClose} title={isEditing ? "编辑事件" : "添加新事件"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">标题</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">时间标记</label>
                    <div className="mt-1 p-3 bg-gray-900/50 rounded-md space-y-3">
                        <div className="flex items-center space-x-2">
                            <div className="relative flex-shrink-0 w-1/3">
                                <select value={selectedEra} onChange={handleEraChange} className="appearance-none block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm">
                                    {eraOptions.map(era => <option key={era} value={era}>{era}</option>)}
                                    <option value="__NEW__" className="text-indigo-400">» 新建纪元...</option>
                                </select>
                                <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                            <div className="flex-grow flex items-center space-x-2">
                                <div className="flex-1 flex items-center">
                                    <input type="number" value={dateParts.year} onChange={e => handleDatePartChange('year', e.target.value)} placeholder={selectedEra === '公元纪年' ? 'YYYY' : '年/值'} className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" required />
                                    <span className="ml-1.5 text-gray-400 flex-shrink-0">年</span>
                                </div>
                                <div className="w-20 flex items-center">
                                    <input type="number" value={dateParts.month} onChange={e => handleDatePartChange('month', e.target.value)} placeholder="MM" className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                                    <span className="ml-1.5 text-gray-400 flex-shrink-0">月</span>
                                </div>
                                <div className="w-20 flex items-center">
                                    <input type="number" value={dateParts.day} onChange={e => handleDatePartChange('day', e.target.value)} placeholder="DD" className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                                    <span className="ml-1.5 text-gray-400 flex-shrink-0">日</span>
                                </div>
                            </div>
                        </div>
                        
                        {showTime && (
                            <div className="flex items-center space-x-2">
                                <div className="w-1/3"></div> {/* Spacer to align with date inputs */}
                                <div className="flex-grow flex items-center space-x-2">
                                    <div className="flex-1 flex items-center">
                                        <input type="number" value={dateParts.hour} onChange={e => handleDatePartChange('hour', e.target.value)} placeholder="HH" className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                                        <span className="ml-1.5 text-gray-400 flex-shrink-0">时</span>
                                    </div>
                                    <div className="flex-1 flex items-center">
                                        <input type="number" value={dateParts.minute} onChange={e => handleDatePartChange('minute', e.target.value)} placeholder="MM" className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                                        <span className="ml-1.5 text-gray-400 flex-shrink-0">分</span>
                                    </div>
                                    <div className="flex-1 flex items-center">
                                        <input type="number" value={dateParts.second} onChange={e => handleDatePartChange('second', e.target.value)} placeholder="SS" className="block w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white" />
                                        <span className="ml-1.5 text-gray-400 flex-shrink-0">秒</span>
                                    </div>
                                </div>
                            </div>
                        )}
                         <button type="button" onClick={() => setShowTime(!showTime)} className="text-sm text-indigo-400 hover:text-indigo-300">
                                {showTime ? '移除具体时间' : '添加具体时间'}
                        </button>
                    </div>
                </div>
                <div className="flex space-x-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300">故事线</label>
                        <div className="relative mt-1">
                            <select value={storylineId ?? ''} onChange={e => setStorylineId(e.target.value || null)} className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">-- 无故事线 --</option>
                                {data.storylines.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                            <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                     <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300">事件类型</label>
                         <div className="relative mt-1">
                            <select value={typeId ?? ''} onChange={e => setTypeId(e.target.value || null)} className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">-- 无类型 --</option>
                                {data.eventTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                             <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">描述</label>
                    <div className="relative">
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm p-2 text-white" rows={4}></textarea>
                        {settings.ai.enabled && (
                            <button type="button" onClick={handleGenerateIdea} disabled={isGenerating} className="absolute bottom-2 right-2 p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-gray-500">
                               <SparklesIcon className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`}/>
                            </button>
                        )}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300">涉及人物</label>
                    <div className="mt-2 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-700 rounded-md">
                        {data.characters.map(char => (
                             <div key={char.id} className="p-1 rounded-md hover:bg-gray-600">
                                <Checkbox
                                    id={`char-check-${char.id}`}
                                    checked={charactersInvolved.includes(char.id)}
                                    onChange={() => handleCharacterToggle(char.id)}
                                    label={char.name}
                                />
                             </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300">事件关联</label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto p-2 bg-gray-700 rounded-md">
                        {formConnections.length > 0 ? formConnections.map(conn => {
                            const otherEvent = data.events.find(e => e.id === conn.otherEventId);
                            if (!otherEvent) return null;
                            return (
                                <div key={conn.key} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                                    <div className="flex items-center space-x-2 text-sm truncate">
                                        {conn.type === 'predecessor' ? (
                                            <>
                                                <span className="font-semibold text-white truncate">{otherEvent.title}</span>
                                                <span className="px-2 py-0.5 text-xs bg-indigo-800 text-indigo-100 rounded-full">{conn.description}</span>
                                                <span>&rarr;</span>
                                                <span className="text-gray-400">此事件</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-gray-400">此事件</span>
                                                <span className="px-2 py-0.5 text-xs bg-teal-800 text-teal-100 rounded-full">{conn.description}</span>
                                                <span>&rarr;</span>
                                                <span className="font-semibold text-white truncate">{otherEvent.title}</span>
                                            </>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => handleDeleteConnection(conn.key)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                                        <TrashIcon />
                                    </button>
                                </div>
                            )
                        }) : <p className="text-gray-400 text-center text-sm">暂无关联</p>}
                    </div>

                    {!showAddConnectionForm && (
                        <button type="button" onClick={() => setShowAddConnectionForm(true)} className="w-full text-sm mt-2 flex items-center justify-center p-2 rounded-md bg-gray-600 hover:bg-gray-500 transition-colors">
                            <PlusIcon className="h-4 w-4 mr-1" /> 添加关联
                        </button>
                    )}

                    {showAddConnectionForm && (
                        <div className="mt-2 p-3 bg-gray-900/50 rounded-md space-y-3">
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-400">关系</label>
                                    <select
                                        value={newConnection.type}
                                        onChange={e => setNewConnection(p => ({ ...p, type: e.target.value as any, description: e.target.value === 'predecessor' ? '导致' : '起因于' }))}
                                        className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    >
                                        <option value="predecessor">是...的结果 (前序 &rarr; 此事件)</option>
                                        <option value="successor">是...的起因 (此事件 &rarr; 后续)</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-400">关联事件</label>
                                    <select
                                        value={newConnection.otherEventId}
                                        onChange={e => setNewConnection(p => ({ ...p, otherEventId: e.target.value }))}
                                        className="appearance-none block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    >
                                        <option value="">-- 选择事件 --</option>
                                        {data.events.filter(e => e.id !== eventToEdit?.id).map(e => (
                                            <option key={e.id} value={e.id}>{e.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-400">描述</label>
                                <input
                                    type="text"
                                    value={newConnection.description}
                                    onChange={e => setNewConnection(p => ({ ...p, description: e.target.value }))}
                                    className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white text-sm"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button type="button" onClick={() => setShowAddConnectionForm(false)} className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-400 text-xs">取消</button>
                                <button type="button" onClick={handleAddConnection} className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs">添加</button>
                            </div>
                        </div>
                    )}
                </div>


                <div className="flex justify-end pt-4">
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">{isEditing ? "保存更改" : "添加事件"}</button>
                </div>
            </form>
        </Modal>
        {isEraModalOpen && <EraFormModal onClose={() => setIsEraModalOpen(false)} onSave={handleAddNewEra} />}
        </>
    );
};

export default EventFormModal;
