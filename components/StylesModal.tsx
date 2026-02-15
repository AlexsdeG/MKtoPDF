import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Palette, Type, Layout, MessageSquare } from 'lucide-react';
import { StyleSettings, DEFAULT_STYLE_SETTINGS, CALLOUT_TYPES } from '../lib/styleSettings';
import clsx from 'clsx';

interface StylesModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: StyleSettings;
    onSettingsChange: (settings: StyleSettings) => void;
}

type TabId = 'typography' | 'colors' | 'callouts' | 'layout';

const TABS: { id: TabId; label: string; icon: React.FC<any> }[] = [
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'callouts', label: 'Callouts', icon: MessageSquare },
    { id: 'layout', label: 'Layout', icon: Layout },
];

const ColorInput: React.FC<{
    label: string;
    value: string;
    onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between gap-3">
        <label className="text-sm text-gray-600 font-medium">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
                style={{ padding: 0 }}
            />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-20 px-2 py-1 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md"
            />
        </div>
    </div>
);

const SliderInput: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600 font-medium">{label}</label>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);

export const StylesModal: React.FC<StylesModalProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('typography');
    const [localSettings, setLocalSettings] = useState<StyleSettings>(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Live update as user changes settings
    const update = (patch: Partial<StyleSettings>) => {
        const next = { ...localSettings, ...patch };
        setLocalSettings(next);
        onSettingsChange(next);
    };

    const updateCalloutColor = (type: string, color: string) => {
        const calloutColors = { ...localSettings.calloutColors, [type]: color };
        update({ calloutColors });
    };

    const resetCalloutColor = (type: string) => {
        const calloutColors = { ...localSettings.calloutColors };
        delete calloutColors[type];
        update({ calloutColors });
    };

    const handleReset = () => {
        setLocalSettings(DEFAULT_STYLE_SETTINGS);
        onSettingsChange(DEFAULT_STYLE_SETTINGS);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                            <Palette size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Style Settings</h2>
                            <p className="text-xs text-gray-500">Customize your preview appearance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                            title="Reset to defaults"
                        >
                            <RotateCcw size={13} />
                            Reset
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 gap-1 bg-gray-50/50">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                                activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            )}
                        >
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {activeTab === 'typography' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600 font-medium">Font Family</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['sans', 'serif', 'mono'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => update({ fontFamily: f })}
                                            className={clsx(
                                                'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
                                                localSettings.fontFamily === f
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            )}
                                            style={{
                                                fontFamily: f === 'sans' ? 'Inter, sans-serif'
                                                    : f === 'serif' ? 'Georgia, serif'
                                                        : 'Fira Code, monospace'
                                            }}
                                        >
                                            {f === 'sans' ? 'Sans Serif' : f === 'serif' ? 'Serif' : 'Monospace'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <SliderInput
                                label="Font Size"
                                value={localSettings.fontSize}
                                min={12}
                                max={24}
                                step={1}
                                unit="px"
                                onChange={(v) => update({ fontSize: v })}
                            />
                            <SliderInput
                                label="Line Height"
                                value={localSettings.lineHeight}
                                min={1.2}
                                max={2.2}
                                step={0.1}
                                onChange={(v) => update({ lineHeight: v })}
                            />
                        </>
                    )}

                    {activeTab === 'colors' && (
                        <div className="space-y-4">
                            <ColorInput
                                label="Accent Color"
                                value={localSettings.accentColor}
                                onChange={(v) => update({ accentColor: v })}
                            />
                            <ColorInput
                                label="Heading Color"
                                value={localSettings.headingColor}
                                onChange={(v) => update({ headingColor: v })}
                            />
                            <ColorInput
                                label="Text Color"
                                value={localSettings.textColor}
                                onChange={(v) => update({ textColor: v })}
                            />
                            <ColorInput
                                label="Background"
                                value={localSettings.backgroundColor}
                                onChange={(v) => update({ backgroundColor: v })}
                            />
                            <ColorInput
                                label="Code Background"
                                value={localSettings.codeBgColor}
                                onChange={(v) => update({ codeBgColor: v })}
                            />
                        </div>
                    )}

                    {activeTab === 'callouts' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 mb-2">
                                Customize the accent color for each callout type. Click reset to use the default.
                            </p>
                            {Object.entries(CALLOUT_TYPES).map(([type, def]) => {
                                const customColor = localSettings.calloutColors[type];
                                const currentColor = customColor || def.color;
                                return (
                                    <div key={type} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/80 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{def.icon}</span>
                                            <div>
                                                <span className="text-sm font-semibold capitalize text-gray-800">{type}</span>
                                                {def.aliases.length > 0 && (
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        ({def.aliases.join(', ')})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={currentColor}
                                                onChange={(e) => updateCalloutColor(type, e.target.value)}
                                                className="w-7 h-7 rounded-lg border border-gray-200 cursor-pointer"
                                                style={{ padding: 0 }}
                                            />
                                            {customColor && (
                                                <button
                                                    onClick={() => resetCalloutColor(type)}
                                                    className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-white transition-colors"
                                                >
                                                    ↺
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-5">
                            <SliderInput
                                label="Max Content Width"
                                value={localSettings.maxContentWidth}
                                min={500}
                                max={1400}
                                step={50}
                                unit="px"
                                onChange={(v) => update({ maxContentWidth: v })}
                            />
                            <div className="space-y-2">
                                <label className="text-sm text-gray-600 font-medium">Paragraph Alignment</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['left', 'justify'] as const).map((a) => (
                                        <button
                                            key={a}
                                            onClick={() => update({ paragraphAlign: a })}
                                            className={clsx(
                                                'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize',
                                                localSettings.paragraphAlign === a
                                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            )}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-md transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
