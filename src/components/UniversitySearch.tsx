"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Building2, MapPin, Check } from "lucide-react";
import { University } from "@/data/universities";

interface UniversitySearchProps {
  onSelect: (uni: University) => void;
  initialValue?: string;
}

export default function UniversitySearch({ onSelect, initialValue = "" }: UniversitySearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<University[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchColleges = async () => {
      if (query.length > 2) {
        try {
          const response = await fetch(`/api/colleges/search?q=${encodeURIComponent(query)}`);
          const data = await response.json();
          setSuggestions(data);
          setIsOpen(data.length > 0);
        } catch (error) {
          console.error("Fetch error:", error);
        }
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(fetchColleges, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (uni: University) => {
    setQuery(uni.name);
    setIsOpen(false);
    onSelect(uni);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search Indian Universities (e.g. IIT Delhi)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setIsOpen(true)}
          style={{ paddingLeft: '40px' }}
        />
        <Search 
          size={18} 
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
        />
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          backgroundColor: 'var(--card-color)', border: '1px solid var(--border-color)',
          borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {suggestions.map((uni, idx) => (
            <div 
              key={idx}
              onClick={() => handleSelect(uni)}
              style={{ 
                padding: '12px 16px', cursor: 'pointer', borderBottom: idx !== suggestions.length - 1 ? '1px solid var(--border-color)' : 'none',
                transition: 'background-color 0.2s', display: 'flex', alignItems: 'center', gap: '12px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(11, 92, 255, 0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '6px', backgroundColor: 'rgba(11, 92, 255, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--zoom-blue)'
              }}>
                <Building2 size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{uni.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> {uni.location}
                </div>
              </div>
              {query === uni.name && <Check size={16} color="var(--success)" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
