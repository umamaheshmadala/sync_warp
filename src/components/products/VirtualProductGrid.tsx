import React from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Product } from '../../types/product';

interface VirtualProductGridProps {
    products: Product[];
    renderCard: (product: Product, index: number) => React.ReactNode;
    columnCount?: number;
    cardHeight?: number;
    cardWidth?: number;
    gap?: number;
}

export function VirtualProductGrid({
    products,
    renderCard,
    columnCount = 2,
    cardHeight = 320,
    cardWidth = 180,
    gap = 12
}: VirtualProductGridProps) {
    // Calculate viewport width
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const containerWidth = Math.min(viewportWidth - 32, 1024); // max-w-4xl with padding

    // Calculate actual column count based on viewport
    const actualColumns = Math.floor(containerWidth / (cardWidth + gap));
    const cols = Math.min(actualColumns, columnCount);

    // Calculate row count
    const rowCount = Math.ceil(products.length / cols);

    // Grid dimensions
    const gridWidth = containerWidth;
    const gridHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 600;

    const Cell = ({ columnIndex, rowIndex, style }: any) => {
        const index = rowIndex * cols + columnIndex;
        if (index >= products.length) return null;

        const product = products[index];

        return (
            <div
                style={{
                    ...style,
                    padding: `${gap / 2}px`,
                    left: Number(style.left) + gap / 2,
                    top: Number(style.top) + gap / 2,
                    width: Number(style.width) - gap,
                    height: Number(style.height) - gap
                }}
            >
                {renderCard(product, index)}
            </div>
        );
    };

    return (
        <Grid
            columnCount={cols}
            columnWidth={(containerWidth - gap) / cols}
            height={gridHeight}
            rowCount={rowCount}
            rowHeight={cardHeight + gap}
            width={gridWidth}
            overscanRowCount={2}
            style={{ margin: '0 auto' }}
        >
            {Cell}
        </Grid>
    );
}
