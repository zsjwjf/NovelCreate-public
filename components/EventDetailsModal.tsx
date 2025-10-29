import React, { useState } from 'react';
import type { StoryEvent, Storyline, EventType, Character, EventConnection } from '../types';
import Modal from './Modal';
import { PencilIcon, TrashIcon } from './Icons';

interface EventDetailsModalProps {
  event: StoryEvent;
  data: {
    storylines: Storyline[];
    eventTypes: EventType[];
    characters: Character[];
    events: StoryEvent[];
    eventConnections: EventConnection[];
    eraOrder: string[]; // Add eraOrder to format date
  };
  onClose: () => void;
  onEdit: (event: StoryEvent) => void;
  setEventConnections: React.Dispatch<React.SetStateAction<EventConnection[]>>;
}

const formatDisplayDate = (dateString: string, eraOrder: string[]): string => {
    if (!dateString) return "无日期";

    const trimmedDate = dateString.trim();

    // 1. Gregorian format: YYYY-MM-DD HH:MM:SS
    const gregorianMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (gregorianMatch) {
        const [, year, month, day, hour, minute, second] = gregorianMatch;
        let formatted = `${year}年${month}月${day}日`;
        if (hour && minute && second) {
            formatted += ` ${hour}:${minute}:${second}`;
        }
        return formatted;
    }

    // 2. Custom era format: ERA_NAME YYYY.MMDDHHMMSS
    for (const era of eraOrder) {
        if (trimmedDate.startsWith(era)) {
            const valueStr = trimmedDate.substring(era.length).trim();
            const [year, fraction] = valueStr.split('.');
            
            if (fraction) {
                const paddedFraction = fraction.padEnd(10, '0');
                const month = paddedFraction.substring(0, 2);
                const day = paddedFraction.substring(2, 4);
                const hour = paddedFraction.substring(4, 6);
                const minute = paddedFraction.substring(6, 8);
                const second = paddedFraction.substring(8, 10);
                
                let formatted = `${era} ${year}年${month}月${day}日`;
                if (hour !== '00' || minute !== '00' || second !== '00') {
                    formatted += ` ${hour}:${minute}:${second}`;
                }
                return formatted;
            }
            // Handle case with no fraction part
            return `${era} ${year}年`;
        }
    }
    
    // 3. Fallback
    return dateString;
};


const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, data, onClose, onEdit, setEventConnections }) => {
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState('');
  const [connectionToDelete, setConnectionToDelete] = useState<EventConnection | null>(null);

  const storyline = data.storylines.find(s => s.id === event.storylineId);
  const eventType = data.eventTypes.find(et => et.id === event.typeId);
  const involvedCharacters = data.characters.filter(c => event.charactersInvolved.includes(c.id));
  const relatedConnections = data.eventConnections.filter(
    c => c.fromEventId === event.id || c.toEventId === event.id
  );

  const handleEditClick = () => {
    onEdit(event);
  };

  const handleStartEdit = (connection: EventConnection) => {
    setEditingConnectionId(connection.id);
    setEditingDesc(connection.description);
  };

  const handleSaveEdit = () => {
    if (!editingConnectionId) return;
    setEventConnections(prev => 
      prev.map(c => 
        c.id === editingConnectionId ? { ...c, description: editingDesc } : c
      )
    );
    setEditingConnectionId(null);
    setEditingDesc('');
  };
  
  const handleCancelEdit = () => {
    setEditingConnectionId(null);
    setEditingDesc('');
  };

  const handleConfirmDelete = () => {
    if (!connectionToDelete) return;
    setEventConnections(prev => prev.filter(c => c.id !== connectionToDelete.id));
    setConnectionToDelete(null);
  };

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title="事件详情">
        <div className="space-y-4 text-gray-300">
          <h3 className="text-xl font-bold text-white">{event.title}</h3>
          
          <div>
            <p className="text-sm font-medium text-gray-400">时间标记</p>
            <p>{formatDisplayDate(event.date, data.eraOrder)}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-400">描述</p>
            <p className="whitespace-pre-wrap">{event.description || '无'}</p>
          </div>

          <div className="flex space-x-4">
              {storyline && (
                  <div className="flex-1">
                      <p className="text-sm font-medium text-gray-400">故事线</p>
                      <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: storyline.color }}></span>
                          <span>{storyline.name}</span>
                      </div>
                  </div>
              )}
              {eventType && (
                  <div className="flex-1">
                      <p className="text-sm font-medium text-gray-400">事件类型</p>
                      <div className="flex items-center">
                          <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: eventType.color }}></span>
                          <span>{eventType.name}</span>
                      </div>
                  </div>
              )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-400">涉及人物</p>
            {involvedCharacters.length > 0 ? (
              <ul className="list-disc list-inside mt-1">
                {involvedCharacters.map(char => (
                  <li key={char.id}>{char.name}</li>
                ))}
              </ul>
            ) : (
              <p>无</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-400">事件关联</p>
            {relatedConnections.length > 0 ? (
              <ul className="mt-1 space-y-2">
                {relatedConnections.map(conn => {
                  const isSource = conn.fromEventId === event.id;
                  const otherEventId = isSource ? conn.toEventId : conn.fromEventId;
                  const otherEvent = data.events.find(e => e.id === otherEventId);

                  return (
                    <li key={conn.id} className="text-sm p-2 rounded-md bg-gray-700 flex items-center justify-between group">
                      {editingConnectionId === conn.id ? (
                        <>
                          <div className="flex-grow flex items-center space-x-2">
                            {isSource ? (
                              <>
                                <span className="text-gray-400">此事件</span>
                                <input type="text" value={editingDesc} onChange={(e) => setEditingDesc(e.target.value)} className="flex-grow bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white" autoFocus />
                                <span>&rarr;</span>
                                <span className="font-semibold text-white truncate">{otherEvent?.title || '未知事件'}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-white truncate">{otherEvent?.title || '未知事件'}</span>
                                <input type="text" value={editingDesc} onChange={(e) => setEditingDesc(e.target.value)} className="flex-grow bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white" autoFocus />
                                <span>&rarr;</span>
                                <span className="text-gray-400">此事件</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button onClick={handleSaveEdit} className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded text-white">保存</button>
                            <button onClick={handleCancelEdit} className="px-2 py-1 text-xs bg-gray-500 hover:bg-gray-400 rounded text-white">取消</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-grow flex items-center space-x-2">
                            {isSource ? (
                              <>
                                <span className="text-gray-400">此事件</span>
                                <span className="px-2 py-1 text-xs bg-teal-800 text-teal-100 rounded-full">{conn.description}</span>
                                <span>&rarr;</span>
                                <span className="font-semibold text-white truncate">{otherEvent?.title || '未知事件'}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-white truncate">{otherEvent?.title || '未知事件'}</span>
                                <span className="px-2 py-1 text-xs bg-indigo-800 text-indigo-100 rounded-full">{conn.description}</span>
                                <span>&rarr;</span>
                                <span className="text-gray-400">此事件</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleStartEdit(conn)} className="p-1 text-gray-400 hover:text-white"><PencilIcon/></button>
                            <button onClick={() => setConnectionToDelete(conn)} className="p-1 text-gray-400 hover:text-red-500"><TrashIcon/></button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>无关联事件</p>
            )}
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t border-gray-700">
            <button 
              onClick={handleEditClick} 
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              <PencilIcon />
              <span className="ml-2">编辑</span>
            </button>
          </div>
        </div>
      </Modal>

      {connectionToDelete && (
        <Modal isOpen={true} onClose={() => setConnectionToDelete(null)} title="确认删除关联">
          <p className="text-gray-300">
            您确定要删除从 "{data.events.find(e => e.id === connectionToDelete.fromEventId)?.title}" 到 "{data.events.find(e => e.id === connectionToDelete.toEventId)?.title}" 的关联吗？此操作无法撤销。
          </p>
          <div className="flex justify-end pt-6 space-x-2">
            <button onClick={() => setConnectionToDelete(null)} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors">
              取消
            </button>
            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
              确认删除
            </button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default EventDetailsModal;