import { useEffect, useMemo, useState } from 'react';
import { StyledSelect } from './StyledSelect';
import type { AddressRequest } from '../../api/api.addresses';
import { fetchUsStates, type UsState } from '../../api/api.meta';
import './AddressFields.css';

export interface AddressFieldsProps {
  /** Prefix for every input id, so each label can point at its field. */
  idPrefix: string;
  value: AddressRequest;
  onChange: (address: AddressRequest) => void;
}

/** Street-address inputs shared by the forms that edit an entity's address. */
export function AddressFields({ idPrefix, value, onChange }: AddressFieldsProps) {
  const [states, setStates] = useState<UsState[]>([]);

  // The region list comes from the API, so a US state is always saved as its code.
  useEffect(() => {
    let cancelled = false;
    fetchUsStates()
      .then((list) => {
        if (!cancelled) setStates(list);
      })
      .catch(() => {
        // Without the list the region falls back to a free-text field.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const regionOptions = useMemo(() => {
    const options = states
      .map((state) => ({ value: state.code ?? '', label: state.name || state.code || '' }))
      .filter((option) => option.value !== '');
    const current = value.region ?? '';
    // A region saved before the list arrived still has to show as selected.
    if (current && !options.some((option) => option.value === current)) {
      options.unshift({ value: current, label: current });
    }
    return options;
  }, [states, value.region]);

  const set = (patch: Partial<AddressRequest>) => onChange({ ...value, ...patch });

  return (
    <div className="address-fields">
      <div className="address-field address-field-wide">
        <label htmlFor={`${idPrefix}-line1`}>Street Address</label>
        <input
          id={`${idPrefix}-line1`}
          type="text"
          autoComplete="address-line1"
          placeholder="123 Main St"
          value={value.line1 ?? ''}
          onChange={(e) => set({ line1: e.target.value })}
        />
      </div>

      <div className="address-field address-field-wide">
        <label htmlFor={`${idPrefix}-line2`}>Address Line 2</label>
        <input
          id={`${idPrefix}-line2`}
          type="text"
          autoComplete="address-line2"
          placeholder="Unit, suite, floor (optional)"
          value={value.line2 ?? ''}
          onChange={(e) => set({ line2: e.target.value })}
        />
      </div>

      <div className="address-field address-field-city">
        <label htmlFor={`${idPrefix}-city`}>City</label>
        <input
          id={`${idPrefix}-city`}
          type="text"
          autoComplete="address-level2"
          placeholder="Boston"
          value={value.city ?? ''}
          onChange={(e) => set({ city: e.target.value })}
        />
      </div>

      <div className="address-field address-field-region">
        <label htmlFor={`${idPrefix}-region`}>State</label>
        {regionOptions.length > 0 ? (
          <StyledSelect
            id={`${idPrefix}-region`}
            value={value.region ?? ''}
            onChange={(region) => set({ region: region || null })}
            placeholder="Select..."
          >
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </StyledSelect>
        ) : (
          <input
            id={`${idPrefix}-region`}
            type="text"
            autoComplete="address-level1"
            maxLength={2}
            placeholder="MA"
            value={value.region ?? ''}
            onChange={(e) => set({ region: e.target.value })}
          />
        )}
      </div>

      <div className="address-field address-field-postal">
        <label htmlFor={`${idPrefix}-postal-code`}>ZIP Code</label>
        <input
          id={`${idPrefix}-postal-code`}
          type="text"
          autoComplete="postal-code"
          maxLength={10}
          placeholder="02110"
          value={value.postalCode ?? ''}
          onChange={(e) => set({ postalCode: e.target.value })}
        />
      </div>
    </div>
  );
}
