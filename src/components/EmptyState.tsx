import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4 text-center"
  >
    <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">{description}</p>
    <div className="flex items-center gap-3">
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">{actionLabel}</Button>
      )}
      {secondaryLabel && onSecondary && (
        <Button onClick={onSecondary} variant="outline" size="sm">{secondaryLabel}</Button>
      )}
    </div>
  </motion.div>
);

export default EmptyState;
