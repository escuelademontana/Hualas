'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export type SavedLocation = {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
};

interface SavedLocationPickerProps {
  locationName: string;
  coordinates: Coordinates | null;
  onSelect: (location: SavedLocation) => void;
}

const inputClass =
  'w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export default function SavedLocationPicker({
  locationName,
  coordinates,
  onSelect,
}: SavedLocationPickerProps) {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      setLoading(true);
      try {
        const response = await fetch('/api/saved-locations');
        if (!response.ok) return;
        const data = (await response.json()) as SavedLocation[];
        if (!cancelled) setLocations(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLocations();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLocationId = useMemo(() => {
    if (!coordinates) return '';

    const match = locations.find(
      (location) =>
        location.name === locationName &&
        Math.abs(location.latitude - coordinates.latitude) < 0.000001 &&
        Math.abs(location.longitude - coordinates.longitude) < 0.000001
    );

    return match?.id ?? '';
  }, [coordinates, locationName, locations]);

  async function saveCurrentLocation() {
    const name = locationName.trim();
    if (!name || !coordinates || saving) return;

    setSaving(true);
    setError(null);
    setSavedMessage(null);

    try {
      const response = await fetch('/api/saved-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo guardar el lugar');
      }

      const location = payload as SavedLocation;
      setLocations((current) =>
        [...current, location].sort((a, b) =>
          a.name.localeCompare(b.name, 'es')
        )
      );
      setSavedMessage('Lugar guardado');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo guardar el lugar'
      );
    } finally {
      setSaving(false);
    }
  }

  const alreadySaved = Boolean(selectedLocationId);
  const canSave = Boolean(locationName.trim() && coordinates && !alreadySaved);

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <select
            value={selectedLocationId}
            onChange={(event) => {
              const location = locations.find(
                (item) => item.id === event.target.value
              );
              if (location) {
                setSavedMessage(null);
                setError(null);
                onSelect(location);
              }
            }}
            className={`${inputClass} pl-9`}
            disabled={loading || locations.length === 0}
          >
            <option value="">
              {loading
                ? 'Cargando lugares...'
                : locations.length === 0
                  ? 'Sin lugares guardados'
                  : 'Elegir lugar guardado'}
            </option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void saveCurrentLocation()}
          disabled={!canSave || saving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {saving
            ? 'Guardando...'
            : alreadySaved
              ? 'Lugar guardado'
              : 'Guardar lugar'}
        </Button>
      </div>
      {(error || savedMessage) && (
        <p
          className={`text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {error ?? savedMessage}
        </p>
      )}
    </div>
  );
}
