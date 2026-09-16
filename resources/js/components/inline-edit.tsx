import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Edit2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface Option {
    value: string;
    label: string;
}

interface InlineEditProps {
    value: string;
    onSave: (val: string) => void;
    type?: 'text' | 'number' | 'select' | 'color';
    options?: Option[];
    className?: string;
    placeholder?: string;
    renderDisplay?: (value: string) => React.ReactNode;
}

export function InlineEdit({
    value,
    onSave,
    type = 'text',
    options = [],
    className = '',
    placeholder = 'Clique para editar...',
    renderDisplay,
}: InlineEditProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const inputRef = useRef<any>(null);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (tempValue !== value) {
            onSave(tempValue);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setTempValue(value);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && type !== 'select') {
            handleSave();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const displayValue = () => {
        if (renderDisplay) return renderDisplay(value);
        if (type === 'select') {
            const selected = options.find((o) => o.value === value);
            return selected ? selected.label : placeholder;
        }
        return value || placeholder;
    };

    return (
        <div className="group relative inline-flex items-center">
            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <motion.div
                        key="display"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsEditing(true)}
                        className={`-ml-2 flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1 transition-all hover:border-border hover:bg-muted/50 ${className}`}
                        title="Clique para editar"
                    >
                        {type === 'color' && (
                            <div
                                className="h-4 w-4 rounded-full border border-border/50"
                                style={{ backgroundColor: value }}
                            />
                        )}
                        <span
                            className={
                                !value ? 'text-muted-foreground italic' : ''
                            }
                        >
                            {displayValue()}
                        </span>
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="z-10 -ml-2 flex items-center gap-1"
                    >
                        {type === 'select' ? (
                            <select
                                ref={inputRef}
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={handleSave}
                                className="h-8 rounded-lg border-primary/50 px-2 py-1 text-sm shadow-sm focus:border-primary"
                            >
                                {options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        ) : type === 'color' ? (
                            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-1 shadow-sm">
                                <input
                                    ref={inputRef}
                                    type="color"
                                    value={tempValue}
                                    onChange={(e) =>
                                        setTempValue(e.target.value)
                                    }
                                    className="h-8 w-8 cursor-pointer rounded border-0 p-0"
                                />
                                <button
                                    onClick={handleSave}
                                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                                >
                                    <Check className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
                                <input
                                    ref={inputRef}
                                    type={type}
                                    value={tempValue}
                                    onChange={(e) =>
                                        setTempValue(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    className={`h-8 min-w-[150px] border-none bg-transparent px-2 py-1 text-sm focus:ring-0 ${className}`}
                                    placeholder={placeholder}
                                />
                                <div className="flex items-center border-l pl-1">
                                    <button
                                        onClick={handleSave}
                                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
