import React from 'react';
import { useI18n, type SupportedLocale } from '../lib/i18n.js';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  const { locale, setLocale } = useI18n();

  if (!isOpen) return null;

  const languages: { code: SupportedLocale; name: string; native: string; subtitle: string }[] = [
    { code: 'hi', name: 'Hindi', native: 'हिंदी', subtitle: 'कचरा संग्रह और कीमतें' },
    { code: 'mr', name: 'Marathi', native: 'मराठी', subtitle: 'कचरा संकलन आणि दर' },
    { code: 'en', name: 'English', native: 'English', subtitle: 'Scrap collection and pricing' },
  ];

  const handleSelect = (code: SupportedLocale) => {
    setLocale(code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-stone-900">Choose Language / भाषा चुनें</h2>
            <p className="text-xs text-stone-500">आपकी पसंदीदा भाषा का चयन करें</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {languages.map((lang) => {
            const isSelected = locale === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full min-h-[60px] p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                    : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800'
                }`}
              >
                <div>
                  <div className="text-lg font-bold">{lang.native}</div>
                  <div className="text-xs text-stone-500 font-normal">{lang.subtitle}</div>
                </div>
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
