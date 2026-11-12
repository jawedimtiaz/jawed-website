import { useState, useEffect, useCallback } from 'react';

export type UnitSystem = 'metric' | 'imperial';

export const UNIT_SYSTEM_STORAGE_KEY = 'app_unit_system_v1';

export interface ConvertedValue {
  primaryValue: number;
  primaryUnit: string;
  secondaryValue: number;
  secondaryUnit: string;
  formattedPrimary: string;
  formattedSecondary: string;
  formattedCombined: string;
}

export function useUnitSystem(defaultSystem: UnitSystem = 'metric') {
  // Keep server rendering and the browser's first render on the same default.
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(defaultSystem);
  const [hasRestoredUnitSystem, setHasRestoredUnitSystem] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(UNIT_SYSTEM_STORAGE_KEY);
      if (saved === 'metric' || saved === 'imperial') {
        setUnitSystemState(saved);
      }
    } catch {
      // Storage may be unavailable; retain the supplied default.
    } finally {
      setHasRestoredUnitSystem(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredUnitSystem) return;
    try {
      window.localStorage.setItem(UNIT_SYSTEM_STORAGE_KEY, unitSystem);
      window.dispatchEvent(new CustomEvent('unit-system-changed', { detail: unitSystem }));
    } catch {
      // Storage may be unavailable; the in-memory preference still works.
    }
  }, [unitSystem, hasRestoredUnitSystem]);

  useEffect(() => {
    const handleStorage = (e: CustomEvent<UnitSystem> | StorageEvent) => {
      if ('detail' in e && (e.detail === 'metric' || e.detail === 'imperial')) {
        setUnitSystemState(e.detail);
      } else if ('key' in e && e.key === UNIT_SYSTEM_STORAGE_KEY && (e.newValue === 'metric' || e.newValue === 'imperial')) {
        setUnitSystemState(e.newValue);
      }
    };

    window.addEventListener('unit-system-changed', handleStorage as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('unit-system-changed', handleStorage as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setUnitSystem = useCallback((system: UnitSystem) => {
    setUnitSystemState(system);
  }, []);

  const toggleUnitSystem = useCallback(() => {
    setUnitSystemState(prev => (prev === 'metric' ? 'imperial' : 'metric'));
  }, []);

  // --- CONVERSION HELPERS ---

  /**
   * Distance conversion (meters <-> feet)
   */
  const convertDistanceMeters = useCallback((meters: number): ConvertedValue => {
    const feet = meters * 3.28084;
    const isMetric = unitSystem === 'metric';

    const pVal = isMetric ? meters : feet;
    const pUnit = isMetric ? 'm' : 'ft';
    const sVal = isMetric ? feet : meters;
    const sUnit = isMetric ? 'ft' : 'm';

    const fPrimary = `${pVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${pUnit}`;
    const fSecondary = `${sVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${sUnit}`;

    return {
      primaryValue: pVal,
      primaryUnit: pUnit,
      secondaryValue: sVal,
      secondaryUnit: sUnit,
      formattedPrimary: fPrimary,
      formattedSecondary: fSecondary,
      formattedCombined: `${fPrimary} (${fSecondary})`,
    };
  }, [unitSystem]);

  /**
   * Short distance conversion (millimeters <-> inches)
   */
  const convertMmToInches = useCallback((mm: number): ConvertedValue => {
    const inches = mm / 25.4;
    const isMetric = unitSystem === 'metric';

    const pVal = isMetric ? mm : inches;
    const pUnit = isMetric ? 'mm' : 'in';
    const sVal = isMetric ? inches : mm;
    const sUnit = isMetric ? 'in' : 'mm';

    const fPrimary = `${pVal.toLocaleString(undefined, { maximumFractionDigits: isMetric ? 0 : 2 })} ${pUnit}`;
    const fSecondary = `${sVal.toLocaleString(undefined, { maximumFractionDigits: isMetric ? 2 : 0 })} ${sUnit}`;

    return {
      primaryValue: pVal,
      primaryUnit: pUnit,
      secondaryValue: sVal,
      secondaryUnit: sUnit,
      formattedPrimary: fPrimary,
      formattedSecondary: fSecondary,
      formattedCombined: `${fPrimary} (${fSecondary})`,
    };
  }, [unitSystem]);

  /**
   * Temperature conversion (Celsius <-> Fahrenheit)
   */
  const convertTempCelsius = useCallback((celsius: number): ConvertedValue => {
    const fahrenheit = (celsius * 9) / 5 + 32;
    const isMetric = unitSystem === 'metric';

    const pVal = isMetric ? celsius : fahrenheit;
    const pUnit = isMetric ? '°C' : '°F';
    const sVal = isMetric ? fahrenheit : celsius;
    const sUnit = isMetric ? '°F' : '°C';

    const fPrimary = `${Math.round(pVal)}${pUnit}`;
    const fSecondary = `${Math.round(sVal)}${sUnit}`;

    return {
      primaryValue: pVal,
      primaryUnit: pUnit,
      secondaryValue: sVal,
      secondaryUnit: sUnit,
      formattedPrimary: fPrimary,
      formattedSecondary: fSecondary,
      formattedCombined: `${fPrimary} (${fSecondary})`,
    };
  }, [unitSystem]);

  /**
   * Thermal cooling output (Watts / kW <-> BTU/hr / Tons)
   */
  const convertThermalWatts = useCallback((watts: number): ConvertedValue => {
    const btuPerHour = watts * 3.41214;
    const tons = btuPerHour / 12000;
    const kW = watts / 1000;
    const isMetric = unitSystem === 'metric';

    const pVal = isMetric ? kW : btuPerHour;
    const pUnit = isMetric ? 'kW' : 'BTU/hr';
    const sVal = isMetric ? btuPerHour : kW;
    const sUnit = isMetric ? 'BTU/hr' : 'kW';

    const fPrimary = isMetric
      ? `${pVal.toFixed(2)} kW (${Math.round(btuPerHour).toLocaleString()} BTU/hr)`
      : `${Math.round(pVal).toLocaleString()} BTU/hr (${tons.toFixed(2)} Tons)`;
    const fSecondary = isMetric
      ? `${tons.toFixed(2)} Tons`
      : `${kW.toFixed(2)} kW`;

    return {
      primaryValue: pVal,
      primaryUnit: pUnit,
      secondaryValue: sVal,
      secondaryUnit: sUnit,
      formattedPrimary: fPrimary,
      formattedSecondary: fSecondary,
      formattedCombined: `${fPrimary} • ${fSecondary}`,
    };
  }, [unitSystem]);

  /**
   * Airflow conversion (CFM <-> m³/h)
   */
  const convertAirflowCfm = useCallback((cfm: number): ConvertedValue => {
    const m3h = cfm * 1.69901;
    const isMetric = unitSystem === 'metric';

    const pVal = isMetric ? m3h : cfm;
    const pUnit = isMetric ? 'm³/h' : 'CFM';
    const sVal = isMetric ? cfm : m3h;
    const sUnit = isMetric ? 'CFM' : 'm³/h';

    const fPrimary = `${Math.round(pVal).toLocaleString()} ${pUnit}`;
    const fSecondary = `${Math.round(sVal).toLocaleString()} ${sUnit}`;

    return {
      primaryValue: pVal,
      primaryUnit: pUnit,
      secondaryValue: sVal,
      secondaryUnit: sUnit,
      formattedPrimary: fPrimary,
      formattedSecondary: fSecondary,
      formattedCombined: `${fPrimary} (${fSecondary})`,
    };
  }, [unitSystem]);

  /**
   * Weight / Mass conversion (Kilograms <-> Pounds)
   */
  const convertWeightKg = useCallback((kg: number): ConvertedValue => {
    const lbs = kg * 2.20462;
    const isMetric = unitSystem === 'metric';

    const pVal = isMetric ? kg : lbs;
    const pUnit = isMetric ? 'kg' : 'lbs';
    const sVal = isMetric ? lbs : kg;
    const sUnit = isMetric ? 'lbs' : 'kg';

    const fPrimary = `${pVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${pUnit}`;
    const fSecondary = `${sVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${sUnit}`;

    return {
      primaryValue: pVal,
      primaryUnit: pUnit,
      secondaryValue: sVal,
      secondaryUnit: sUnit,
      formattedPrimary: fPrimary,
      formattedSecondary: fSecondary,
      formattedCombined: `${fPrimary} (${fSecondary})`,
    };
  }, [unitSystem]);

  return {
    unitSystem,
    isMetric: unitSystem === 'metric',
    isImperial: unitSystem === 'imperial',
    setUnitSystem,
    toggleUnitSystem,
    convertDistanceMeters,
    convertMmToInches,
    convertTempCelsius,
    convertThermalWatts,
    convertAirflowCfm,
    convertWeightKg,
  };
}
