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

  const materialImage: Record<string, string> = {
    'mat_mobile_phone': '/assets/mat-phones.jpg',
    'mat_laptop': '/assets/mat-motherboard.jpg',
    'mat_desktop_cpu': '/assets/mat-motherboard.jpg',
    'mat_television': '/assets/mat-phones.jpg',
    'mat_crt_monitor': '/assets/mat-aluminium.jpg',
    'mat_refrigerator': '/assets/mat-aluminium.jpg',
    'mat_home_appliance': '/assets/mat-aluminium.jpg',
    'mat_cable': '/assets/mat-copper.jpg',
    'mat_battery': '/assets/mat-phones.jpg',
    'mat_printer': '/assets/mat-motherboard.jpg',
    'mat_circuit_board': '/assets/mat-motherboard.jpg',
    'mat_metal_scrap': '/assets/mat-aluminium.jpg',
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
    <div className="flex flex-col gap-4 pb-24 text-stone-100">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">
            {locale === 'hi' ? 'आज के बाजार भाव' : locale === 'mr' ? 'आजचे बाजारभाव' : "Today's Market Rates"}
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#183627] text-[#4FD68C] border border-[#2B5E43]">
            <span className="w-2 h-2 rounded-full bg-[#2FBF71] animate-pulse" />
            Hadapsar Cluster
          </span>
        </div>
        <p className="text-xs text-stone-400 font-medium mt-1">
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
          className="w-full px-4 py-3 pl-11 text-sm bg-[#12231B] text-white border border-[#1E3A2B] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2FBF71] placeholder:text-stone-500 shadow-sm"
        />
        <svg
          className="w-5 h-5 text-stone-400 absolute left-3.5 top-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-[#183627] text-[#2FBF71] border border-[#2B5E43] shadow-xs'
                  : 'bg-[#12231B] text-stone-400 hover:text-white border border-[#1E3A2B]'
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
          const imageSrc = materialImage[mat.id] || '/assets/mat-motherboard.jpg';
          const name = mat.label[locale] || mat.label.en;
          const hasHazard = mat.hazardFlags.length > 0;

          return (
            <div
              key={mat.id}
              className="p-3.5 rounded-2xl border border-[#1E3A2B] bg-[#12231B] hover:border-[#2C553F] shadow-sm flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 rounded-xl overflow-hidden bg-stone-900 border border-[#234533] shrink-0">
                  <img src={imageSrc} alt={name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white truncate">{name}</h3>
                    {hasHazard && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 font-semibold border border-amber-700 shrink-0">
                        Caution
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-400 font-medium mt-0.5">
                    {mat.hazardFlags.length > 0 ? mat.hazardFlags.join(', ') : 'Standard recovery'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="text-right">
                  <span className="text-base font-black text-[#4FD68C] font-mono">
                    Around ₹{Math.round(ratePaise / 100).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium"> /kg</span>
                </div>

                {onStartSell && (
                  <button
                    type="button"
                    onClick={() => onStartSell(mat.id)}
                    className="min-h-[34px] px-3.5 py-1 bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white rounded-xl text-xs font-black shadow-xs transition-transform active:scale-95 flex items-center gap-1"
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
        <div className="p-8 text-center bg-[#12231B] rounded-2xl border border-[#1E3A2B]">
          <p className="text-sm text-stone-400">No matching materials found for &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
};
