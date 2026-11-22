import React, { useRef, useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputDDMMYYYYProps {
  value: string; // Accepts 'YYYY-MM-DD', 'DD/MM/YYYY', or ISO string
  onChange: (value: string) => void; // Emits 'YYYY-MM-DD' or 'DD/MM/YYYY'
  required?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  name?: string;
}

// Convert YYYY-MM-DD to DD/MM/YYYY
export const convertToDDMMYYYY = (val?: string | null): string => {
  if (!val) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;
  const clean = val.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return val;
};

// Convert DD/MM/YYYY to YYYY-MM-DD
export const convertToYYYYMMDD = (val?: string | null): string => {
  if (!val) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const parts = val.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return val;
};

export const DateInputDDMMYYYY: React.FC<DateInputDDMMYYYYProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  placeholder = 'JJ/MM/AAAA',
  id,
  name,
}) => {
  // Display string in DD/MM/YYYY format
  const [displayValue, setDisplayValue] = useState<string>(() => convertToDDMMYYYY(value));
  const hiddenDateInputRef = useRef<HTMLInputElement>(null);

  // Sync display value when parent value changes
  useEffect(() => {
    setDisplayValue(convertToDDMMYYYY(value));
  }, [value]);

  // Handle manual typing in DD/MM/YYYY format
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ''); // strip non-digits
    if (input.length > 8) input = input.slice(0, 8);

    let formatted = '';
    if (input.length > 0) {
      formatted += input.slice(0, 2);
      if (input.length >= 3) {
        formatted += '/' + input.slice(2, 4);
      }
      if (input.length >= 5) {
        formatted += '/' + input.slice(4, 8);
      }
    }

    setDisplayValue(formatted);

    if (formatted.length === 10) {
      const yyyymmdd = convertToYYYYMMDD(formatted);
      onChange(yyyymmdd);
    } else if (formatted.length === 0) {
      onChange('');
    }
  };

  // Open calendar picker
  const handleCalendarClick = () => {
    if (hiddenDateInputRef.current) {
      if ('showPicker' in hiddenDateInputRef.current) {
        try {
          hiddenDateInputRef.current.showPicker();
        } catch {
          hiddenDateInputRef.current.focus();
        }
      } else {
        hiddenDateInputRef.current.focus();
      }
    }
  };

  // When date is chosen from native calendar picker (in YYYY-MM-DD format)
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedVal = e.target.value; // YYYY-MM-DD
    if (pickedVal) {
      const ddmmyyyy = convertToDDMMYYYY(pickedVal);
      setDisplayValue(ddmmyyyy);
      onChange(pickedVal);
    }
  };

  const isoValue = convertToYYYYMMDD(displayValue);

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        id={id}
        name={name}
        required={required}
        value={displayValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        maxLength={10}
        className={`w-full pr-9 px-3 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white font-mono ${className}`}
      />
      <button
        type="button"
        onClick={handleCalendarClick}
        className="absolute right-2 text-slate-400 hover:text-sky-600 p-1 transition-colors"
        title="Ouvrir le calendrier"
      >
        <Calendar size={15} />
      </button>

      {/* Hidden native date input to allow visual date selection */}
      <input
        ref={hiddenDateInputRef}
        type="date"
        value={isoValue}
        onChange={handleNativePickerChange}
        className="sr-only absolute opacity-0 pointer-events-none w-0 h-0"
        tabIndex={-1}
      />
    </div>
  );
};
