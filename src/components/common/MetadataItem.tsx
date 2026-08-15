import type { ReactNode } from 'react';
import './MetadataItem.css';

export interface MetadataItemProps {
  label: string;
  value: ReactNode;
}

export function MetadataItem({ label, value }: MetadataItemProps) {
  return (
    <div className="metadata-item">
      <span className="metadata-label">{label}</span>
      <span className="metadata-value">{value}</span>
    </div>
  );
}

export default MetadataItem;
