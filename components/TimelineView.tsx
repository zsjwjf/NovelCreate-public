import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { StoryEvent, Storyline, EventConnection, EventType } from '../types';
import { GrabberIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

interface TimelineViewProps {
  events: StoryEvent[];
  storylines: Storyline[];
  eventConnections: EventConnection[];
  eventTypes: EventType[];
  eraOrder: string[];
  setStorylines: React.Dispatch<React.SetStateAction<Storyline[]>>;
  onAddEventRequest: (initialData: Partial<StoryEvent>) => void;
  setEvents: React.Dispatch<React.SetStateAction<StoryEvent[]>>;
  setEventConnections: React.Dispatch<React.SetStateAction<EventConnection[]>>;
  onEventClick: (event: StoryEvent) => void;
}

// Layout Constants
const EVENT_WIDTH = 200;
const EVENT_GAP = 80;
const PADDING_X = 20;
const EVENT_CARD_HEIGHT = 120; // Expanded height
const CAPSULE_HEIGHT = 40;     // Collapsed height
const SAME_DAY_VERTICAL_GAP = 25; // Increased vertical gap for same-day events
const SAME_DAY_CONNECTED_EVENT_GAP = 40; // Extra gap for connected same-day events
const LANE_VERTICAL_PADDING = 20;
const MIN_LANE_HEIGHT = CAPSULE_HEIGHT + 2 * LANE_VERTICAL_PADDING;
const INDENTATION_STEP = 20;
const MAX_INDENTATION_LEVEL = 10;
const RULER_HEIGHT = 48; // Height for the timeline ruler at the top

const HIGHLIGHT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#eab308', // yellow-500
  '#ec4899', // pink-500
];

/**
 * Normalizes various date string formats into a sortable number based on a custom era order.
 * This allows for flexible, user-defined timelines.
 * Handles 'YYYY-MM-DD HH:MM:SS' and 'ERA_NAME YYYY.MMDDHHMMSS' formats.
 * @param dateString The date string to parse.
 * @param eraOrder An array of strings defining the order of custom eras.
 * @returns A number representing the point in time for sorting.
 */
const normalizeDate = (dateString: string, eraOrder: string[]): number => {
    if (!dateString) return Infinity;
    
    const trimmedDate = dateString.trim();

    // 1. Check for BC dates
    const bcMatch = trimmedDate.match(/^(?:公元前|BC)\s*(\d+(\.\d+)?)/i);
    if (bcMatch) return -parseFloat(bcMatch[1]);

    // 2. Check for Gregorian dates (YYYY-MM-DD HH:MM:SS)
    const gregorianMatch = trimmedDate.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (gregorianMatch) {
        try {
            // Using Date.UTC is more reliable than new Date() with a string,
            // as it avoids timezone issues and ambiguous formats.
            const [, year, month, day, hour = '00', minute = '00', second = '00'] = gregorianMatch;
            const date = Date.UTC(
                parseInt(year, 10),
                parseInt(month, 10) - 1, // month is 0-indexed in Date
                parseInt(day, 10),
                parseInt(hour, 10),
                parseInt(minute, 10),
                parseInt(second, 10)
            );
            // If parsing results in NaN, return Infinity to place it at the end.
            return isNaN(date) ? Infinity : date;
        } catch(e) {
            // In case of any unexpected error during parsing, treat as invalid.
            return Infinity;
        }
    }
    
    // 3. Check for custom era dates
    const ERA_MULTIPLIER = 1e14; // A large number to separate eras
    const gregorianAnchorIndex = eraOrder.findIndex(era => era === '公元纪年');
    const anchorIndex = gregorianAnchorIndex === -1 ? 0 : gregorianAnchorIndex;

    for (let i = 0; i < eraOrder.length; i++) {
        const era = eraOrder[i];
        if (trimmedDate.startsWith(era)) {
            const valueStr = trimmedDate.substring(era.length).trim();
            const eraBaseValue = (i - anchorIndex) * ERA_MULTIPLIER;
            // Pad the fractional part to ensure consistent sorting
            const [year, fraction] = valueStr.split('.');
            const paddedFraction = (fraction || '').padEnd(10, '0');
            const numericValue = parseFloat(`${year}.${paddedFraction}`);
            
            return eraBaseValue + (numericValue || 0);
        }
    }
    
    // 4. Fallback for completely unrecognized strings
    return Infinity;
};

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

const getDayKey = (dateString: string): string => {
    if (!dateString) return "NoDate";
    const trimmed = dateString.trim();
    const bcMatch = trimmed.match(/^(?:公元前|BC)\s*(\d+)/i);
    if (bcMatch) return `BC-${bcMatch[1]}`;
    const gregorianMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (gregorianMatch) return gregorianMatch[1];
    const firstSpaceIndex = trimmed.indexOf(' ');
    if (firstSpaceIndex > 0) {
        const eraPart = trimmed.substring(0, firstSpaceIndex);
        const yearPart = trimmed.substring(firstSpaceIndex + 1).split('.')[0];
        return `${eraPart} ${yearPart}`;
    }
    return trimmed;
};

const TimelineView: React.FC<TimelineViewProps> = ({ events, storylines, eventConnections, eventTypes, eraOrder, setStorylines, onAddEventRequest, setEvents, setEventConnections, onEventClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [nodeHoverEventId, setNodeHoverEventId] = useState<string | null>(null);

  const [connectingState, setConnectingState] = useState<{
    isConnecting: boolean;
    sourceEventId: string | null;
    sourcePos: { x: number; y: number } | null;
    endPos: { x: number; y: number } | null;
  }>({ isConnecting: false, sourceEventId: null, sourcePos: null, endPos: null });
  
  const [draggedStorylineId, setDraggedStorylineId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ x: number; y: number; height: number; storylineId: string; date: string; } | null>(null);

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const laneHeaderWidth = useMemo(() => {
    const hiddenEl = document.createElement('span');
    hiddenEl.style.visibility = 'hidden';
    hiddenEl.style.position = 'absolute';
    hiddenEl.style.whiteSpace = 'nowrap';
    hiddenEl.className = 'text-md font-bold';
    document.body.appendChild(hiddenEl);
    
    const maxLength = storylines.reduce((max, s) => Math.max(max, s.name.length), 0);
    const clampedLength = Math.max(5, Math.min(maxLength, 10));

    const longestName = storylines.reduce((longest, s) => s.name.length > longest.length ? s.name : longest, '');
    const testName = longestName.slice(0, clampedLength);
    hiddenEl.textContent = testName;
    const textWidth = hiddenEl.offsetWidth;

    document.body.removeChild(hiddenEl);
    
    return 16 + textWidth + 16 + 24 + 10;
  }, [storylines]);

  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  }, []);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
        setContainerWidth(element.offsetWidth);
    });

    resizeObserver.observe(element);
    setContainerWidth(element.offsetWidth); // Set initial width

    return () => resizeObserver.disconnect();
  }, []);

  const getTransformedSvgPoint = useCallback((e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    try {
        return svgPoint.matrixTransform(ctm.inverse());
    } catch (error) {
        console.error("Error transforming SVG point:", error);
        return null;
    }
  }, []);

  const {
    eventLayouts,
    canvasWidth,
    totalHeight,
    laneGeometries,
    sortedUniqueDays,
    connectionPaths,
    eventsByDay,
    dayColumnGeometries,
  } = useMemo(() => {
    const completeEvents = events.filter(e => e.storylineId && e.typeId && e.date);
    const sortedEvents = completeEvents.sort((a, b) => normalizeDate(a.date, eraOrder) - normalizeDate(b.date, eraOrder));
    
    const eventsByDay = new Map<string, StoryEvent[]>();
    for (const event of sortedEvents) {
        const dayKey = getDayKey(event.date!);
        if (!eventsByDay.has(dayKey)) {
            eventsByDay.set(dayKey, []);
        }
        eventsByDay.get(dayKey)!.push(event);
    }

    const sortedUniqueDays = Array.from(eventsByDay.keys()).sort((a, b) => {
        const firstEventDateA = eventsByDay.get(a)![0].date;
        const firstEventDateB = eventsByDay.get(b)![0].date;
        return normalizeDate(firstEventDateA, eraOrder) - normalizeDate(firstEventDateB, eraOrder);
    });

    const eventIndentationLevels = new Map<string, number>();
    for (const sameDayEvents of eventsByDay.values()) {
        sameDayEvents.forEach((event, index) => {
            eventIndentationLevels.set(event.id, index);
        });
    }
    
    const dayColumnContentWidths = new Map<string, number>();
    for (const [dayKey, sameDayEvents] of eventsByDay.entries()) {
        let maxEventWidth = EVENT_WIDTH;
        for (const event of sameDayEvents) {
            const indentationLevel = Math.min(eventIndentationLevels.get(event.id) || 0, MAX_INDENTATION_LEVEL);
            const eventTotalWidth = (indentationLevel * INDENTATION_STEP) + EVENT_WIDTH;
            if (eventTotalWidth > maxEventWidth) {
                maxEventWidth = eventTotalWidth;
            }
        }
        dayColumnContentWidths.set(dayKey, maxEventWidth);
    }
    
    const dayColumnGeometries = new Map<string, { x: number, width: number }>();
    let currentX = PADDING_X;
    for (const dayKey of sortedUniqueDays) {
        const contentWidth = dayColumnContentWidths.get(dayKey) || EVENT_WIDTH;
        dayColumnGeometries.set(dayKey, { x: currentX, width: contentWidth });
        currentX += contentWidth + EVENT_GAP;
    }

    const canvasWidth = sortedUniqueDays.length > 0 ? currentX - EVENT_GAP : 2 * PADDING_X;

    const eventsByStorylineAndDay = new Map<string, Map<string, StoryEvent[]>>();
    for (const storyline of storylines) {
      eventsByStorylineAndDay.set(storyline.id, new Map());
    }
    for (const event of sortedEvents) {
      const storylineMap = eventsByStorylineAndDay.get(event.storylineId!);
      if (storylineMap) {
        const dayKey = getDayKey(event.date!);
        if (!storylineMap.has(dayKey)) storylineMap.set(dayKey, []);
        storylineMap.get(dayKey)!.push(event);
      }
    }
    const laneGeometries = new Map<string, { y: number; height: number }>();
    let currentY = 0;
    for (const storyline of storylines) {
      const storylineDayMap = eventsByStorylineAndDay.get(storyline.id);
      let maxColumnHeight = 0;
      if (storylineDayMap && storylineDayMap.size > 0) {
        for (const sameDayEvents of storylineDayMap.values()) {
          let currentColumnHeight = 0;
          for (let i = 0; i < sameDayEvents.length; i++) {
              const event = sameDayEvents[i];
              const isExpanded = expandedEvents.has(event.id);
              currentColumnHeight += isExpanded ? EVENT_CARD_HEIGHT : CAPSULE_HEIGHT;
              if (i < sameDayEvents.length - 1) {
                  const nextEvent = sameDayEvents[i + 1];
                  const isConnected = eventConnections.some(conn => (conn.fromEventId === event.id && conn.toEventId === nextEvent.id) || (conn.fromEventId === nextEvent.id && conn.toEventId === event.id));
                  currentColumnHeight += isConnected ? SAME_DAY_CONNECTED_EVENT_GAP : SAME_DAY_VERTICAL_GAP;
              }
          }
          maxColumnHeight = Math.max(maxColumnHeight, currentColumnHeight);
        }
      }
      const laneHeight = Math.max(MIN_LANE_HEIGHT, maxColumnHeight + 2 * LANE_VERTICAL_PADDING);
      laneGeometries.set(storyline.id, { y: currentY, height: laneHeight });
      currentY += laneHeight;
    }
    const totalHeight = currentY > 0 ? currentY : MIN_LANE_HEIGHT;

    const eventLayouts = new Map<string, {
      x: number; y: number; width: number; height: number; event: StoryEvent; storyline: Storyline; eventType: EventType;
    }>();

    for (const storyline of storylines) {
      const laneGeo = laneGeometries.get(storyline.id);
      if (!laneGeo) continue;
      const storylineDayMap = eventsByStorylineAndDay.get(storyline.id);
      if (storylineDayMap) {
        for (const [dayKey, sameDayEvents] of storylineDayMap.entries()) {
          const columnGeo = dayColumnGeometries.get(dayKey);
          if (columnGeo === undefined) continue;
          
          const baseX = columnGeo.x;
          
          let stackHeight = 0;
          for (let i = 0; i < sameDayEvents.length; i++) {
              const event = sameDayEvents[i];
              stackHeight += expandedEvents.has(event.id) ? EVENT_CARD_HEIGHT : CAPSULE_HEIGHT;
              if (i < sameDayEvents.length - 1) {
                  const nextEvent = sameDayEvents[i + 1];
                  const isConnected = eventConnections.some(conn => (conn.fromEventId === event.id && conn.toEventId === nextEvent.id) || (conn.fromEventId === nextEvent.id && conn.toEventId === event.id));
                  stackHeight += isConnected ? SAME_DAY_CONNECTED_EVENT_GAP : SAME_DAY_VERTICAL_GAP;
              }
          }

          const stackStartY = laneGeo.y + (laneGeo.height - stackHeight) / 2;
          let currentStackY = stackStartY;

          for (let i = 0; i < sameDayEvents.length; i++) {
            const event = sameDayEvents[i];
            const eventType = eventTypes.find(et => et.id === event.typeId);
            if (!eventType) continue;
            
            const indentationLevel = Math.min(eventIndentationLevels.get(event.id) || 0, MAX_INDENTATION_LEVEL);
            const xOffset = indentationLevel * INDENTATION_STEP;
            const x = baseX + xOffset;
            const width = EVENT_WIDTH;
            const height = expandedEvents.has(event.id) ? EVENT_CARD_HEIGHT : CAPSULE_HEIGHT;
            const y = currentStackY;
            
            eventLayouts.set(event.id, { x, y, width, height, event, storyline, eventType });
            
            let gap = SAME_DAY_VERTICAL_GAP;
            if (i < sameDayEvents.length - 1) {
                const nextEvent = sameDayEvents[i + 1];
                const isConnected = eventConnections.some(conn => (conn.fromEventId === event.id && conn.toEventId === nextEvent.id) || (conn.fromEventId === nextEvent.id && conn.toEventId === event.id));
                gap = isConnected ? SAME_DAY_CONNECTED_EVENT_GAP : SAME_DAY_VERTICAL_GAP;
            }
            currentStackY += height + gap;
          }
        }
      }
    }

    const connectionPaths = new Map<string, { path: string, from: {x:number, y:number}, to: {x:number, y:number} }>();
    const portUsage = new Map<string, { top: number; bottom: number; left: number; right: number; topTotal: number; bottomTotal: number; leftTotal: number; rightTotal: number; }>();

    for (const conn of eventConnections) {
        const from = eventLayouts.get(conn.fromEventId);
        const to = eventLayouts.get(conn.toEventId);
        if (!from || !to) continue;
        if (!portUsage.has(from.event.id)) portUsage.set(from.event.id, { top: 0, bottom: 0, left: 0, right: 0, topTotal: 0, bottomTotal: 0, leftTotal: 0, rightTotal: 0 });
        if (!portUsage.has(to.event.id)) portUsage.set(to.event.id, { top: 0, bottom: 0, left: 0, right: 0, topTotal: 0, bottomTotal: 0, leftTotal: 0, rightTotal: 0 });
        const fromUsage = portUsage.get(from.event.id)!;
        const toUsage = portUsage.get(to.event.id)!;
        const fromDayKey = getDayKey(from.event.date);
        const toDayKey = getDayKey(to.event.date);

        if (fromDayKey === toDayKey) {
            if (from.y < to.y) {
                fromUsage.bottomTotal++;
                toUsage.topTotal++;
            } else {
                fromUsage.topTotal++;
                toUsage.bottomTotal++;
            }
        } else {
            const fromColumnGeo = dayColumnGeometries.get(fromDayKey);
            const toColumnGeo = dayColumnGeometries.get(toDayKey);
            if (fromColumnGeo === undefined || toColumnGeo === undefined) continue;
            if (fromColumnGeo.x < toColumnGeo.x) {
                fromUsage.rightTotal++;
                toUsage.leftTotal++;
            } else {
                fromUsage.leftTotal++;
                toUsage.rightTotal++;
            }
        }
    }
    
    for (const conn of eventConnections) {
        const from = eventLayouts.get(conn.fromEventId);
        const to = eventLayouts.get(conn.toEventId);
        if (!from || !to) continue;
        const fromUsage = portUsage.get(from.event.id)!;
        const toUsage = portUsage.get(to.event.id)!;
        const fromDayKey = getDayKey(from.event.date);
        const toDayKey = getDayKey(to.event.date);
        
        let pathData: string;
        let fromPoint: { x: number; y: number; };
        let toPoint: { x: number; y: number; };

        if (fromDayKey === toDayKey) {
            const isFromOnTop = from.y < to.y;

            const startPort = isFromOnTop ? 'bottom' : 'top';
            const endPort = isFromOnTop ? 'top' : 'bottom';
            
            fromUsage[startPort]++;
            toUsage[endPort]++;
            
            const startX = from.x + from.width * (fromUsage[startPort] / (fromUsage[`${startPort}Total`] + 1));
            const startY = isFromOnTop ? from.y + from.height : from.y;

            const endX = to.x + to.width * (toUsage[endPort] / (toUsage[`${endPort}Total`] + 1));
            const endY = isFromOnTop ? to.y : to.y + to.height;

            const verticalOffset = Math.abs(endY - startY) / 2;
            const curveDirection = isFromOnTop ? 1 : -1;

            pathData = `M ${startX},${startY} C ${startX},${startY + verticalOffset * curveDirection} ${endX},${endY - verticalOffset * curveDirection} ${endX},${endY}`;
            fromPoint = { x: startX, y: startY };
            toPoint = { x: endX, y: endY };
        } else {
            const fromColumnGeo = dayColumnGeometries.get(fromDayKey);
            const toColumnGeo = dayColumnGeometries.get(toDayKey);
            if (fromColumnGeo === undefined || toColumnGeo === undefined) continue;

            const isForward = fromColumnGeo.x < toColumnGeo.x;
            const fromX = isForward ? from.x + from.width : from.x;
            const fromPort = isForward ? 'right' : 'left';
            fromUsage[fromPort]++;
            const fromY = from.y + from.height * (fromUsage[fromPort] / (fromUsage[`${fromPort}Total`] + 1));
            const toX = isForward ? to.x : to.x + to.width;
            const toPort = isForward ? 'left' : 'right';
            toUsage[toPort]++;
            const toY = to.y + to.height * (toUsage[toPort] / (toUsage[`${toPort}Total`] + 1));
            const controlPointOffset = (toX - fromX) * 0.5;
            pathData = `M ${fromX},${fromY} C ${fromX + controlPointOffset},${fromY} ${toX - controlPointOffset},${toY} ${toX},${toY}`;
            fromPoint = { x: fromX, y: fromY };
            toPoint = { x: toX, y: toY };
        }
        connectionPaths.set(conn.id, { path: pathData, from: fromPoint, to: toPoint });
    }
    
    return { eventLayouts, canvasWidth, totalHeight, laneGeometries, sortedUniqueDays, connectionPaths, eventsByDay, dayColumnGeometries };
  }, [events, storylines, eventTypes, expandedEvents, eventConnections, eraOrder]);
  
  const formatDisplayDayKey = (dayKey: string): string => {
    if (dayKey.startsWith('BC-')) {
        return `公元前 ${dayKey.substring(3)}`;
    }
    const gregorianMatch = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (gregorianMatch) {
        return `${gregorianMatch[1]}年${gregorianMatch[2]}月${gregorianMatch[3]}日`;
    }
    const parts = dayKey.split(' ');
    if (parts.length > 1) {
        return `${parts.slice(0, -1).join(' ')} ${parts[parts.length - 1]}年`;
    }
    return dayKey;
  };

  const getDropTarget = useCallback((xPos: number, yPos: number): { storylineId: string; date: string; } | null => {
      if (!laneGeometries.size) {
        if (storylines.length > 0) {
             return { storylineId: storylines[0].id, date: new Date().toISOString().split('T')[0].replace('T', ' ') + ' 00:00:00' };
        }
        return null;
      }
      
      const targetStoryline = storylines.find(s => {
          const geo = laneGeometries.get(s.id);
          return geo && yPos >= geo.y && yPos < geo.y + geo.height;
      });

      if (!targetStoryline) return null;

      let targetDate: string;
      let foundColumn = false;
      for (let i = 0; i < sortedUniqueDays.length; i++) {
        const dayKey = sortedUniqueDays[i];
        const geo = dayColumnGeometries.get(dayKey)!;
        const columnEnd = geo.x + geo.width + EVENT_GAP / 2;
        if (xPos < columnEnd) {
          targetDate = eventsByDay.get(dayKey)![0].date;
          foundColumn = true;
          break;
        }
      }

      if (!foundColumn) {
          const lastDayKey = sortedUniqueDays[sortedUniqueDays.length - 1];
          if (lastDayKey) {
              const lastDateStr = eventsByDay.get(lastDayKey)![0].date;
              const gregorianMatch = lastDateStr.match(/^(\d{4}-\d{2}-\d{2})/);
              if (gregorianMatch) {
                 const lastDate = new Date(gregorianMatch[1]);
                 lastDate.setDate(lastDate.getDate() + 1);
                 targetDate = `${lastDate.toISOString().split('T')[0]} 00:00:00`;
              } else {
                 targetDate = lastDateStr;
              }
          } else {
              targetDate = `${new Date().toISOString().split('T')[0]} 00:00:00`;
          }
      }
      
      return { storylineId: targetStoryline.id, date: targetDate! };
  }, [storylines, laneGeometries, sortedUniqueDays, eventsByDay, dayColumnGeometries]);

  const { highlightedEvents, highlightedConnectionInfo } = useMemo(() => {
    if (!hoveredEventId) {
      return { highlightedEvents: new Set<string>(), highlightedConnectionInfo: new Map<string, { color: string; index: number }>() };
    }
  
    const componentEvents = new Set<string>();
    const queue: string[] = [hoveredEventId];
    const visited = new Set<string>([hoveredEventId]);
  
    while (queue.length > 0) {
      const currentEventId = queue.shift()!;
      componentEvents.add(currentEventId);
  
      for (const conn of eventConnections) {
        let neighborId: string | null = null;
        if (conn.fromEventId === currentEventId) {
          neighborId = conn.toEventId;
        } else if (conn.toEventId === currentEventId) {
          neighborId = conn.fromEventId;
        }
  
        if (neighborId && !visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  
    const componentConnections = eventConnections.filter(
        conn => componentEvents.has(conn.fromEventId) && componentEvents.has(conn.toEventId)
    );

    const connectionsToHighlight = new Map<string, { color: string; index: number }>();
    const nodeColorUsage = new Map<string, Set<number>>();

    for (const conn of componentConnections) {
        const fromId = conn.fromEventId;
        const toId = conn.toEventId;
        if (!nodeColorUsage.has(fromId)) nodeColorUsage.set(fromId, new Set());
        if (!nodeColorUsage.has(toId)) nodeColorUsage.set(toId, new Set());
        const usedColorIndices = new Set([...nodeColorUsage.get(fromId)!, ...nodeColorUsage.get(toId)!]);
        let colorIndex = 0;
        while (usedColorIndices.has(colorIndex)) { colorIndex++; }
        const finalColorIndex = colorIndex % HIGHLIGHT_COLORS.length;
        connectionsToHighlight.set(conn.id, { color: HIGHLIGHT_COLORS[finalColorIndex], index: finalColorIndex });
        nodeColorUsage.get(fromId)!.add(finalColorIndex);
        nodeColorUsage.get(toId)!.add(finalColorIndex);
    }
  
    return { highlightedEvents: componentEvents, highlightedConnectionInfo: connectionsToHighlight };
  }, [hoveredEventId, eventConnections]);

  const displayWidth = laneHeaderWidth + Math.max(canvasWidth, containerWidth > 0 ? containerWidth - laneHeaderWidth : 0);

  const handleConnectionStart = useCallback((e: React.MouseEvent, eventId: string, startPos: { x: number; y: number }) => {
    e.stopPropagation();
    setConnectingState({ isConnecting: true, sourceEventId: eventId, sourcePos: startPos, endPos: startPos });

    const handleConnectionMove = (moveEvent: MouseEvent) => {
      const point = getTransformedSvgPoint(moveEvent);
      if (point) {
        setConnectingState(prev => ({ ...prev, endPos: point }));
      }
    };

    const handleConnectionEnd = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleConnectionMove);
      window.removeEventListener('mouseup', handleConnectionEnd);

      const point = getTransformedSvgPoint(upEvent);
      if (!point) {
        setConnectingState({ isConnecting: false, sourceEventId: null, sourcePos: null, endPos: null });
        return;
      }
      
      let droppedOnEventId: string | null = null;
      for (const [evtId, layout] of eventLayouts.entries()) {
        if (point.x >= layout.x && point.x <= layout.x + layout.width && point.y >= layout.y && point.y <= layout.y + layout.height) {
          droppedOnEventId = evtId;
          break;
        }
      }

      if (droppedOnEventId) {
        if (eventId && eventId !== droppedOnEventId) {
          const newConnection: EventConnection = { id: `conn-${Date.now()}`, fromEventId: eventId, toEventId: droppedOnEventId, description: '导致' };
          setEventConnections(prev => [...prev, newConnection]);
        }
      } else {
        const dropTarget = getDropTarget(point.x, point.y);
        if (dropTarget) {
            onAddEventRequest({ storylineId: dropTarget.storylineId, date: dropTarget.date, __connectFrom: eventId });
        }
      }

      setConnectingState({ isConnecting: false, sourceEventId: null, sourcePos: null, endPos: null });
    };

    window.addEventListener('mousemove', handleConnectionMove);
    window.addEventListener('mouseup', handleConnectionEnd);
  }, [ getTransformedSvgPoint, eventLayouts, onAddEventRequest, setEventConnections, getDropTarget ]);
  
  const handleStorylineDragStart = (e: React.DragEvent<HTMLDivElement>, storylineId: string) => {
    e.dataTransfer.setData('application/vnd.storyline-id', storylineId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedStorylineId(storylineId);
  };

  const handleStorylineDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedStorylineId && index !== dragOverIndex) { setDragOverIndex(index); }
  };

  const handleStorylineDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('application/vnd.storyline-id');
    setDragOverIndex(null);
    if (!draggedId) return;
    setStorylines(currentStorylines => {
        const draggedItemIndex = currentStorylines.findIndex(s => s.id === draggedId);
        if (draggedItemIndex === -1 || draggedItemIndex === dropIndex) { return currentStorylines; }
        const reorderedStorylines = [...currentStorylines];
        const [draggedItem] = reorderedStorylines.splice(draggedItemIndex, 1);
        reorderedStorylines.splice(dropIndex, 0, draggedItem);
        return reorderedStorylines;
    });
  };

  const handleStorylineDragEnd = () => {
    setDraggedStorylineId(null);
    setDragOverIndex(null);
  };
  
  const handleEventDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData('application/vnd.event-id', eventId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingEventId(eventId);
  };

  const handleCanvasDragOver = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!draggingEventId) return;
    const point = getTransformedSvgPoint(e);
    if (!point) return;
    const dropTarget = getDropTarget(point.x, point.y);
    if (dropTarget) {
        const laneGeo = laneGeometries.get(dropTarget.storylineId);
        const dayKey = getDayKey(dropTarget.date);
        
        const columnGeo = dayColumnGeometries.get(dayKey);
        let indicatorX: number;

        if (columnGeo) {
            indicatorX = columnGeo.x;
        } else { // New column after the last one
            if (sortedUniqueDays.length > 0) {
                const lastDayKey = sortedUniqueDays[sortedUniqueDays.length - 1];
                const lastGeo = dayColumnGeometries.get(lastDayKey)!;
                indicatorX = lastGeo.x + lastGeo.width + EVENT_GAP;
            } else {
                indicatorX = PADDING_X;
            }
        }
        
        if (laneGeo) {
            setDropIndicator({ 
              x: indicatorX - EVENT_GAP / 2, 
              y: laneGeo.y, 
              height: laneGeo.height - 20, 
              storylineId: dropTarget.storylineId, 
              date: dropTarget.date 
            });
        }
    }
  };
  
  const handleCanvasDrop = (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('application/vnd.event-id');
    if (!eventId || !dropIndicator) return;
    setEvents(prev => prev.map(event => event.id === eventId ? { ...event, storylineId: dropIndicator.storylineId, date: dropIndicator.date } : event));
    handleEventDragEnd();
  };

  const handleEventDragEnd = () => {
    setDraggingEventId(null);
    setDropIndicator(null);
  };
  
  const handleDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (!svgRef.current) return;
    const point = getTransformedSvgPoint(e);
    if (!point) return;
    const dropTarget = getDropTarget(point.x, point.y);
    if(dropTarget) {
      onAddEventRequest({ storylineId: dropTarget.storylineId, date: dropTarget.date });
    }
  };

  return (
    <div ref={scrollContainerRef} className="w-full h-full overflow-auto bg-gray-900">
        <div 
          className="grid" 
          style={{
            gridTemplateColumns: `${laneHeaderWidth}px 1fr`,
            gridTemplateRows: `${RULER_HEIGHT}px 1fr`,
            width: displayWidth,
            height: totalHeight + RULER_HEIGHT,
          }}
          onDragLeave={() => setDragOverIndex(null)}
        >
          <div className="sticky top-0 left-0 z-20 p-4 box-border flex items-center justify-center text-md font-bold text-gray-400 border-r border-b border-gray-700 bg-gray-900">
            时间轴
          </div>

          <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700">
            <svg width={displayWidth - laneHeaderWidth} height={RULER_HEIGHT} className="block">
                {Array.from(dayColumnGeometries.entries()).map(([dayKey, geo]) => {
                    return (
                        <g key={dayKey} transform={`translate(${geo.x + geo.width / 2}, 0)`}>
                            <line y1={RULER_HEIGHT - 10} y2={RULER_HEIGHT} stroke="#6b7280" />
                            <text y={RULER_HEIGHT - 15} textAnchor="middle" fill="#a0a0a0" fontSize="12">
                                {formatDisplayDayKey(dayKey)}
                            </text>
                        </g>
                    );
                })}
            </svg>
          </div>

          <div className="sticky left-0 z-10">
            {storylines.map((storyline, index) => {
                const isDragging = draggedStorylineId === storyline.id;
                const isDragTarget = dragOverIndex === index && draggedStorylineId !== storyline.id;
                const laneGeo = laneGeometries.get(storyline.id);
                if (!laneGeo) return null;

                return (
                    <div 
                        key={storyline.id}
                        draggable="true"
                        onDragStart={(e) => handleStorylineDragStart(e, storyline.id)}
                        onDragOver={(e) => handleStorylineDragOver(e, index)}
                        onDrop={(e) => handleStorylineDrop(e, index)}
                        onDragEnd={handleStorylineDragEnd}
                        className="px-4 box-border flex items-center transition-opacity cursor-grab group border-r border-gray-700"
                        style={{ 
                            height: laneGeo.height,
                            backgroundColor: index % 2 === 0 ? '#181818' : '#222222',
                            opacity: isDragging ? 0.4 : 1,
                        }}
                    >
                        {isDragTarget && <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 z-10" />}
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <GrabberIcon />
                        </div>
                        <h3 
                            className="text-md font-bold truncate pl-6 flex items-center"
                            style={{ color: storyline.color, width: '100%', height: '100%' }}
                            title={storyline.name}
                        >
                           <span className="truncate" style={{ textOverflow: 'ellipsis' }}>{storyline.name}</span>
                        </h3>
                    </div>
                );
            })}
          </div>

          <div className="relative bg-gray-900">
            <svg 
                ref={svgRef} 
                width={canvasWidth} 
                height={totalHeight}
                onDragOver={handleCanvasDragOver}
                onDrop={handleCanvasDrop}
                onDragLeave={() => setDropIndicator(null)}
                className="absolute top-0 left-0"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#888" /></marker>
                 {HIGHLIGHT_COLORS.map((color, i) => (
                    <marker key={`arrow-highlight-${i}`} id={`arrow-highlighted-${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="userSpaceOnUse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                    </marker>
                  ))}
                <marker id="arrow-connecting" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" /></marker>
              </defs>
              
              <rect x="0" y="0" width={canvasWidth} height={totalHeight} fill="transparent" onDoubleClick={handleDoubleClick} />
              
              {storylines.map((storyline, index) => {
                  const geo = laneGeometries.get(storyline.id);
                  if (!geo) return null;
                  return <rect key={`lane-bg-${storyline.id}`} x="0" y={geo.y} width={canvasWidth} height={geo.height} fill={index % 2 === 0 ? 'rgba(30, 30, 30, 0.5)' : 'rgba(45, 45, 45, 0.5)'} style={{ pointerEvents: 'none' }}/>
              })}
              {storylines.map((storyline) => {
                  const geo = laneGeometries.get(storyline.id);
                  if (!geo) return null;
                  return <line key={`lane-line-${storyline.id}`} x1="0" y1={geo.y + geo.height} x2={canvasWidth} y2={geo.y + geo.height} stroke="#4a4a4a" strokeDasharray="4" />
              })}

              <g>
                {Array.from(connectionPaths.entries()).map(([connId, { path, from, to }]) => {
                  const highlightInfo = highlightedConnectionInfo.get(connId);
                  const isHighlighted = !!highlightInfo;
                  const isChainHovered = hoveredEventId !== null;
                  const opacity = isChainHovered ? (isHighlighted ? 1 : 0) : 1;
                  const color = isHighlighted ? highlightInfo.color : '#6b7280';
                  const strokeWidth = 2;
                  const markerUrl = isHighlighted ? `url(#arrow-highlighted-${highlightInfo.index})` : 'url(#arrow)';

                  return (
                    <g key={connId} style={{ opacity, transition: 'opacity 0.3s ease-in-out', pointerEvents: 'none' }}>
                      <path d={path} stroke={color} strokeWidth={strokeWidth} fill="none" markerEnd={markerUrl} style={{ transition: 'all 0.3s ease-in-out' }} />
                      <circle cx={from.x} cy={from.y} r={4} fill={color} style={{ transition: 'all 0.3s' }} />
                    </g>
                  );
                })}
              </g>

              <g>
                  {Array.from(eventLayouts.values()).map(({ x, y, width, height, event, storyline, eventType }) => {
                  const isExpanded = expandedEvents.has(event.id);
                  const isEventHighlighted = highlightedEvents.has(event.id);
                  const isNodeHovered = nodeHoverEventId === event.id;
                  const isDraggingThis = draggingEventId === event.id;
                  const groupOpacity = isDraggingThis ? 0.4 : (hoveredEventId === null ? 1 : isEventHighlighted ? 1 : 0.3);
                  const chevronDownPath = "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z";
                  const chevronUpPath = "M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z";
                  const HEADER_HEIGHT = 28;
                  const BORDER_RADIUS = 8;
                  
                  return (
                      <g 
                          key={event.id}
                          className="event-card-group"
                          transform={`translate(${x}, ${y})`}
                          style={{ transition: 'opacity 0.3s, transform 0.3s ease-in-out', opacity: groupOpacity, cursor: 'grab' }}
                          onMouseEnter={() => { setHoveredEventId(event.id); setNodeHoverEventId(event.id); }}
                          onMouseLeave={() => { setHoveredEventId(null); setNodeHoverEventId(null); }}
                          // @ts-ignore: The 'draggable' attribute is supported by modern browsers on SVG elements, but not in React's SVG types.
                          draggable="true"
                          onDragStart={(e) => handleEventDragStart(e, event.id)}
                          onDragEnd={handleEventDragEnd}
                      >
                      {isExpanded ? (
                          <>
                          <g onClick={() => onEventClick(event)} style={{ cursor: 'pointer' }}>
                              <path d={`M 0 ${HEADER_HEIGHT} H ${width} V ${height - BORDER_RADIUS} Q ${width} ${height}, ${width - BORDER_RADIUS} ${height} H ${BORDER_RADIUS} Q 0 ${height}, 0 ${height - BORDER_RADIUS} Z`} fill="#2d2d2d" />
                              <text x="12" y={HEADER_HEIGHT + 20} fill="#a0a0a0" fontSize="12" className="pointer-events-none">{formatDisplayDate(event.date, eraOrder)}</text>
                              <foreignObject x="12" y={HEADER_HEIGHT + 35} width={width - 24} height="45" className="pointer-events-none">
                                  <p className="text-xs text-gray-400 overflow-hidden text-ellipsis" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{event.description}</p>
                              </foreignObject>
                          </g>
                          
                          <g onMouseDown={(e) => { e.stopPropagation(); toggleEventExpansion(event.id); }} style={{ cursor: 'pointer' }}>
                              <path d={`M 0 ${BORDER_RADIUS} Q 0 0, ${BORDER_RADIUS} 0 H ${width - BORDER_RADIUS} Q ${width} 0, ${width} ${BORDER_RADIUS} V ${HEADER_HEIGHT} H 0 Z`} fill={eventType.color || '#71717a'} />
                              <text x="12" y={HEADER_HEIGHT / 2} dy=".3em" fill="#fff" fontSize="14" fontWeight="bold" className="pointer-events-none" style={{textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}>{event.title}</text>
                              <g transform={`translate(${width - 32}, ${(HEADER_HEIGHT - 20) / 2})`}>
                              <rect x="0" y="0" width="20" height="20" rx="4" fill="rgba(0,0,0,0.2)" />
                              <svg x="0" y="0" width="20" height="20" viewBox="0 0 20 20" fill="white">
                                  <path fillRule="evenodd" d={chevronUpPath} clipRule="evenodd" />
                              </svg>
                              </g>
                          </g>
                          
                          <path d={`M 0 ${BORDER_RADIUS} Q 0 0, ${BORDER_RADIUS} 0 H ${width - BORDER_RADIUS} Q ${width} 0, ${width} ${BORDER_RADIUS} V ${height - BORDER_RADIUS} Q ${width} ${height}, ${width - BORDER_RADIUS} ${height} H ${BORDER_RADIUS} Q 0 ${height}, 0 ${height - BORDER_RADIUS} Z`} fill="none" stroke={storyline.color || '#555'} strokeWidth={isEventHighlighted ? 3 : 2} className="pointer-events-none" style={{ transition: 'stroke-width 0.3s' }}/>
                          </>
                      ) : (
                          <>
                          <g onClick={() => toggleEventExpansion(event.id)} style={{ cursor: 'pointer' }}>
                              <rect x="0" y="0" width={width} height={height} rx={height/2} fill="#2d2d2d" stroke={storyline.color || '#555'} strokeWidth={isEventHighlighted ? 3 : 2} style={{ transition: 'stroke-width 0.3s' }}/>
                              <circle cx="20" cy={height / 2} r="6" fill={eventType.color || '#71717a'} />
                              <text x="35" y={height / 2} dy=".3em" fill="#e0e0e0" fontSize="14" fontWeight="bold" className="pointer-events-none">{event.title}</text>
                          </g>
                          <g onMouseDown={(e) => { e.stopPropagation(); toggleEventExpansion(event.id); }} style={{ cursor: 'pointer' }}>
                              <rect x={width - 32} y={(height-24)/2} width="24" height="24" rx="12" fill="transparent" />
                              <svg x={width - 30} y={(height-20)/2} width="20" height="20" viewBox="0 0 20 20" fill="#a0a0a0">
                                  <path fillRule="evenodd" d={chevronDownPath} clipRule="evenodd" />
                              </svg>
                          </g>
                          </>
                      )}
                      
                      <circle
                          cx={width}
                          cy={height / 2}
                          r={8}
                          fill={storyline.color || '#a0a0a0'}
                          stroke="#121212"
                          strokeWidth="2"
                          style={{ cursor: 'crosshair', opacity: isNodeHovered ? 1 : 0, transition: 'opacity 0.2s' }}
                          onMouseDown={(e) => handleConnectionStart(e, event.id, { x: x + width, y: y + height / 2 })}
                          />
                      </g>
                  );
                  })}
              </g>

              
              {dropIndicator && (
                 <g>
                  <line
                      x1={dropIndicator.x}
                      y1={dropIndicator.y + 10}
                      x2={dropIndicator.x}
                      y2={dropIndicator.y + dropIndicator.height}
                      stroke="#3b82f6"
                      strokeWidth="4"
                      strokeDasharray="8 6"
                      style={{ pointerEvents: 'none' }}
                  />
                 </g>
              )}
              
              {connectingState.isConnecting && connectingState.sourcePos && connectingState.endPos && (
                (() => {
                  const { sourcePos, endPos } = connectingState;
                  const offset = Math.max(30, Math.abs(endPos.x - sourcePos.x) * 0.4);
                  const pathData = `M ${sourcePos.x},${sourcePos.y} C ${sourcePos.x + offset},${sourcePos.y} ${endPos.x - offset},${endPos.y} ${endPos.x},${endPos.y}`;
                  return (
                    <path
                      d={pathData}
                      stroke="#f59e0b"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="5 5"
                      markerEnd="url(#arrow-connecting)"
                      style={{ pointerEvents: 'none' }}
                    />
                  );
                })()
              )}
            </svg>
          </div>
        </div>
    </div>
  );
};

export default TimelineView;