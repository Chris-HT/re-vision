import { useState, useRef, useEffect } from 'react';

export default function PinInput({ length = 4, onComplete, error, disabled }) {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Reset digits when error changes (wrong PIN)
  useEffect(() => {
    if (error) {
      setDigits(Array(length).fill(''));
      inputRefs.current[0]?.focus();
    }
  }, [error, length]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (value && index === length - 1) {
      const pin = newDigits.join('');
      if (pin.length === length) {
        onComplete(pin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const newDigits = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    if (pasted.length === length) {
      onComplete(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  return (
    <div>
      <div className="flex justify-center gap-3">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className="w-14 h-16 text-center text-2xl font-bold rounded-lg border-2 transition-colors focus:outline-none focus:border-blue-500"
            style={{
              backgroundColor: 'var(--bg-input, var(--bg-card-solid))',
              borderColor: error ? '#ef4444' : 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          />
        ))}
      </div>
      {error && (
        <p className="text-red-400 text-sm text-center mt-3">{error}</p>
      )}
    </div>
  );
}
