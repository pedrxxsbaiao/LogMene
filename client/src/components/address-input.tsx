import React from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function AddressInput({ 
  label, 
  value, 
  onChange, 
  placeholder = 'Digite o endereço...',
  required = false 
}: AddressInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="address">{label}</Label>
      <Input
        id="address"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}