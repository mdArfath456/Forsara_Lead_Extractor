import { motion } from 'framer-motion';

export function StatCard({ label, value, icon: Icon, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="rounded-2xl glass-panel glass-panel-hover p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand-gradient/20 flex items-center justify-center">
            <Icon size={16} className="text-brand-400" />
          </div>
        )}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
    </motion.div>
  );
}
