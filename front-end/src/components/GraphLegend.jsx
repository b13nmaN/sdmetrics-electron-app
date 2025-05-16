// src/components/GraphLegend.jsx
import React from 'react';

const legendItems = [
    { style: { type: 'node', shape: 'round-rectangle', bgColor: '#E0F2FE', borderColor: '#38BDF8', borderW: 2 }, label: 'Package' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#3b82f6', borderColor: '#2563eb', borderW: 2 }, label: 'Class' },
    { style: { type: 'node', shape: 'triangle', bgColor: '#F59E0B', borderColor: '#D97706', borderW: 2 }, label: 'Parent Class' },
    { style: { type: 'node', shape: 'round-rectangle', bgColor: '#8b5cf6', borderColor: '#7c3aed', borderW: 2 }, label: 'Interface' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#3b82f6', borderColor: '#2563eb', borderW: 2, borderStyle: 'dashed', fontStyle: 'italic' }, label: 'Abstract Class' },
    { style: { type: 'edge', lineStyle: 'solid', color: '#ef4444', arrow: 'hollow-triangle' }, label: 'Inheritance' },
    { style: { type: 'edge', lineStyle: 'dashed', color: '#8b5cf6', arrow: 'hollow-triangle', dashPattern: '6,3' }, label: 'Implementation' },
    { style: { type: 'edge', lineStyle: 'solid', color: '#f97316', arrow: 'none' }, label: 'Association' },
    { style: { type: 'edge', lineStyle: 'dashed', color: '#f97316', arrow: 'none', dashPattern: '5,5' }, label: 'Inter-Package Assoc.' },
    { style: { type: 'edge', lineStyle: 'dashed', color: '#22c55e', arrow: 'vee', dashPattern: '4,2' }, label: 'Dependency' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#E53E3E', borderColor: '#C53030', borderW: 2 }, label: 'Highly Coupled Class' },
    { style: { type: 'node', shape: 'ellipse', bgColor: '#DD6B20', borderColor: '#C05621', borderW: 2 }, label: 'Low Cohesion Class' },
];

const GraphLegend = ({ isVisible }) => {
  return (
    <div
      id="uml-legend-react"
      className={`
        absolute bottom-4 left-4 z-50 
        bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-3.5 
        border border-gray-300 dark:border-slate-700 rounded-lg 
        shadow-xl 
        grid grid-cols-2 gap-x-5 gap-y-2.5 
        text-xs font-sans text-gray-700 dark:text-gray-300
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95 pointer-events-none'}
      `}
      style={{ maxWidth: '430px' }}
    >
      {legendItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2.5">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: item.style.type === 'edge' ? '35px' : '20px',
              height: item.style.type === 'edge' ? '15px' : '20px',
              backgroundColor: item.style.type === 'node' && item.style.shape !== 'triangle' ? item.style.bgColor : 'transparent',
              border: item.style.type === 'node' && item.style.shape !== 'triangle' ? `${item.style.borderW || 1}px ${item.style.borderStyle || 'solid'} ${item.style.borderColor}` : 'none',
              borderRadius: item.style.type === 'node'
                ? (item.style.shape === 'ellipse' ? '50%' : (item.style.shape === 'round-rectangle' ? '4px' : '0'))
                : '0',
              position: 'relative',
            }}
          >
            {item.style.type === 'node' && item.style.shape === 'triangle' && (
              <>
                <div style={{ /* Outer border simulation for triangle */
                  position: 'absolute', top: '1.5px', left: '-11.5px', width: 0, height: 0,
                  borderLeft: '11.5px solid transparent', borderRight: '11.5px solid transparent',
                  borderBottom: `21px solid ${item.style.borderColor}`, zIndex: 1,
                }} />
                <div style={{ /* Inner color for triangle */
                  position: 'absolute', top: '0px', left: '-10px', width: 0, height: 0,
                  borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
                  borderBottom: `18px solid ${item.style.bgColor}`, zIndex: 2,
                }} />
              </>
            )}

            {item.style.type === 'edge' && (
              <div className="w-full h-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-full h-[2px]"
                  style={{
                    backgroundColor: (!item.style.lineStyle || item.style.lineStyle === 'solid') ? item.style.color : 'transparent',
                    backgroundImage: item.style.lineStyle === 'dashed'
                      ? `linear-gradient(to right, ${item.style.color} ${item.style.dashPattern.split(',')[0]}px, transparent ${item.style.dashPattern.split(',')[0]}px)`
                      : 'none',
                    backgroundSize: item.style.lineStyle === 'dashed'
                      ? `${item.style.dashPattern.split(',').map(Number).reduce((a, b) => a + b, 0)}px 2px`
                      : 'auto',
                    backgroundRepeat: item.style.lineStyle === 'dashed' ? 'repeat-x' : 'no-repeat',
                  }}
                />
                {item.style.arrow && item.style.arrow !== 'none' && (
                  <div
                    className="absolute right-[-2px] top-1/2 -translate-y-1/2 w-0 h-0"
                    style={{
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: item.style.arrow === 'vee' || item.style.arrow === 'hollow-triangle' ? `7px solid ${item.style.color}` : 'none',
                    }}
                  >
                    {item.style.arrow === 'hollow-triangle' && (
                      <div
                        className="absolute top-[-3px] left-[-6px] w-0 h-0"
                        style={{
                          borderTop: '3px solid transparent',
                          borderBottom: '3px solid transparent',
                          // Attempt to match legend background for hollow effect
                          borderLeft: `4px solid ${document.documentElement.classList.contains('dark') ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.9)'}`, 
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <span style={{ fontStyle: item.style.fontStyle || 'normal', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default GraphLegend;