import {
  Children,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { VirtualizedSelect } from './VirtualizedSelect';
import './StyledSelect.css';

export interface StyledSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface StyledSelectProps {
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Controlled value ('' or an option value). Omit to use internal state. */
  value?: string;
  /** Initial value for uncontrolled usage. */
  defaultValue?: string;
  /** Called with the selected option value ('' when a "None" option is picked). */
  onChange?: (value: string) => void;
  /** Text shown when nothing is selected and no matching option exists. */
  placeholder?: string;
  /** Optional leading icon rendered inside the control. */
  icon?: ReactNode;
  className?: string;
  wrapperClassName?: string;
  /** `<option>` elements to render. */
  children: ReactNode;
}

/** Flatten a React node (including nested elements/arrays) into plain text. */
function nodeToText(node: ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return nodeToText(children);
  }
  return '';
}

/** Flatten `<option>` children into a plain list consumable by VirtualizedSelect. */
function parseOptions(children: ReactNode): StyledSelectOption[] {
  const out: StyledSelectOption[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child) || child.type !== 'option') continue;
    const props = child.props as {
      value?: string | number | readonly string[];
      disabled?: boolean;
      children?: ReactNode;
    };
    const label = nodeToText(props.children).trim();
    const value =
      props.value === undefined || props.value === null ? label : String(props.value);
    out.push({ value, label, disabled: Boolean(props.disabled) });
  }
  return out;
}

/**
 * A styled dropdown that reuses the exact panel/trigger visual language of
 * `VirtualizedSelect`, but without a search box or virtualization — suitable
 * for simple option lists. It keeps an `<option>`-children API so existing
 * markup can migrate with minimal churn while every select looks identical.
 */
export function StyledSelect({
  id,
  name,
  disabled,
  value,
  defaultValue,
  onChange,
  placeholder,
  icon,
  className,
  wrapperClassName,
  children,
}: StyledSelectProps) {
  const options = useMemo(() => parseOptions(children), [children]);
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue != null ? String(defaultValue) : '',
  );
  const isControlled = value !== undefined;
  const selectedValue = isControlled ? value : internalValue;

  const handleChange = useCallback(
    (v: string | null) => {
      const next = v ?? '';
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return (
    <div className={`styled-select${wrapperClassName ? ` ${wrapperClassName}` : ''}`}>
      {icon ? <span className="styled-select-icon">{icon}</span> : null}
      <VirtualizedSelect
        id={id}
        name={name}
        disabled={disabled}
        searchable={false}
        items={options}
        value={selectedValue}
        onChange={handleChange}
        getOptionValue={(o) => o.value}
        getOptionLabel={(o) => o.label}
        isOptionDisabled={(o) => Boolean(o.disabled)}
        placeholder={placeholder ?? 'Select...'}
        className={icon ? 'styled-select-has-icon' : className}
      />
    </div>
  );
}

export default StyledSelect;
