

import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { Character, CharacterRelationship, RelationshipDirection, CharacterGroup } from '../types';
import Modal from './Modal';
import { PencilIcon, TrashIcon, PlusIcon, ChevronDownIcon } from './Icons';
import Checkbox from './Checkbox';


interface CharacterGraphViewProps {
  characters: Character[];
  relationships: CharacterRelationship[];
  groups: CharacterGroup[];
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setCharacterRelationships: React.Dispatch<React.SetStateAction<CharacterRelationship[]>>;
  setCharacterGroups: React.Dispatch<React.SetStateAction<CharacterGroup[]>>;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'character' | 'group';
  color?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

type Link = d3.SimulationLinkDatum<Node> & {
  type: string;
  linkNum?: number;
  id: string;
  direction?: RelationshipDirection;
};

const CharacterGraphView: React.FC<CharacterGraphViewProps> = ({ characters, relationships, groups, setCharacters, setCharacterRelationships, setCharacterGroups }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingGroup, setEditingGroup] = useState<CharacterGroup | null>(null);

  const { nodes, links } = useMemo(() => {
    const charNodes: Node[] = characters.map(c => ({ id: c.id, name: c.name, type: 'character' }));
    const groupNodes: Node[] = (groups || []).map(g => ({ id: g.id, name: g.name, type: 'group', color: g.color }));
    
    const allNodes: Node[] = [...charNodes, ...groupNodes];

    const directLinks: Omit<Link, 'linkNum'>[] = relationships.map(r => ({
      id: r.id,
      source: r.fromCharacterId,
      target: r.toCharacterId,
      type: r.relationshipType,
      direction: r.direction,
    }));

    const groupLinks: Link[] = (groups || []).flatMap(g => 
        g.characterIds.map(charId => ({
            id: `gl-${g.id}-${charId}`,
            source: charId,
            target: g.id,
            type: 'member',
        }))
    );

    // Add linkNum for curving parallel edges, only for direct links
    const linkIndexes: { [key: string]: number } = {};
    const finalDirectLinks: Link[] = directLinks.map(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as Node).id : (link.source as string);
      const targetId = typeof link.target === 'object' ? (link.target as Node).id : (link.target as string);
      const key = sourceId < targetId ? `${sourceId}-${targetId}` : `${targetId}-${sourceId}`;
      
      const index = (linkIndexes[key] || 0) + 1;
      linkIndexes[key] = index;

      return { ...link, linkNum: index };
    });

    return { nodes: allNodes, links: [...finalDirectLinks, ...groupLinks] };
  }, [characters, relationships, groups]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svg.node()?.parentElement?.clientWidth || 800;
    const height = svg.node()?.parentElement?.clientHeight || 600;

    svg.attr('width', width).attr('height', height);
    
    const defs = svg.append('defs');
    
    defs.append('marker')
      .attr('id', 'arrowhead-end')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');

    defs.append('marker')
      .attr('id', 'arrowhead-start')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('orient', 'auto-start-reverse')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 1.5)
      .attr('stroke-linecap', 'round');


    const container = svg.append("g");

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(d => d.type === 'member' ? 100 : 200))
      .force("charge", d3.forceManyBody().strength(-500).distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const linkGroup = container.append("g")
      .selectAll("g")
      .data(links)
      .join("g");

    const linkPath = linkGroup.append("path")
      .attr("id", (d, i) => `link-path-${i}`)
      .attr("stroke", d => d.type === 'member' ? "#6b7280" : "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", d => d.type === 'member' ? 1.5 : 2)
      .attr("stroke-dasharray", d => d.type === 'member' ? "3 3" : "none")
      .attr("fill", "none");
    
    linkGroup.append("text")
      .filter(d => d.type !== 'member')
      .attr("fill", "#a0a0a0")
      .style("font-size", "10px")
      .attr("dy", d => {
        const link = d as Link;
        if (!link.linkNum) return 0;
        const isOdd = link.linkNum % 2 !== 0;
        const stackIndex = Math.floor((link.linkNum - 1) / 2);
        const verticalSpacing = 12; 
        
        if (isOdd) {
          return -5 - (stackIndex * verticalSpacing);
        } else {
          return 15 + (stackIndex * verticalSpacing);
        }
      })
      .append("textPath")
      .attr("href", (d, i) => `#link-path-${i}`)
      .attr("startOffset", "50%")
      .attr("text-anchor", "middle")
      .text(d => (d as Link).type);

    const node = container.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .call(drag(simulation) as any)
      .on("dblclick", (event, d) => {
          if (d.type === 'character') {
            const char = characters.find(c => c.id === d.id);
            if (char) setEditingCharacter(char);
          } else if (d.type === 'group') {
            const group = groups.find(g => g.id === d.id);
            if (group) setEditingGroup(group);
          }
      })
      .on("mouseover", (event, d) => {
        if (d.type === 'group') {
          const groupData = groups.find(g => g.id === d.id);
          if (!groupData) return;
          const memberIds = new Set(groupData.characterIds);
          memberIds.add(d.id);

          node.transition().duration(300).style('opacity', n => memberIds.has(n.id) ? 1 : 0.1);
          linkGroup.transition().duration(300).style('opacity', l => {
            const sourceId = (l.source as Node).id;
            const targetId = (l.target as Node).id;
            return memberIds.has(sourceId) && memberIds.has(targetId) ? 1 : 0.1;
          });
        } else if (d.type === 'character') {
            const connectedNodeIds = new Set<string>([d.id]);
            links.forEach(link => {
                const source = link.source as Node;
                const target = link.target as Node;
                if (source.id === d.id) {
                    connectedNodeIds.add(target.id);
                } else if (target.id === d.id) {
                    connectedNodeIds.add(source.id);
                }
            });

            node.transition().duration(300).style('opacity', n => connectedNodeIds.has(n.id) ? 1 : 0.1);
            linkGroup.transition().duration(300).style('opacity', l => {
                const source = l.source as Node;
                const target = l.target as Node;
                return source.id === d.id || target.id === d.id ? 1 : 0.1;
            });
        }
      })
      .on("mouseout", () => {
        node.transition().duration(300).style('opacity', 1);
        linkGroup.transition().duration(300).style('opacity', 1);
      });
    
    // Character nodes
    node.filter(d => d.type === 'character').append("circle")
      .attr("r", 15)
      .attr("fill", "#1e1e1e")
      .attr("stroke", "#8b5cf6")
      .attr("stroke-width", 2);

    // Group nodes
    node.filter(d => d.type === 'group').append("rect")
      .attr("width", 30)
      .attr("height", 30)
      .attr("x", -15)
      .attr("y", -15)
      .attr("rx", 4)
      .attr("fill", "#2d2d2d")
      .attr("stroke", d => d.color || "#10b981")
      .attr("stroke-width", 2);


    node.append("text")
      .text(d => (d as Node).name)
      .attr("x", 0)
      .attr("y", d => d.type === 'character' ? 30 : 28)
      .attr("text-anchor", "middle")
      .attr("fill", "#e0e0e0")
      .style("font-size", "12px")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      linkPath.each(function(d) {
          const path = d3.select(this);
          const link = d as Link;
          const sourceNode = link.source as Node;
          const targetNode = link.target as Node;

          if (!sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return;

          const isSwapped = sourceNode.x > targetNode.x;
          const leftNode = isSwapped ? targetNode : sourceNode;
          const rightNode = isSwapped ? sourceNode : targetNode;

          const nodeRadius = 15;
          const dx = rightNode.x - leftNode.x;
          const dy = rightNode.y - leftNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) return;

          const sourceX = leftNode.x + dx / dist * nodeRadius;
          const sourceY = leftNode.y + dy / dist * nodeRadius;
          const targetX = rightNode.x - dx / dist * nodeRadius;
          const targetY = rightNode.y - dy / dist * nodeRadius;
          
          path.attr("d", `M${sourceX},${sourceY}L${targetX},${targetY}`);
          
          if (link.type !== 'member') {
            let hasArrowAtEnd = false;
            let hasArrowAtStart = false;

            if (link.direction === 'bidirectional') {
                hasArrowAtEnd = true;
                hasArrowAtStart = true;
            } else if (link.direction === 'forward') {
                hasArrowAtEnd = !isSwapped;
                hasArrowAtStart = isSwapped;
            } else if (link.direction === 'backward') {
                hasArrowAtEnd = isSwapped;
                hasArrowAtStart = !isSwapped;
            }
            
            path.attr('marker-end', hasArrowAtEnd ? 'url(#arrowhead-end)' : null);
            path.attr('marker-start', hasArrowAtStart ? 'url(#arrowhead-start)' : null);
          }
      });
      
      node.attr("transform", d => `translate(${(d as Node).x},${(d as Node).y})`);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        container.attr('transform', event.transform);
    });
    svg.call(zoom).on("dblclick.zoom", null);

    return () => {
      simulation.stop();
    };
  }, [nodes, links, characters, groups]); 

  const drag = (simulation: d3.Simulation<Node, undefined>) => {
    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }
    
    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }
    
    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }
    
    return d3.drag<SVGGElement, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return (
    <>
      <svg ref={svgRef} className="w-full h-full"></svg>
      {editingCharacter && (
        <CharacterDetailModal 
          character={editingCharacter}
          allCharacters={characters}
          relationships={relationships}
          groups={groups}
          onClose={() => setEditingCharacter(null)}
          setCharacters={setCharacters}
          setCharacterRelationships={setCharacterRelationships}
          setCharacterGroups={setCharacterGroups}
        />
      )}
      {editingGroup && (
        <CharacterGroupFormModal
          onClose={() => setEditingGroup(null)}
          setCharacterGroups={setCharacterGroups}
          groupToEdit={editingGroup}
          allCharacters={characters}
        />
      )}
    </>
  );
};


// --- Modal Component for Editing Character Details and Relationships ---
interface CharacterDetailModalProps {
  character: Character;
  allCharacters: Character[];
  relationships: CharacterRelationship[];
  groups: CharacterGroup[];
  onClose: () => void;
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
  setCharacterRelationships: React.Dispatch<React.SetStateAction<CharacterRelationship[]>>;
  setCharacterGroups: React.Dispatch<React.SetStateAction<CharacterGroup[]>>;
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

const CharacterDetailModal: React.FC<CharacterDetailModalProps> = ({ character, allCharacters, relationships, groups, onClose, setCharacters, setCharacterRelationships, setCharacterGroups }) => {
    const [name, setName] = useState(character.name);
    const [description, setDescription] = useState(character.description);
    
    const [editingRel, setEditingRel] = useState<{ id: string; type: string; direction: RelationshipDirection } | null>(null);

    const [showAddForm, setShowAddForm] = useState(false);
    const [newRelTargetId, setNewRelTargetId] = useState<string>(allCharacters.find(c => c.id !== character.id)?.id || '');
    const [newRelType, setNewRelType] = useState('');
    const [newRelDirection, setNewRelDirection] = useState<RelationshipDirection>('bidirectional');

    const characterRelationships = useMemo(() => {
        return relationships.filter(r => r.fromCharacterId === character.id || r.toCharacterId === character.id);
    }, [relationships, character.id]);
    
    const handleSaveChanges = () => {
        setCharacters(prev => prev.map(c => c.id === character.id ? { ...c, name, description } : c));
        // No need to close automatically, user might want to edit relationships
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
            fromCharacterId: character.id,
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
        const otherId = rel.fromCharacterId === character.id ? rel.toCharacterId : rel.fromCharacterId;
        return allCharacters.find(c => c.id === otherId);
    };

    const handleGroupToggle = (groupId: string) => {
        setCharacterGroups(prevGroups => 
            prevGroups.map(group => {
                if (group.id === groupId) {
                    const isMember = group.characterIds.includes(character.id);
                    const newCharacterIds = isMember 
                        ? group.characterIds.filter(id => id !== character.id)
                        : [...group.characterIds, character.id];
                    return { ...group, characterIds: newCharacterIds };
                }
                return group;
            })
        );
    };


    return (
        <Modal isOpen={true} onClose={onClose} title={`编辑: ${character.name}`}>
            <div className="space-y-4">
                {/* Character Details Form */}
                <div>
                    <label className="block text-sm font-medium text-gray-300">姓名</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">描述</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md p-2 text-white" rows={3}></textarea>
                </div>
                <div className="flex justify-end">
                    <button onClick={handleSaveChanges} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm">保存人物信息</button>
                </div>

                {/* Groups Section */}
                <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-md font-semibold text-gray-200 mb-2">所属群组</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {groups.length > 0 ? groups.map(group => (
                            <div key={group.id} className="p-1 rounded-md hover:bg-gray-600">
                                <Checkbox
                                    id={`graph-group-char-check-${character.id}-${group.id}`}
                                    checked={group.characterIds.includes(character.id)}
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
                                            <DirectionSelector value={editingRel.direction} onChange={dir => setEditingRel(prev => prev ? {...prev, direction: dir} : null)} fromName={character.name} toName={otherChar.name} />
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
                                                  {rel.fromCharacterId === character.id && rel.direction === 'forward' && '→'}
                                                  {rel.fromCharacterId === character.id && rel.direction === 'backward' && '←'}
                                                  {rel.toCharacterId === character.id && rel.direction === 'forward' && '←'}
                                                  {rel.toCharacterId === character.id && rel.direction === 'backward' && '→'}
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
                                    {allCharacters.filter(c => c.id !== character.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                 <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                            <input type="text" value={newRelType} onChange={e => setNewRelType(e.target.value)} placeholder="关系类型 (例如 朋友)" className="block w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white text-sm" required />
                            <DirectionSelector value={newRelDirection} onChange={setNewRelDirection} fromName={character.name} toName={allCharacters.find(c=>c.id === newRelTargetId)?.name || ''} />
                            <div className="flex justify-end space-x-2 pt-2">
                                <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-400 text-xs">取消</button>
                                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs">添加</button>
                            </div>
                        </form>
                    )}
                </div>
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


export default CharacterGraphView;