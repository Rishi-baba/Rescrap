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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0C1A14] border border-[#1E3A2B] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1E3A2B] pb-3">
          <div>
            <h2 className="text-base font-bold text-white">Choose Language / भाषा चुनें</h2>
            <p className="text-xs text-stone-400">आपकी पसंदीदा भाषा का चयन करें</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-[#163324] transition-colors"
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
                className={`w-full min-h-[60px] p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'border-[#2FBF71] bg-[#163324] text-white shadow-lg shadow-emerald-950/40'
                    : 'border-[#1E3A2B] bg-[#12231B] hover:bg-[#162D22] text-stone-300'
                }`}
              >
                <div>
                  <div className="text-lg font-bold text-white">{lang.native}</div>
                  <div className="text-xs text-stone-400 font-normal">{lang.subtitle}</div>
                </div>
                {isSelected ? (
                  <div className="w-6 h-6 rounded-full bg-[#2FBF71] text-[#07130D] flex items-center justify-center font-bold">
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
