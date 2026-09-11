'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COUNTRIES,
  findCountryByName,
  normalizeCountryName,
  type CountryOption,
} from '@/lib/countries';

type CountryComboboxProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

function CountryFlag({ country }: { country: CountryOption }) {
  return (
    <span className="relative inline-flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-muted text-[10px] leading-none">
      <span aria-hidden="true">{country.flag}</span>
      <img
        src={country.flagUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
    </span>
  );
}

export default function CountryCombobox({
  id,
  value,
  onChange,
  placeholder = 'Buscá un país',
  className = '',
}: CountryComboboxProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedCountry = findCountryByName(value);
  const inputCountry = findCountryByName(query);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = normalizeCountryName(query);
    if (!normalizedQuery) return COUNTRIES;

    return COUNTRIES.filter((country) =>
      normalizeCountryName(country.name).includes(normalizedQuery)
    );
  }, [query]);

  function selectCountry(countryName: string) {
    setQuery(countryName);
    onChange(countryName);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {(selectedCountry || inputCountry) && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base"
          >
            {(selectedCountry || inputCountry) && (
              <CountryFlag country={selectedCountry || inputCountry!} />
            )}
          </span>
        )}
        <input
          id={id}
          className={`${className} ${
            selectedCountry || inputCountry ? 'pl-9' : ''
          }`}
          name="country"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={id ? `${id}-options` : undefined}
          placeholder={placeholder}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange('');
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setQuery(value);
              setIsOpen(false);
            }
            if (event.key === 'Enter' && filteredCountries.length === 1) {
              event.preventDefault();
              selectCountry(filteredCountries[0].name);
            }
          }}
        />
      </div>
      {isOpen && (
        <div
          id={id ? `${id}-options` : undefined}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-lg"
        >
          {filteredCountries.length > 0 ? (
            filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={selectedCountry?.code === country.code}
                className="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCountry(country.name)}
              >
                <CountryFlag country={country} />
                <span>{country.name}</span>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-muted-foreground">
              No encontramos ese país. Elegí una opción de la lista.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
