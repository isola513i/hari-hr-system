import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, ChevronDown, Search, X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// @ts-expect-error — no type declarations for thai-address-database
import { searchAddressByProvince } from 'thai-address-database';
import { EmployeeAddress } from '../types';

interface AddressRecord {
    district: string;   // tambon (sub-district)
    amphoe: string;     // amphoe (district)
    province: string;
    zipcode: string;
}

interface ThaiAddressFormProps {
    value: EmployeeAddress | null | undefined;
    onChange: (address: EmployeeAddress) => void;
}

type TabKey = 'province' | 'district' | 'subDistrict' | 'postalCode';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'province', label: 'Province' },
    { key: 'district', label: 'District' },
    { key: 'subDistrict', label: 'Sub-district' },
    { key: 'postalCode', label: 'Postal Code' },
];

// Module-level cache — loaded once across all instances
let allRecordsCache: AddressRecord[] | null = null;
function getAllRecords(): AddressRecord[] {
    if (!allRecordsCache) {
        allRecordsCache = searchAddressByProvince('.', 100000) as AddressRecord[];
    }
    return allRecordsCache;
}

export const ThaiAddressForm: React.FC<ThaiAddressFormProps> = ({ value, onChange }) => {
    const { t } = useTranslation('common');
    const addr = value || {};
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('province');
    const [search, setSearch] = useState('');
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 300, openAbove: false });
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const allRecords = useMemo(() => getAllRecords(), []);

    // Derived lists based on current selections
    const provinces = useMemo(
        () => [...new Set(allRecords.map(r => r.province))].sort(),
        [allRecords]
    );

    const districts = useMemo(() => {
        if (!addr.province) return [];
        return [...new Set(
            allRecords.filter(r => r.province === addr.province).map(r => r.amphoe)
        )].sort();
    }, [allRecords, addr.province]);

    const subDistricts = useMemo(() => {
        if (!addr.province || !addr.district) return [];
        return [...new Set(
            allRecords
                .filter(r => r.province === addr.province && r.amphoe === addr.district)
                .map(r => r.district)
        )].sort();
    }, [allRecords, addr.province, addr.district]);

    const postalCodes = useMemo(() => {
        if (!addr.province || !addr.district || !addr.subDistrict) return [];
        return [...new Set(
            allRecords
                .filter(r =>
                    r.province === addr.province &&
                    r.amphoe === addr.district &&
                    r.district === addr.subDistrict
                )
                .map(r => r.zipcode)
        )].sort();
    }, [allRecords, addr.province, addr.district, addr.subDistrict]);

    // Items for the active tab, filtered by search
    const currentItems = useMemo(() => {
        let items: string[];
        switch (activeTab) {
            case 'province': items = provinces; break;
            case 'district': items = districts; break;
            case 'subDistrict': items = subDistricts; break;
            case 'postalCode': items = postalCodes; break;
        }
        if (search) {
            const q = search.toLowerCase();
            return items.filter(item => item.toLowerCase().includes(q));
        }
        return items;
    }, [activeTab, provinces, districts, subDistricts, postalCodes, search]);

    const getSelectedForTab = (tab: TabKey): string | undefined => {
        switch (tab) {
            case 'province': return addr.province;
            case 'district': return addr.district;
            case 'subDistrict': return addr.subDistrict;
            case 'postalCode': return addr.postalCode;
        }
    };

    // A tab is enabled only if its prerequisite is already selected
    const isTabEnabled = (tab: TabKey): boolean => {
        switch (tab) {
            case 'province': return true;
            case 'district': return !!addr.province;
            case 'subDistrict': return !!addr.province && !!addr.district;
            case 'postalCode': return !!addr.province && !!addr.district && !!addr.subDistrict;
        }
    };

    const handleSelect = useCallback((item: string) => {
        setSearch('');
        switch (activeTab) {
            case 'province':
                onChange({ ...addr, province: item, district: undefined, subDistrict: undefined, postalCode: undefined });
                setActiveTab('district');
                break;
            case 'district':
                onChange({ ...addr, district: item, subDistrict: undefined, postalCode: undefined });
                setActiveTab('subDistrict');
                break;
            case 'subDistrict': {
                const codes = [...new Set(
                    allRecords
                        .filter(r => r.province === addr.province && r.amphoe === addr.district && r.district === item)
                        .map(r => r.zipcode)
                )];
                if (codes.length === 1) {
                    onChange({ ...addr, subDistrict: item, postalCode: codes[0] });
                    setIsOpen(false);
                } else {
                    onChange({ ...addr, subDistrict: item, postalCode: undefined });
                    setActiveTab('postalCode');
                }
                break;
            }
            case 'postalCode':
                onChange({ ...addr, postalCode: item });
                setIsOpen(false);
                break;
        }
    }, [activeTab, addr, onChange, allRecords]);

    // Calculate dropdown position from trigger's bounding rect
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 16;
        const spaceAbove = rect.top - 16;
        const minH = 200;
        // Open above if not enough room below but enough above
        const openAbove = spaceBelow < minH && spaceAbove > spaceBelow;
        const maxH = Math.max(openAbove ? spaceAbove : spaceBelow, minH);
        const top = openAbove ? rect.top - 4 : rect.bottom + 4;
        setPos({ top, left: rect.left, width: rect.width, maxH, openAbove });
    }, []);

    const handleToggle = () => {
        if (!isOpen) {
            if (!addr.province) setActiveTab('province');
            else if (!addr.district) setActiveTab('district');
            else if (!addr.subDistrict) setActiveTab('subDistrict');
            else if (!addr.postalCode) setActiveTab('postalCode');
            else setActiveTab('province');
            setSearch('');
            // Scroll trigger to top of modal scroll area first, then open
            triggerRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
            requestAnimationFrame(() => {
                updatePosition();
                setIsOpen(true);
            });
            return;
        }
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange({ ...addr, province: undefined, district: undefined, subDistrict: undefined, postalCode: undefined });
        setActiveTab('province');
    };

    // Close on outside click — check both trigger and portal dropdown
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                containerRef.current && !containerRef.current.contains(target) &&
                (!dropdownRef.current || !dropdownRef.current.contains(target))
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Reposition on scroll/resize while open; close if trigger leaves visible area
    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        const scrollParent = triggerRef.current?.closest('.overflow-y-auto') as HTMLElement | null;
        const onReposition = () => {
            if (triggerRef.current && scrollParent) {
                const triggerRect = triggerRef.current.getBoundingClientRect();
                const parentRect = scrollParent.getBoundingClientRect();
                // Close if trigger is scrolled out of the visible scroll container
                if (triggerRect.bottom < parentRect.top || triggerRect.top > parentRect.bottom) {
                    setIsOpen(false);
                    return;
                }
            }
            updatePosition();
        };

        scrollParent?.addEventListener('scroll', onReposition);
        window.addEventListener('resize', onReposition);
        return () => {
            scrollParent?.removeEventListener('scroll', onReposition);
            window.removeEventListener('resize', onReposition);
        };
    }, [isOpen, updatePosition]);

    // Auto-focus search when panel opens or tab changes
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchRef.current?.focus(), 0);
        }
    }, [isOpen, activeTab]);

    // Display text
    const displayText = useMemo(() => {
        const parts = [addr.province, addr.district, addr.subDistrict, addr.postalCode].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : '';
    }, [addr.province, addr.district, addr.subDistrict, addr.postalCode]);

    // Empty-state message for the list
    const emptyMessage = useMemo(() => {
        if (search) return 'No results found';
        const tabIdx = TABS.findIndex(t => t.key === activeTab);
        const prevTab = tabIdx > 0 ? TABS[tabIdx - 1] : undefined;
        if (prevTab && !getSelectedForTab(prevTab.key)) {
            return `Please select ${prevTab.label} first`;
        }
        return 'No results found';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, search, addr.province, addr.district, addr.subDistrict]);

    const labelClass = 'block text-sm font-medium text-text-light dark:text-text-dark mb-1';

    return (
        <div className="md:col-span-2 space-y-4">
            <label className={labelClass}>{t('thaiAddress.currentAddress')}</label>

            {/* Unified address picker */}
            <div ref={containerRef}>
                <label className={labelClass}>{t('thaiAddress.provinceDistrictSubdistrict')}</label>

                {/* Trigger button */}
                <div
                    ref={triggerRef}
                    className={`w-full flex items-center pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border rounded-lg cursor-pointer transition-colors relative ${
                        isOpen
                            ? 'border-primary ring-2 ring-primary'
                            : 'border-border-light dark:border-border-dark hover:border-primary/50'
                    }`}
                    onClick={handleToggle}
                >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                    {displayText ? (
                        <span className="flex-1 text-text-light dark:text-text-dark truncate">
                            {displayText}
                        </span>
                    ) : (
                        <span className="flex-1 text-text-muted-light dark:text-text-muted-dark">
                            {t('thaiAddress.selectPlaceholder')}
                        </span>
                    )}
                    {displayText && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="ml-2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown
                        className={`ml-2 text-text-muted-light shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        size={16}
                    />
                </div>

                {/* Dropdown panel — rendered via portal to escape modal overflow */}
                {isOpen && createPortal(
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'fixed',
                            ...(pos.openAbove
                                ? { bottom: window.innerHeight - pos.top, left: pos.left }
                                : { top: pos.top, left: pos.left }),
                            width: pos.width,
                            maxHeight: pos.maxH,
                            zIndex: 10000,
                        }}
                        className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg shadow-lg overflow-hidden flex flex-col"
                    >
                        {/* Search input */}
                        <div className="p-2 border-b border-border-light dark:border-border-dark shrink-0">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted-light" size={14} />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.stopPropagation();
                                            const first = currentItems[0];
                                            if (first) handleSelect(first);
                                        }
                                        if (e.key === 'Escape') {
                                            setIsOpen(false);
                                        }
                                    }}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-text-light dark:text-text-dark"
                                    placeholder={t('placeholders.search')}
                                />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-border-light dark:border-border-dark bg-background-light/50 dark:bg-background-dark/50 shrink-0">
                            {TABS.map((tab) => {
                                const isActive = activeTab === tab.key;
                                const hasValue = !!getSelectedForTab(tab.key);
                                const enabled = isTabEnabled(tab.key);
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        disabled={!enabled}
                                        onClick={() => { setActiveTab(tab.key); setSearch(''); }}
                                        className={`flex-1 px-1 py-2.5 text-xs font-medium transition-colors relative ${
                                            !enabled
                                                ? 'text-text-muted-light/40 dark:text-text-muted-dark/40 cursor-not-allowed'
                                                : isActive
                                                    ? 'text-primary'
                                                    : hasValue
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark'
                                        }`}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            {hasValue && !isActive && <Check size={10} />}
                                            {tab.label}
                                        </span>
                                        {isActive && (
                                            <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected breadcrumb */}
                        {(addr.province || addr.district || addr.subDistrict) && (
                            <div className="px-3 py-1.5 border-b border-border-light dark:border-border-dark bg-primary/5 dark:bg-primary/10 shrink-0">
                                <p className="text-xs text-text-muted-light dark:text-text-muted-dark truncate">
                                    {[addr.province, addr.district, addr.subDistrict, addr.postalCode]
                                        .filter(Boolean)
                                        .join(' › ')}
                                </p>
                            </div>
                        )}

                        {/* Items list */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            {currentItems.length === 0 ? (
                                <div className="px-4 py-8 text-center text-sm text-text-muted-light dark:text-text-muted-dark">
                                    {emptyMessage}
                                </div>
                            ) : (
                                currentItems.map((item) => {
                                    const isSelected = getSelectedForTab(activeTab) === item;
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => handleSelect(item)}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark'
                                            }`}
                                        >
                                            <span>{item}</span>
                                            {isSelected && <Check size={14} className="shrink-0" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            {/* Address detail textarea */}
            <div>
                <label className={labelClass}>{t('thaiAddress.addressLabel')}</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-text-muted-light" size={16} />
                    <textarea
                        rows={2}
                        value={addr.addressLine1 || ''}
                        onChange={(e) => onChange({ ...addr, addressLine1: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                        placeholder={t('placeholders.addressLine')}
                    />
                </div>
            </div>
        </div>
    );
};
