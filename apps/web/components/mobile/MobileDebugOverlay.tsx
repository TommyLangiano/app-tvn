'use client';

import { useState, useEffect } from 'react';

/**
 * DEBUG COMPONENT - Mostra dimensioni viewport e safe areas in tempo reale
 * 
 * Usage:
 * Importare in layout.tsx e aggiungere prima della chiusura del div principale:
 * 
 * import { MobileDebugOverlay } from '@/components/mobile/MobileDebugOverlay';
 * 
 * // Nel return, prima della chiusura </div>:
 * {process.env.NODE_ENV === 'development' && <MobileDebugOverlay />}
 */
export function MobileDebugOverlay() {
  const [dimensions, setDimensions] = useState({
    viewportWidth: 0,
    viewportHeight: 0,
    safeTop: 0,
    safeBottom: 0,
    safeLeft: 0,
    safeRight: 0,
    scrollY: 0,
    contentHeight: 0,
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      // Get safe area values
      const computedStyle = getComputedStyle(document.documentElement);
      const safeTop = parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0') || 
                      parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0') || 0;
      const safeBottom = parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0') || 
                         parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0') || 0;
      const safeLeft = parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0') || 
                       parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0') || 0;
      const safeRight = parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0') || 
                        parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0') || 0;

      const main = document.querySelector('main');
      
      setDimensions({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        safeTop,
        safeBottom,
        safeLeft,
        safeRight,
        scrollY: window.scrollY,
        contentHeight: main?.scrollHeight || 0,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('scroll', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
    };
  }, []);

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed top-2 right-2 z-[100] bg-black/80 text-white px-3 py-1 rounded-full text-xs font-mono"
      >
        Debug
      </button>
    );
  }

  const paddingBottom = 90 + dimensions.safeBottom + 16;
  const cardPosition = 90 + dimensions.safeBottom + 8;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/95 text-white p-4 font-mono text-xs">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
      >
        Close
      </button>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-emerald-400 font-bold mb-1">Viewport</div>
          <div>Width: {dimensions.viewportWidth}px</div>
          <div>Height: {dimensions.viewportHeight}px</div>
          <div>ScrollY: {dimensions.scrollY}px</div>
          <div>Content: {dimensions.contentHeight}px</div>
        </div>

        <div>
          <div className="text-emerald-400 font-bold mb-1">Safe Area</div>
          <div>Top: {dimensions.safeTop}px</div>
          <div>Bottom: {dimensions.safeBottom}px</div>
          <div>Left: {dimensions.safeLeft}px</div>
          <div>Right: {dimensions.safeRight}px</div>
        </div>

        <div className="col-span-2 border-t border-gray-700 pt-2 mt-2">
          <div className="text-amber-400 font-bold mb-1">Layout Calc</div>
          <div>Main padding-bottom: {paddingBottom}px</div>
          <div className="text-xs text-gray-400">
            (90px navbar + {dimensions.safeBottom}px safe + 16px gap)
          </div>
          <div className="mt-1">Card fixed bottom: {cardPosition}px</div>
          <div className="text-xs text-gray-400">
            (90px navbar + {dimensions.safeBottom}px safe + 8px gap)
          </div>
        </div>

        <div className="col-span-2 border-t border-gray-700 pt-2 mt-2">
          <div className="text-blue-400 font-bold mb-1">Visible Area</div>
          <div>Navbar height: 90px + {dimensions.safeBottom}px = {90 + dimensions.safeBottom}px</div>
          <div>Available content: {dimensions.viewportHeight - (90 + dimensions.safeBottom)}px</div>
        </div>
      </div>
    </div>
  );
}
