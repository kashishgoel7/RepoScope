import React from 'react';

const MetricCard = ({ title, value, icon: Icon, description, gradient, trend }) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/40">
      {/* Decorative gradient overlay */}
      {gradient && (
        <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-10 blur-2xl ${gradient}`} />
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/80 text-indigo-400 border border-slate-700">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-white">
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            trend.isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/25'
          }`}>
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
