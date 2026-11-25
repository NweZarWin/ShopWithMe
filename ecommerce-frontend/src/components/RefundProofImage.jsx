import { useEffect, useState } from 'react';
import api from '../utils/api';
import './RefundProofImage.css';

export function RefundProofImage({ src, alt = 'KPay transfer screenshot' }) {
  const [dataUrl, setDataUrl] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    setDataUrl('');
    setLoadError('');

    api.get(src)
      .then(({ data }) => {
        if (typeof data.dataUrl !== 'string') {
          throw new Error('The transfer screenshot could not be loaded.');
        }
        if (active) setDataUrl(data.dataUrl);
      })
      .catch((error) => {
        console.error('Failed to load refund screenshot:', error);
        if (active) {
          setLoadError(error.response?.data?.error || 'Could not load the transfer screenshot.');
        }
      });

    return () => {
      active = false;
    };
  }, [src]);

  if (loadError) {
    return <p className="refund-proof-error" role="alert">{loadError}</p>;
  }
  if (!dataUrl) {
    return <p className="refund-proof-loading">Loading transfer screenshot...</p>;
  }

  return (
    <a
      className="refund-proof-image-link"
      href={dataUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${alt}`}
    >
      <img className="refund-proof-image" src={dataUrl} alt={alt} />
    </a>
  );
}
