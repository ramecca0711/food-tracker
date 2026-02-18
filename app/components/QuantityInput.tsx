'use client';

interface QuantityInputProps {
  number: string;
  unit: string;
  onNumberChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  label?: string;
  className?: string;
}

export default function QuantityInput({
  number,
  unit,
  onNumberChange,
  onUnitChange,
  label = "Quantity",
  className = ""
}: QuantityInputProps) {
  const commonUnits = [
    { value: 'piece', label: 'piece(s)' },
    { value: 'serving', label: 'serving(s)' },
    { value: 'cup', label: 'cup(s)' },
    { value: 'tbsp', label: 'tbsp' },
    { value: 'tsp', label: 'tsp' },
    { value: 'oz', label: 'oz' },
    { value: 'g', label: 'g' },
    { value: 'lb', label: 'lb' },
    { value: 'ml', label: 'ml' },
    { value: 'slice', label: 'slice(s)' },
    { value: 'container', label: 'container' },
  ];

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.1"
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {commonUnits.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}