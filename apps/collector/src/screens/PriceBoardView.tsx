import React, { useState } from 'react';
import { demoSeed } from '@rescrap/shared';
import { DemoBanner } from '@rescrap/design-system';
import { useI18n } from '../lib/i18n.js';

interface PriceBoardViewProps {
  onStartSell?: (materialId: string) => void;
}

export const PriceBoardView: React.FC<PriceBoardViewProps> = ({ onStartSell }) => {
  const { locale } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'ALL', label: locale === 'hi' ? 'सभी' : locale === 'mr' ? 'सर्व' : 'All' },
    { id: 'cat_electronics', label: locale === 'hi' ? 'इलेक्ट्रॉनिक्स' : locale === 'mr' ? 'इलेक्ट्रॉनिक्स' : 'Electronics' },
    { id: 'cat_appliances', label: locale === 'hi' ? 'घरेलू उपकरण' : locale === 'mr' ? 'घरगुती उपकरणे' : 'Appliances' },
    { id: 'cat_accessories', label: locale === 'hi' ? 'केबल व बैटरी' : locale === 'mr' ? 'केबल व बॅटरी' : 'Cables & Batt' },
    { id: 'cat_metals', label: locale === 'hi' ? 'धातु' : locale === 'mr' ? 'धातू' : 'Metals' },
  ];

  // Map price records to materials
  const priceMap = new Map<string, number>();
  demoSeed.demoPriceRecords.forEach((pr) => {
    priceMap.set(pr.materialId, pr.buyingPricePerKg as number);
  });

  const materialEmoji: Record<string, string> = {
    'mat_mobile_phone': '📱',
    'mat_laptop': '💻',
    'mat_desktop_cpu': '🖥️',
    'mat_television': '📺',
    'mat_crt_monitor': '📼',
    'mat_refrigerator': '❄️',
    'mat_home_appliance': '🔌',
    'mat_cable': '⚡',
    'mat_battery': '🔋',
    'mat_printer': '🖨️',
    'mat_circuit_board': '🟩',
    'mat_metal_scrap': '🔩',
  };

  const filteredMaterials = demoSeed.demoMaterials.filter((m) => {
    if (selectedCategory !== 'ALL' && m.categoryId !== selectedCategory) return false;
    const name = m.label[locale] || m.label.en;
    if (searchQuery.trim()) {
      return name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-stone-900">
            {locale === 'hi' ? 'आज के बाजार भाव' : locale === 'mr' ? 'आजचे बाजारभाव' : "Today's Market Rates"}
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            Pune - Hadapsar
          </span>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          {locale === 'hi'
            ? 'अधिकृत रीसायकलर्स द्वारा निर्धारित संदर्भ दर (प्रति किलोग्राम)'
            : locale === 'mr'
            ? 'अधिकृत रिसायकलर्सद्वारे निर्धारित संदर्भ दर (प्रति किलो)'
            : 'Reference rates paid by authorized formal recyclers per kg'}
        </p>
      </div>

      <DemoBanner />

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={locale === 'hi' ? 'स्क्रैप खोजें (जैसे लैपटॉप, मोबाइल...)' : 'Search scrap material...'}
          className="w-full px-3.5 py-2.5 pl-10 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
        />
        <svg
          className="w-5 h-5 text-stone-400 absolute left-3 top-2.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Rate Cards Grid */}
      <div className="flex flex-col gap-2.5">
        {filteredMaterials.map((mat) => {
          const ratePaise = priceMap.get(mat.id) ?? 5000;
          const emoji = materialEmoji[mat.id] || '📦';
          const name = mat.label[locale] || mat.label.en;
          const hasHazard = mat.hazardFlags.length > 0;

          return (
            <div
              key={mat.id}
              className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-xs flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-2xl shrink-0">
                  {emoji}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-stone-900 truncate">{name}</h3>
                    {hasHazard && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                        ⚠️ Caution
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 font-medium">
                    {mat.hazardFlags.length > 0 ? mat.hazardFlags.join(', ') : 'Standard handling'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-800 font-mono">
                    Around ₹{Math.round(ratePaise / 100).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium"> /kg</span>
                </div>

                {onStartSell && (
                  <button
                    type="button"
                    onClick={() => onStartSell(mat.id)}
                    className="min-h-[36px] px-3 py-1 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                  >
                    <span>{locale === 'hi' ? 'बेचें' : locale === 'mr' ? 'विका' : 'Sell'}</span>
                    <span>&rarr;</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200">
          <p className="text-sm text-stone-500">No matching materials found for &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
};
