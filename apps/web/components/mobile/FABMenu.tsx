'use client';

import { LucideIcon, X, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { memo, useCallback } from 'react';

interface FABMenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  color?: string;
}

interface FABMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items?: FABMenuItem[];
}

const MenuItem = memo(({ item, index, onClick }: { item: FABMenuItem; index: number; onClick: () => void }) => {
  const Icon = item.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.8 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="flex items-center gap-3 bg-white rounded-2xl shadow-xl px-6 py-4 hover:shadow-2xl transition-shadow border-2 border-gray-200"
    >
      <div className={`${item.color || 'bg-emerald-600'} rounded-xl p-3`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="font-semibold text-gray-900 pr-2">{item.label}</span>
    </motion.button>
  );
});

MenuItem.displayName = 'MenuItem';

export const FABMenu = memo(({ isOpen, onClose, items }: FABMenuProps) => {
  const router = useRouter();

  const defaultItems: FABMenuItem[] = items || [
    {
      icon: Clock,
      label: 'Registra Presenza',
      href: '/mobile/presenze/nuovo',
      color: 'bg-emerald-600',
    },
    {
      icon: FileText,
      label: 'Invia Richiesta',
      href: '/mobile/richieste/nuova',
      color: 'bg-blue-600',
    },
  ];

  const handleItemClick = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[55] backdrop-blur-sm"
          />

          <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[65] flex flex-col-reverse gap-3">
            {defaultItems.map((item, index) => (
              <MenuItem
                key={index}
                item={item}
                index={index}
                onClick={() => handleItemClick(item.href)}
              />
            ))}
          </div>
        </>
      )}
    </AnimatePresence>
  );
});

FABMenu.displayName = 'FABMenu';
