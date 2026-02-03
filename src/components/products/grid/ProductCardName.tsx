import React from 'react';

interface ProductCardNameProps {
    name: string;
    className?: string;
}

export const ProductCardName: React.FC<ProductCardNameProps> = ({ name, className = '' }) => {
    return (
        <h3
            className={`mt-2 text-sm md:text-base font-medium text-gray-900 truncate w-full ${className}`}
            title={name}
        >
            {name}
        </h3>
    );
};
