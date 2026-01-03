/**
 * People You May Know Page
 * Story 9.2.2: PYMK Engine
 */

import React from 'react';
import { PYMKGrid } from '../components/pymk/PYMKGrid';

export function PYMKPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <PYMKGrid />
    </div>
  );
}
