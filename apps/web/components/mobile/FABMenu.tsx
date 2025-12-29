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
          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[65] flex flex-col-reverse gap-3">
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
                  className="flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 hover:shadow-2xl transition-shadow border-2 border-gray-200"
                >
                  <div className={`${item.color || 'bg-emerald-600'} rounded-xl p-3`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-gray-900 pr-2">{item.label}</span>
                </motion.button>
              );
            })}
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
