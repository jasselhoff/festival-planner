interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  extended?: boolean;
  required?: boolean;
  className?: string;
}

export function TimeInput({
  value,
  onChange,
  extended = false,
  required = false,
  className = '',
}: TimeInputProps) {
  // For extended mode, use text input to allow hours > 23
  // For normal mode, use native time input
  if (extended) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="HH:MM"
        pattern="^([0-2][0-9]):([0-5][0-9])$"
        title="Time in HH:MM format (00:00 - 29:59)"
        required={required}
        className={`input ${className}`}
      />
    );
  }

  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`input ${className}`}
    />
  );
}
