'use client';

import { LucideIcon, X, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FABMenuItem {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FABMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: FABMenuItem[];
}

export function FABMenu({ isOpen, onClose, items }: FABMenuProps) {
  const defaultItems: FABMenuItem[] = items || [
    {
      icon: Clock,
      label: 'Registra Presenza',
      onClick: () => {
        // Navigate to insert rapportino
        window.location.href = '/mobile/presenze/nuovo';
      },
      color: 'bg-emerald-600',
    },
    {
      icon: FileText,
      label: 'Invia Richiesta',
      onClick: () => {
        // Navigate to new request
        window.location.href = '/mobile/richieste/nuova';
      },
      color: 'bg-blue-600',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[55] backdrop-blur-sm"
          />

          {/* Menu Items */}
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[65] flex flex-col-reverse gap-4">
            {defaultItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => {
                    item.onClick();
                    onClose();
                  }}
                  className="flex items-center gap-3 bg-white rounded-full shadow-xl px-6 py-4 hover:shadow-2xl transition-shadow"
                >
                  <div className={`${item.color || 'bg-emerald-600'} rounded-full p-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 pr-2">{item.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Close Button (FAB transforms to X) */}
          <motion.button
            initial={{ rotate: 0 }}
            animate={{ rotate: 45 }}
            exit={{ rotate: 0 }}
            onClick={onClose}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border-4 border-emerald-600"
          >
            <X className="w-8 h-8 text-emerald-600 stroke-[3]" />
          </motion.button>
        </>
      )}
    </AnimatePresence>
  );
}
