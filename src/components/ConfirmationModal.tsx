'use client';

import { TrashIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLoading?: boolean;
}

export default function ConfirmationModal({
  open,
  title,
  description,
  confirmText = 'Evet',
  cancelText = 'Vazgeç',
  onConfirm,
  onCancel,
  confirmLoading = false,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Arkaplan */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[5px]" onClick={onCancel} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full sm:w-[32rem] mx-0 sm:mx-4 rounded-2xl shadow-2xl border bg-[var(--bg-card)] text-[var(--text-primary)]"
        style={{ borderColor: 'var(--border-gary)' }}
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-10 w-10 shrink-0 rounded-full grid place-items-center"
              style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)' }}
            >
              <TrashIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 id="modal-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center px-4 h-10 rounded-xl border transition"
              style={{
                borderColor: 'var(--border-light)',
                backgroundColor: 'var(--btn-secondary-bg)',
                color: 'var(--btn-secondary-text)',
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmLoading}
              className="inline-flex items-center justify-center px-4 h-10 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}
            >
              {confirmLoading ? 'Siliniyor…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

