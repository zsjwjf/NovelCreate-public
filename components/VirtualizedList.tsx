import React, { useState, useRef, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, style: React.CSSProperties) => React.ReactNode;
  containerHeight: number;
}

const VirtualizedList = <T extends { id: any }>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
}: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = items.length * itemHeight;

  const { visibleItems } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2); // Render a few items before
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + 2 // Render a few items after
    );

    const visible = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        visible.push({
          item: items[i],
          style: {
            position: 'absolute' as const,
            top: `${i * itemHeight}px`,
            height: `${itemHeight}px`,
            width: '100%',
            paddingBottom: '4px', // Space between items
          },
        });
      }
    }
    return { visibleItems: visible };
  }, [scrollTop, itemHeight, containerHeight, items]);


  return (
    <div
      ref={containerRef}
      style={{ height: Math.min(totalHeight, containerHeight), overflowY: 'auto', position: 'relative' }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, style }) => renderItem(item, style))}
      </div>
    </div>
  );
};

export default VirtualizedList;
